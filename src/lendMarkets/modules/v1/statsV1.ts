import memoize from "memoizee";
import {TAmount} from "../../../interfaces";
import type { LendMarketTemplate } from "../../LendMarketTemplate";
import {
    parseUnits,
    BN,
    toBN,
    formatUnits,
    formatNumber,
} from "../../../utils";
import {Llamalend} from "../../../llamalend";
import {_getMarketsData} from "../../../external-api";
import {cacheKey, cacheStats} from "../../../cache";

export class StatsV1Module {
    private market: LendMarketTemplate;
    private llamalend: Llamalend;

    constructor(market: LendMarketTemplate) {
        this.market = market;
        this.llamalend = market.getLlamalend();
    }

    private statsParameters = memoize(async (): Promise<{
        fee: string, // %
        admin_fee: string, // %
        liquidation_discount: string, // %
        loan_discount: string, // %
        base_price: string,
        A: string,
    }> => {
        const llammaContract = this.llamalend.contracts[this.market.addresses.amm].multicallContract;
        const controllerContract = this.llamalend.contracts[this.market.addresses.controller].multicallContract;

        const calls = [
            llammaContract.fee(),
            llammaContract.admin_fee(),
            controllerContract.liquidation_discount(),
            controllerContract.loan_discount(),
            llammaContract.get_base_price(),
            llammaContract.A(),
        ]

        const [_fee, _admin_fee, _liquidation_discount, _loan_discount, _base_price, _A]: bigint[] = await this.llamalend.multicallProvider.all(calls) as bigint[];
        const A = formatUnits(_A, 0)
        const base_price = formatUnits(_base_price)
        const [fee, admin_fee, liquidation_discount, loan_discount] = [_fee, _admin_fee, _liquidation_discount, _loan_discount]
            .map((_x) => formatUnits(_x * BigInt(100)));

        return { fee, admin_fee, liquidation_discount, loan_discount, base_price, A }
    }, {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    });

    private _getRate = async (isGetter = true): Promise<bigint> => {
        let _rate;
        if(isGetter) {
            _rate = cacheStats.get(cacheKey(this.market.addresses.amm, 'rate'));
        } else {
            _rate = await this.llamalend.contracts[this.market.addresses.amm].contract.rate(this.llamalend.constantOptions);
            cacheStats.set(cacheKey(this.market.addresses.controller, 'rate'), _rate);
        }
        return _rate;
    }

    private _getFutureRate = async (_dReserves: bigint, _dDebt: bigint): Promise<bigint> => {
        const mpContract = this.llamalend.contracts[this.market.addresses.monetary_policy].contract;
        return await mpContract.future_rate(this.market.addresses.controller, _dReserves, _dDebt);
    }

    private async statsRates(isGetter = true, useAPI = false): Promise<{borrowApr: string, lendApr: string, borrowApy: string, lendApy: string}> {
        if(useAPI) {
            const response = await _getMarketsData(this.llamalend.constants.NETWORK_NAME);

            const market = response.lendingVaultData.find((item) => item.address.toLowerCase() === this.market.addresses.vault.toLowerCase())

            if(market) {
                return {
                    borrowApr: (market.rates.borrowApr * 100).toString(),
                    lendApr: (market.rates.lendApr * 100).toString(),
                    borrowApy: (market.rates.borrowApy * 100).toString(),
                    lendApy: (market.rates.lendApy * 100).toString(),
                }
            } else {
                throw new Error('Market not found in API')
            }
        } else {
            const _rate = await this._getRate(isGetter);
            const borrowApr =  toBN(_rate).times(365).times(86400).times(100).toString();
            // borrowApy = e**(rate*365*86400) - 1
            const borrowApy = String(((2.718281828459 ** (toBN(_rate).times(365).times(86400)).toNumber()) - 1) * 100);
            let lendApr = "0";
            let lendApy = "0";
            const debt = await this.statsTotalDebt(isGetter);
            if (Number(debt) > 0) {
                const { cap } = await this.statsCapAndAvailable(isGetter);
                lendApr = toBN(_rate).times(365).times(86400).times(debt).div(cap).times(100).toString();
                // lendApy = (debt * e**(rate*365*86400) - debt) / cap
                const debtInAYearBN = BN(debt).times(2.718281828459 ** (toBN(_rate).times(365).times(86400)).toNumber());
                lendApy = debtInAYearBN.minus(debt).div(cap).times(100).toString();
            }

            return { borrowApr, lendApr, borrowApy, lendApy }
        }
    }

    private async statsFutureRates(dReserves: TAmount, dDebt: TAmount, useAPI = true): Promise<{borrowApr: string, lendApr: string, borrowApy: string, lendApy: string}> {
        const _dReserves = parseUnits(dReserves, this.market.borrowed_token.decimals);
        const _dDebt = parseUnits(dDebt, this.market.borrowed_token.decimals);
        const _rate = await this._getFutureRate(_dReserves, _dDebt);
        const borrowApr =  toBN(_rate).times(365).times(86400).times(100).toString();
        // borrowApy = e**(rate*365*86400) - 1
        const borrowApy = String(((2.718281828459 ** (toBN(_rate).times(365).times(86400)).toNumber()) - 1) * 100);
        let lendApr = "0";
        let lendApy = "0";
        const debt = Number(await this.statsTotalDebt()) + Number(dDebt);
        if (Number(debt) > 0) {
            const cap = Number((await this.statsCapAndAvailable(true, useAPI)).cap) + Number(dReserves);
            lendApr = toBN(_rate).times(365).times(86400).times(debt).div(cap).times(100).toString();
            // lendApy = (debt * e**(rate*365*86400) - debt) / cap
            const debtInAYearBN = BN(debt).times(2.718281828459 ** (toBN(_rate).times(365).times(86400)).toNumber());
            lendApy = debtInAYearBN.minus(debt).div(cap).times(100).toString();
        }

        return { borrowApr, lendApr, borrowApy, lendApy }
    }

    private async statsBalances(): Promise<[string, string]> {
        const borrowedContract = this.llamalend.contracts[this.market.borrowed_token.address].multicallContract;
        const collateralContract = this.llamalend.contracts[this.market.collateral_token.address].multicallContract;
        const ammContract = this.llamalend.contracts[this.market.addresses.amm].multicallContract;
        const calls = [
            borrowedContract.balanceOf(this.market.addresses.amm),
            collateralContract.balanceOf(this.market.addresses.amm),
            ammContract.admin_fees_x(),
            ammContract.admin_fees_y(),
        ]
        const [_borrowedBalance, _collateralBalance, _borrowedAdminFees, _collateralAdminFees]: bigint[] = await this.llamalend.multicallProvider.all(calls);

        return [
            formatUnits(_borrowedBalance - _borrowedAdminFees, this.market.borrowed_token.decimals),
            formatUnits(_collateralBalance - _collateralAdminFees, this.market.collateral_token.decimals),
        ];
    }

    private statsBandsInfo = memoize(async (): Promise<{ activeBand: number, maxBand: number, minBand: number, liquidationBand: number | null }> => {
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

    private async statsBandBalances(n: number): Promise<{ borrowed: string, collateral: string }> {
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

    private async statsBandsBalances(): Promise<{ [index: number]: { borrowed: string, collateral: string } }> {
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

    private async statsTotalDebt(isGetter = true, useAPI = true): Promise<string> {
        if(useAPI) {
            const response = await _getMarketsData(this.llamalend.constants.NETWORK_NAME);

            const market = response.lendingVaultData.find((item) => item.address.toLowerCase() === this.market.addresses.vault.toLowerCase())

            if(market) {
                return market.borrowed.total.toString();
            } else {
                throw new Error('Market not found in API')
            }
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

    private statsAmmBalances = async (isGetter = true, useAPI = false): Promise<{ borrowed: string, collateral: string }> => {
        if(useAPI) {
            const response = await _getMarketsData(this.llamalend.constants.NETWORK_NAME);

            const market = response.lendingVaultData.find((item) => item.address.toLowerCase() === this.market.addresses.vault.toLowerCase())

            if(market) {
                return {
                    borrowed: market.ammBalances.ammBalanceBorrowed.toString(),
                    collateral: market.ammBalances.ammBalanceCollateral.toString(),
                }
            } else {
                throw new Error('Market not found in API')
            }
        } else {
            const borrowedContract = this.llamalend.contracts[this.market.addresses.borrowed_token].multicallContract;
            const collateralContract = this.llamalend.contracts[this.market.addresses.collateral_token].multicallContract;
            const ammContract = this.llamalend.contracts[this.market.addresses.amm].multicallContract;

            let _balance_x, _fee_x, _balance_y, _fee_y;
            if(isGetter) {
                [_balance_x, _fee_x, _balance_y, _fee_y] = [
                    cacheStats.get(cacheKey(this.market.addresses.borrowed_token, 'balanceOf', this.market.addresses.amm)),
                    cacheStats.get(cacheKey(this.market.addresses.amm, 'admin_fees_x')),
                    cacheStats.get(cacheKey(this.market.addresses.collateral_token, 'balanceOf', this.market.addresses.amm)),
                    cacheStats.get(cacheKey(this.market.addresses.amm, 'admin_fees_y')),
                ]
            } else {
                [_balance_x, _fee_x, _balance_y, _fee_y] = await this.llamalend.multicallProvider.all([
                    borrowedContract.balanceOf(this.market.addresses.amm),
                    ammContract.admin_fees_x(),
                    collateralContract.balanceOf(this.market.addresses.amm),
                    ammContract.admin_fees_y(),
                ]);
                cacheStats.set(cacheKey(this.market.addresses.borrowed_token, 'balanceOf', this.market.addresses.amm), _balance_x);
                cacheStats.set(cacheKey(this.market.addresses.amm, 'admin_fees_x'), _fee_x);
                cacheStats.set(cacheKey(this.market.addresses.collateral_token, 'balanceOf', this.market.addresses.amm), _balance_y);
                cacheStats.set(cacheKey(this.market.addresses.amm, 'admin_fees_y'), _fee_y);
            }

            return {
                borrowed: toBN(_balance_x, this.market.borrowed_token.decimals).minus(toBN(_fee_x, this.market.borrowed_token.decimals)).toString(),
                collateral: toBN(_balance_y, this.market.collateral_token.decimals).minus(toBN(_fee_y, this.market.collateral_token.decimals)).toString(),
            }
        }
    }

    private async statsCapAndAvailable(isGetter = true, useAPI = false): Promise<{ cap: string, available: string }> {
        if(useAPI) {
            const response = await _getMarketsData(this.llamalend.constants.NETWORK_NAME);

            const market = response.lendingVaultData.find((item) => item.address.toLowerCase() === this.market.addresses.vault.toLowerCase())

            if(market) {
                return {
                    cap: market.totalSupplied.total.toString(),
                    available: market.availableToBorrow.total.toString(),
                }
            } else {
                throw new Error('Market not found in API')
            }
        } else {
            const vaultContract = this.llamalend.contracts[this.market.addresses.vault].multicallContract;
            const borrowedContract = this.llamalend.contracts[this.market.addresses.borrowed_token].multicallContract;

            let _cap, _available;
            if(isGetter) {
                _cap = cacheStats.get(cacheKey(this.market.addresses.vault, 'totalAssets', this.market.addresses.controller));
                _available = cacheStats.get(cacheKey(this.market.addresses.borrowed_token, 'balanceOf', this.market.addresses.controller));
            } else {
                [_cap, _available] =await this.llamalend.multicallProvider.all([
                    vaultContract.totalAssets(this.market.addresses.controller),
                    borrowedContract.balanceOf(this.market.addresses.controller),
                ]);
                cacheStats.set(cacheKey(this.market.addresses.vault, 'totalAssets', this.market.addresses.controller), _cap);
                cacheStats.set(cacheKey(this.market.addresses.borrowed_token, 'balanceOf', this.market.addresses.controller), _available);
            }

            return {
                cap: this.llamalend.formatUnits(_cap, this.market.borrowed_token.decimals),
                available: this.llamalend.formatUnits(_available, this.market.borrowed_token.decimals),
            }
        }
    }
}