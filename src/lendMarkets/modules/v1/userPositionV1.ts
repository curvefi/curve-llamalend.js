import memoize from "memoizee";
import {IDict} from "../../../interfaces";
import type { LendMarketTemplate } from "../../LendMarketTemplate";
import {
    BN,
    formatUnits,
    _getAddress, toBN,
} from "../../../utils";
import {Llamalend} from "../../../llamalend";
import {_getUserCollateral, _getUserCollateralForce} from "../../../external-api";
import {IUserPositionV1} from "../../interfaces/v1/index.js";

export class UserPositionV1Module implements IUserPositionV1 {
    private market: LendMarketTemplate;
    private llamalend: Llamalend;

    constructor(market: LendMarketTemplate) {
        this.market = market;
        this.llamalend = market.getLlamalend();
    }

    public async userLoanExists(address = ""): Promise<boolean> {
        address = _getAddress.call(this.llamalend, address);
        return  await this.llamalend.contracts[this.market.addresses.controller].contract.loan_exists(address, this.llamalend.constantOptions);
    }

    public _userState = memoize(async (address = ""): Promise<{ _collateral: bigint, _borrowed: bigint, _debt: bigint, _N: bigint }> => {
        address = _getAddress.call(this.llamalend, address);
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const [_collateral, _borrowed, _debt, _N] = await contract.user_state(address, this.llamalend.constantOptions) as bigint[];

        return { _collateral, _borrowed, _debt, _N }
    },
    {
        promise: true,
        maxAge: 10 * 1000, // 10s
    });

    public async userState(address = ""): Promise<{ collateral: string, borrowed: string, debt: string, N: string }> {
        const { _collateral, _borrowed, _debt, _N } = await this._userState(address);

        return {
            collateral: formatUnits(_collateral, this.market.collateral_token.decimals),
            borrowed: formatUnits(_borrowed, this.market.borrowed_token.decimals),
            debt: formatUnits(_debt, this.market.borrowed_token.decimals),
            N: formatUnits(_N, 0),
        };
    }

    public async userHealth(full = true, address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        let _health = await this.llamalend.contracts[this.market.addresses.controller].contract.health(address, full, this.llamalend.constantOptions) as bigint;
        _health = _health * BigInt(100);

        return formatUnits(_health);
    }

    private async _userBands(address: string): Promise<bigint[]> {
        address = _getAddress.call(this.llamalend, address);
        const _bands = await this.llamalend.contracts[this.market.addresses.amm].contract.read_user_tick_numbers(address, this.llamalend.constantOptions) as bigint[];

        return Array.from(_bands).reverse();
    }

    public async userBands(address = ""): Promise<number[]> {
        return (await this._userBands(address)).map((_t) => Number(_t));
    }

    public async userRange(address = ""): Promise<number> {
        const [n2, n1] = await this.userBands(address);
        if (n1 == n2) return 0;
        return n2 - n1 + 1;
    }

    public async userPrices(address = ""): Promise<string[]> {
        address = _getAddress.call(this.llamalend, address);
        const _prices = await this.llamalend.contracts[this.market.addresses.controller].contract.user_prices(address, this.llamalend.constantOptions) as bigint[];

        return _prices.map((_p) => formatUnits(_p)).reverse();
    }

    public async userLoss(userAddress = ""): Promise<{ deposited_collateral: string, current_collateral_estimation: string, loss: string, loss_pct: string }> {
        userAddress = _getAddress.call(this.llamalend, userAddress);
        const [userCollateral, _current_collateral_estimation] = await Promise.all([
            _getUserCollateral(this.llamalend.constants.NETWORK_NAME, this.market.addresses.controller, userAddress),
            this.llamalend.contracts[this.market.addresses.amm].contract.get_y_up(userAddress),
        ]);

        const deposited_collateral = userCollateral.total_deposit_precise;

        const current_collateral_estimation = this.llamalend.formatUnits(_current_collateral_estimation, this.market.collateral_token.decimals);
        if (BN(deposited_collateral).lte(0)) {
            return {
                deposited_collateral,
                current_collateral_estimation,
                loss: "0.0",
                loss_pct: "0.0",
            };
        }
        const loss = BN(deposited_collateral).minus(current_collateral_estimation).toString()
        const loss_pct = BN(loss).div(deposited_collateral).times(100).toString();

        return {
            deposited_collateral,
            current_collateral_estimation,
            loss,
            loss_pct,
        };
    }

    public async userBandsBalances(address = ""): Promise<IDict<{ collateral: string, borrowed: string }>> {
        const [n2, n1] = await this.userBands(address);
        if (n1 == 0 && n2 == 0) return {};

        address = _getAddress.call(this.llamalend, address);
        const contract = this.llamalend.contracts[this.market.addresses.amm].contract;
        const [_borrowed, _collateral] = await contract.get_xy(address, this.llamalend.constantOptions) as [bigint[], bigint[]];

        const res: IDict<{ borrowed: string, collateral: string }> = {};
        for (let i = n1; i <= n2; i++) {
            res[i] = {
                collateral: formatUnits(_collateral[i - n1], this.market.collateral_token.decimals),
                borrowed: formatUnits(_borrowed[i - n1], this.market.borrowed_token.decimals),
            };
        }

        return res
    }

    public async currentLeverage(userAddress = ''): Promise<string> {
        userAddress = _getAddress.call(this.llamalend, userAddress);
        const [userCollateral, {collateral}] = await Promise.all([
            _getUserCollateral(this.llamalend.constants.NETWORK_NAME, this.market.addresses.controller, userAddress),
            this.userState(userAddress),
        ]);

        const total_deposit_from_user = userCollateral.total_deposit_from_user_precise;

        return BN(collateral).div(total_deposit_from_user).toString();
    }

    public async currentPnL(userAddress = ''): Promise<Record<string, string>> {
        userAddress = _getAddress.call(this.llamalend, userAddress);

        const calls = [
            this.llamalend.contracts[this.market.addresses.controller].multicallContract.user_state(userAddress, this.llamalend.constantOptions),
            this.llamalend.contracts[this.market.addresses.amm].multicallContract.price_oracle(userAddress),
        ];

        const [userState, oraclePrice] = await this.llamalend.multicallProvider.all(calls) as  [bigint[],bigint];

        if(!(userState || oraclePrice)) {
            throw new Error('Multicall error')
        }

        const debt = userState[2];

        const userCollateral = await _getUserCollateral(this.llamalend.constants.NETWORK_NAME, this.market.addresses.controller, userAddress);
        const totalDepositUsdValueFull = userCollateral.total_deposit_usd_value;
        const totalDepositUsdValueUser = userCollateral.total_deposit_from_user_usd_value;
        const totalBorrowed = userCollateral.total_borrowed;

        const oraclePriceFormatted = this.llamalend.formatUnits(oraclePrice, 18);
        const debtFormatted = this.llamalend.formatUnits(debt, 18);

        const {_collateral: AmmCollateral, _borrowed: AmmBorrowed} = await this._userState(userAddress)
        const [AmmCollateralFormatted, AmmBorrowedFormatted] = [this.llamalend.formatUnits(AmmCollateral, this.market.collateral_token.decimals), this.llamalend.formatUnits(AmmBorrowed, this.market.borrowed_token.decimals)];

        const a = BN(AmmCollateralFormatted).times(oraclePriceFormatted);
        const b = BN(totalBorrowed).minus(debtFormatted)

        const currentPosition = a.plus(AmmBorrowedFormatted).plus(b);

        const currentProfit = currentPosition.minus(totalDepositUsdValueFull);

        const percentage = currentProfit.div(totalDepositUsdValueUser).times(100);

        return {
            currentPosition: currentPosition.toFixed(this.market.borrowed_token.decimals).toString(),
            deposited: totalDepositUsdValueUser.toString(),
            currentProfit: currentProfit.toFixed(this.market.borrowed_token.decimals).toString(),
            percentage: percentage.toFixed(2).toString(),
        };
    }

    public async userBoost(address = ""): Promise<string> {
        if (this.market.addresses.gauge === this.llamalend.constants.ZERO_ADDRESS) {
            throw Error(`${this.market.name} doesn't have gauge`);
        }
        if (this.market.vault.rewardsOnly()) {
            throw Error(`${this.market.name} has Rewards-Only Gauge. Use stats.rewardsApy instead`);
        }
        address = _getAddress.call(this.llamalend, address);

        const gaugeContract = this.llamalend.contracts[this.market.addresses.gauge].multicallContract;
        const [workingBalanceBN, balanceBN] = (await this.llamalend.multicallProvider.all([
            gaugeContract.working_balances(address),
            gaugeContract.balanceOf(address),
        ]) as bigint[]).map((value: bigint) => toBN(value));

        if (balanceBN.isZero()) {
            return '1.0';
        }

        const boostBN = workingBalanceBN.div(0.4).div(balanceBN);
        if (boostBN.lt(1)) return '1.0';
        if (boostBN.gt(2.5)) return '2.5';

        return boostBN.toFixed(4).replace(/([0-9])0+$/, '$1');
    }

    public async forceUpdateUserState(newTx: string, userAddress?: string): Promise<void> {
        const address = userAddress || this.llamalend.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        await _getUserCollateralForce(
            this.llamalend.constants.NETWORK_NAME,
            this.market.addresses.controller,
            address,
            newTx
        );
    }
}