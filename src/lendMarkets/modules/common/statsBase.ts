import memoize from "memoizee";
import {TAmount, IMarketDataAPI} from "../../../interfaces";
import type { LendMarketTemplate } from "../../LendMarketTemplate";
import {
    parseUnits,
    toBN,
    formatUnits,
    formatNumber,
} from "../../../utils";
import {Llamalend} from "../../../llamalend";
import {_getMarketsData} from "../../../external-api";
import {cacheKey, cacheStats} from "../../../cache";
import { computeRatesFromRate, fetchMarketDataByVault } from "../../utils";
const PRECISION = BigInt("1000000000000000000"); // 1e18

export class StatsBaseModule {
    protected market: LendMarketTemplate;
    protected llamalend: Llamalend;

    constructor(market: LendMarketTemplate) {
        this.market = market;
        this.llamalend = market.getLlamalend();
    }

    protected async _fetchMarketDataFromAPI(): Promise<IMarketDataAPI> {
        return fetchMarketDataByVault(
            this.llamalend.constants.NETWORK_NAME,
            this.market.addresses.vault,
            _getMarketsData
        );
    }

    protected _fetchAdminPercentage = async (): Promise<bigint> => {
        return BigInt(0)
    }

    protected _fetchAdminFee = async (): Promise<bigint> => {
        return this.llamalend.contracts[this.market.addresses.amm].contract.admin_fee(this.llamalend.constantOptions);
    }

    protected async _getAdminFeesXY(isGetter: boolean): Promise<[bigint, bigint]> {
        if(isGetter) {
            return [
                cacheStats.get(cacheKey(this.market.addresses.amm, 'admin_fees_x')),
                cacheStats.get(cacheKey(this.market.addresses.amm, 'admin_fees_y')),
            ];
        }
        const ammContract = this.llamalend.contracts[this.market.addresses.amm].multicallContract;
        const [_fee_x, _fee_y] = await this.llamalend.multicallProvider.all([
            ammContract.admin_fees_x(),
            ammContract.admin_fees_y(),
        ]) as [bigint, bigint];
        cacheStats.set(cacheKey(this.market.addresses.amm, 'admin_fees_x'), _fee_x);
        cacheStats.set(cacheKey(this.market.addresses.amm, 'admin_fees_y'), _fee_y);
        return [_fee_x, _fee_y];
    }

    private _getRate = async (isGetter = true): Promise<bigint> => {
        if (isGetter) {
            const _rate: bigint = cacheStats.get(cacheKey(this.market.addresses.amm, 'rate'));
            const _adminPercentage = await this._fetchAdminPercentage();
            return _rate * (PRECISION - _adminPercentage) / PRECISION;
        } else {
            const [_rate, _adminPercentage] = await Promise.all([
                this.llamalend.contracts[this.market.addresses.amm].contract.rate(this.llamalend.constantOptions),
                this._fetchAdminPercentage(),
            ]);
            cacheStats.set(cacheKey(this.market.addresses.controller, 'rate'), _rate);
            return _rate * (PRECISION - _adminPercentage) / PRECISION;
        }
    }

    private _getFutureRate = async (_dReserves: bigint, _dDebt: bigint): Promise<bigint> => {
        const mpContract = this.llamalend.contracts[this.market.addresses.monetary_policy].contract;
        const [_rate, _adminPercentage] = await Promise.all([
            mpContract.future_rate(this.market.addresses.controller, _dReserves, _dDebt),
            this._fetchAdminPercentage(),
        ]);
        return _rate * (PRECISION - _adminPercentage) / PRECISION;
    }

    public statsParameters = memoize(async (): Promise<{
        fee: string, // %
        admin_fee: string, // %
        liquidation_discount: string, // %
        loan_discount: string, // %
        base_price: string,
        A: string,
    }> => {
        const llammaContract = this.llamalend.contracts[this.market.addresses.amm].multicallContract;
        const controllerContract = this.llamalend.contracts[this.market.addresses.controller].multicallContract;

        const [[_fee, _liquidation_discount, _loan_discount, _base_price, _A], _admin_fee] = await Promise.all([
            this.llamalend.multicallProvider.all([
                llammaContract.fee(),
                controllerContract.liquidation_discount(),
                controllerContract.loan_discount(),
                llammaContract.get_base_price(),
                llammaContract.A(),
            ]),
            this._fetchAdminFee(),
        ]) as [bigint[], bigint];

        const A = formatUnits(_A, 0)
        const base_price = formatUnits(_base_price)
        const [fee, admin_fee, liquidation_discount, loan_discount] = [_fee, _admin_fee, _liquidation_discount, _loan_discount]
            .map((_x) => formatUnits(_x * BigInt(100)));

        return { fee, admin_fee, liquidation_discount, loan_discount, base_price, A }
    }, {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    });

    public async statsRates(isGetter = true, useAPI = false): Promise<{borrowApr: string, lendApr: string, borrowApy: string, lendApy: string}> {
        if(useAPI) {
            const market = await this._fetchMarketDataFromAPI();
            return {
                borrowApr: (market.rates.borrowApr * 100).toString(),
                lendApr: (market.rates.lendApr * 100).toString(),
                borrowApy: (market.rates.borrowApy * 100).toString(),
                lendApy: (market.rates.lendApy * 100).toString(),
            };
        } else {
            const _rate = await this._getRate(isGetter);
            const debt = await this.statsTotalDebt(isGetter, false);
            const { totalAssets } = Number(debt) > 0 ? await this.statsCapAndAvailable(isGetter, false) : { totalAssets: "0" };
            return computeRatesFromRate(_rate, debt, totalAssets);
        }
    }

    public async statsFutureRates(dReserves: TAmount, dDebt: TAmount, useAPI = true): Promise<{borrowApr: string, lendApr: string, borrowApy: string, lendApy: string}> {
        const isGetter = false;
        const _dReserves = parseUnits(dReserves, this.market.borrowed_token.decimals);
        const _dDebt = parseUnits(dDebt, this.market.borrowed_token.decimals);
        const _rate = await this._getFutureRate(_dReserves, _dDebt);
        const debt = Number(await this.statsTotalDebt(isGetter, useAPI)) + Number(dDebt);
        const cap = Number((await this.statsCapAndAvailable(isGetter, useAPI)).totalAssets) + Number(dReserves);
        return computeRatesFromRate(_rate, debt, cap);
    }

    public async statsBalances(): Promise<[string, string]> {
        const borrowedContract = this.llamalend.contracts[this.market.borrowed_token.address].multicallContract;
        const collateralContract = this.llamalend.contracts[this.market.collateral_token.address].multicallContract;

        const [[_borrowedBalance, _collateralBalance], [_borrowedAdminFees, _collateralAdminFees]] = await Promise.all([
            this.llamalend.multicallProvider.all([
                borrowedContract.balanceOf(this.market.addresses.amm),
                collateralContract.balanceOf(this.market.addresses.amm),
            ]),
            this._getAdminFeesXY(false),
        ]) as [bigint[], [bigint, bigint]];

        return [
            formatUnits(_borrowedBalance - _borrowedAdminFees, this.market.borrowed_token.decimals),
            formatUnits(_collateralBalance - _collateralAdminFees, this.market.collateral_token.decimals),
        ];
    }

    public statsBandsInfo = memoize(async (): Promise<{ activeBand: number, maxBand: number, minBand: number, liquidationBand: number | null }> => {
        const ammContract = this.llamalend.contracts[this.market.addresses.amm].multicallContract;
        const calls = [
            ammContract.active_band_with_skip(),
            ammContract.max_band(),
            ammContract.min_band(),
        ]

        const [activeBand, maxBand, minBand] = (await this.llamalend.multicallProvider.all(calls) as bigint[]).map((_b) => Number(_b));
        const { borrowed, collateral } = await this.statsBandBalances(activeBand);
        let liquidationBand = null;
        if (Number(borrowed) > 0 && Number(collateral) > 0) liquidationBand = activeBand;
        return { activeBand, maxBand, minBand, liquidationBand }
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    public async statsBandBalances(n: number): Promise<{ borrowed: string, collateral: string }> {
        const ammContract = this.llamalend.contracts[this.market.addresses.amm].multicallContract;
        const calls = [];
        calls.push(ammContract.bands_x(n), ammContract.bands_y(n));
        const _balances: bigint[] = await this.llamalend.multicallProvider.all(calls);

        // bands_x and bands_y always return amounts with 18 decimals
        return {
            borrowed: formatNumber(formatUnits(_balances[0]), this.market.borrowed_token.decimals),
            collateral: formatNumber(formatUnits(_balances[1]), this.market.collateral_token.decimals),
        }
    }

    public async statsBandsBalances(): Promise<{ [index: number]: { borrowed: string, collateral: string } }> {
        const { maxBand, minBand } = await this.statsBandsInfo();

        const ammContract = this.llamalend.contracts[this.market.addresses.amm].multicallContract;
        const calls = [];
        for (let i = minBand; i <= maxBand; i++) {
            calls.push(ammContract.bands_x(i), ammContract.bands_y(i));
        }

        const _bands: bigint[] = await this.llamalend.multicallProvider.all(calls);

        const bands: { [index: number]: { borrowed: string, collateral: string } } = {};
        for (let i = minBand; i <= maxBand; i++) {
            const _i = i - minBand
            // bands_x and bands_y always return amounts with 18 decimals
            bands[i] = {
                borrowed: formatNumber(formatUnits(_bands[2 * _i]), this.market.borrowed_token.decimals),
                collateral: formatNumber(formatUnits(_bands[(2 * _i) + 1]), this.market.collateral_token.decimals),
            }
        }

        return bands
    }

    public async statsTotalDebt(isGetter = true, useAPI = true): Promise<string> {
        if(useAPI) {
            const market = await this._fetchMarketDataFromAPI();
            return market.borrowed.total.toString();
        } else {
            let _debt;
            if(isGetter) {
                _debt = cacheStats.get(cacheKey(this.market.addresses.controller, 'total_debt'));
            } else {
                _debt = await this.llamalend.contracts[this.market.addresses.controller].contract.total_debt(this.llamalend.constantOptions);
                cacheStats.set(cacheKey(this.market.addresses.controller, 'total_debt'), _debt);
            }

            return formatUnits(_debt, this.market.borrowed_token.decimals);
        }
    }

    public statsAmmBalances = async (isGetter = true, useAPI = false): Promise<{ borrowed: string, collateral: string }> => {
        if(useAPI) {
            const market = await this._fetchMarketDataFromAPI();
            return {
                borrowed: market.ammBalances.ammBalanceBorrowed.toString(),
                collateral: market.ammBalances.ammBalanceCollateral.toString(),
            };
        } else {
            const borrowedContract = this.llamalend.contracts[this.market.addresses.borrowed_token].multicallContract;
            const collateralContract = this.llamalend.contracts[this.market.addresses.collateral_token].multicallContract;

            let _balance_x: bigint, _balance_y: bigint;
            let _fee_x: bigint, _fee_y: bigint;

            if(isGetter) {
                _balance_x = cacheStats.get(cacheKey(this.market.addresses.borrowed_token, 'balanceOf', this.market.addresses.amm));
                _balance_y = cacheStats.get(cacheKey(this.market.addresses.collateral_token, 'balanceOf', this.market.addresses.amm));
                [_fee_x, _fee_y] = await this._getAdminFeesXY(true);
            } else {
                [[_balance_x, _balance_y], [_fee_x, _fee_y]] = await Promise.all([
                    this.llamalend.multicallProvider.all([
                        borrowedContract.balanceOf(this.market.addresses.amm),
                        collateralContract.balanceOf(this.market.addresses.amm),
                    ]),
                    this._getAdminFeesXY(false),
                ]) as [[bigint, bigint], [bigint, bigint]];
                cacheStats.set(cacheKey(this.market.addresses.borrowed_token, 'balanceOf', this.market.addresses.amm), _balance_x);
                cacheStats.set(cacheKey(this.market.addresses.collateral_token, 'balanceOf', this.market.addresses.amm), _balance_y);
            }

            return {
                borrowed: toBN(_balance_x, this.market.borrowed_token.decimals).minus(toBN(_fee_x, this.market.borrowed_token.decimals)).toString(),
                collateral: toBN(_balance_y, this.market.collateral_token.decimals).minus(toBN(_fee_y, this.market.collateral_token.decimals)).toString(),
            }
        }
    }

    protected async _statsCapAndAvailableFromAPI(): Promise<{ borrowCap: string, available: string, totalAssets: string, availableForBorrow: string }> {
        const market = await this._fetchMarketDataFromAPI();
        return {
            totalAssets: market.totalSupplied.total.toString(),
            borrowCap: Infinity.toString(),
            available: market.availableToBorrow.total.toString(),
            availableForBorrow: market.availableToBorrow.total.toString(),
        };
    }

    protected async _statsCapAndAvailableOnChain(isGetter: boolean): Promise<{ borrowCap: string, available: string, totalAssets: string, availableForBorrow: string }> {
        const vaultContract = this.llamalend.contracts[this.market.addresses.vault].multicallContract;
        const borrowedContract = this.llamalend.contracts[this.market.addresses.borrowed_token].multicallContract;

        let _cap, _available;
        if(isGetter) {
            _cap = cacheStats.get(cacheKey(this.market.addresses.vault, 'totalAssets', this.market.addresses.controller));
            _available = cacheStats.get(cacheKey(this.market.addresses.borrowed_token, 'balanceOf', this.market.addresses.controller));
        } else {
            [_cap, _available] = await this.llamalend.multicallProvider.all([
                vaultContract.totalAssets(this.market.addresses.controller),
                borrowedContract.balanceOf(this.market.addresses.controller),
            ]);
            cacheStats.set(cacheKey(this.market.addresses.vault, 'totalAssets', this.market.addresses.controller), _cap);
            cacheStats.set(cacheKey(this.market.addresses.borrowed_token, 'balanceOf', this.market.addresses.controller), _available);
        }

        const available = this.llamalend.formatUnits(_available, this.market.borrowed_token.decimals);
        return {
            totalAssets: this.llamalend.formatUnits(_cap, this.market.borrowed_token.decimals),
            borrowCap: Infinity.toString(),
            available,
            availableForBorrow: available,
        }
    }

    public async statsCapAndAvailable(isGetter = true, useAPI = false): Promise<{ borrowCap: string, available: string, totalAssets: string, availableForBorrow: string }> {
        if(useAPI) return this._statsCapAndAvailableFromAPI();
        return this._statsCapAndAvailableOnChain(isGetter);
    }

    public statsAdminPercentage = async (): Promise<string> => {
        const _adminPercentage = await this._fetchAdminPercentage();
        return formatUnits(_adminPercentage * BigInt(100));
    }

    public oracleAddress = memoize(async (): Promise<string> => {
        return await this.llamalend.contracts[this.market.addresses.amm].contract.price_oracle_contract(this.llamalend.constantOptions) as string;
    },{
        promise: true,
    });
}