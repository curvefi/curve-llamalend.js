import memoize from "memoizee";
import {IDict} from "../../interfaces.js";
import type { LendMarketTemplate } from "../LendMarketTemplate.js";
import {
    BN,
    formatUnits,
    _getAddress,
} from "../../utils.js";
import {Llamalend} from "../../llamalend.js";
import {_getUserCollateral} from "../../external-api.js";

export class UserPositionV1Module {
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
}