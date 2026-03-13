import memoize from "memoizee";
import { StatsBaseModule } from "../common/statsBase.js";
import {cacheKey, cacheStats} from "../../../cache";
import BigNumber from "bignumber.js";
import {BN} from "../../../utils";

export class StatsV2Module extends StatsBaseModule {
    protected _fetchAdminPercentage = memoize(async (): Promise<bigint> => {
        return await this.llamalend.contracts[this.market.addresses.controller].contract.admin_percentage(this.llamalend.constantOptions);
    }, {
        promise: true,
        maxAge: 30 * 60 * 1000, // 30m
    });

    protected _fetchAdminFee = async (): Promise<bigint> => BigInt(0);

    protected _getAdminFeesXY = async (): Promise<[bigint, bigint]> => [BigInt(0), BigInt(0)];

    protected async _statsCapAndAvailableFromAPI() {
        const market = await this._fetchMarketDataFromAPI();
        return {
            totalAssets: market.totalSupplied.total.toString(),
            borrowCap: market.borrowCap.total.toString(),
            available: market.availableToBorrow.total.toString(),
            availableForBorrow: market.availableToBorrow.total.toString(),
        };
    }

    protected async _statsCapAndAvailableOnChain(isGetter: boolean): Promise<{ borrowCap: string, available: string, totalAssets: string, availableForBorrow: string }> {
        const vaultContract = this.llamalend.contracts[this.market.addresses.vault].multicallContract;
        const controllerContract = this.llamalend.contracts[this.market.addresses.controller].multicallContract;

        let _cap: bigint, _available: bigint, _totalAssets: bigint, _totalDebt: bigint;
        if(isGetter) {
            _totalAssets = cacheStats.get(cacheKey(this.market.addresses.vault, 'totalAssets', this.market.addresses.controller));
            _cap = cacheStats.get(cacheKey(this.market.addresses.controller, 'borrow_cap'));
            _available = cacheStats.get(cacheKey(this.market.addresses.controller, 'available_balance'));
            _totalDebt = cacheStats.get(cacheKey(this.market.addresses.controller, 'total_debt'));
        } else {
            [_totalAssets, _available, _cap, _totalDebt] = await this.llamalend.multicallProvider.all([
                vaultContract.totalAssets(this.market.addresses.controller),
                controllerContract.available_balance(),
                controllerContract.borrow_cap(),
                controllerContract.total_debt(),
            ]);

            cacheStats.set(cacheKey(this.market.addresses.vault, 'totalAssets', this.market.addresses.controller), _totalAssets);
            cacheStats.set(cacheKey(this.market.addresses.controller, 'borrow_cap'), _cap);
            cacheStats.set(cacheKey(this.market.addresses.controller, 'available_balance'), _available);
            cacheStats.set(cacheKey(this.market.addresses.controller, 'total_debt'), _totalDebt);
        }

        const totalAssets = this.llamalend.formatUnits(_totalAssets, this.market.borrowed_token.decimals);
        const borrowCap = this.llamalend.formatUnits(_cap, this.market.borrowed_token.decimals);
        const available = this.llamalend.formatUnits(_available, this.market.borrowed_token.decimals);
        const totalDebt = this.llamalend.formatUnits(_totalDebt, this.market.borrowed_token.decimals);
        const availableForBorrow = BigNumber.min(BN(available), BN(borrowCap).minus(BN(totalDebt))).toFixed();

        return { totalAssets, borrowCap, available, availableForBorrow }
    }
}
