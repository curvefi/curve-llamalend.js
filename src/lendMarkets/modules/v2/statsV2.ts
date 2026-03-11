import memoize from "memoizee";
import { StatsBaseModule } from "../common/statsBase.js";
import {fetchMarketDataByVault} from "../../utils";
import {_getMarketsData} from "../../../external-api";
import {cacheKey, cacheStats} from "../../../cache";

export class StatsV2Module extends StatsBaseModule {
    protected _fetchAdminPercentage = memoize(async (): Promise<bigint> => {
        return await this.llamalend.contracts[this.market.addresses.controller].contract.admin_percentage(this.llamalend.constantOptions);
    }, {
        promise: true,
        maxAge: 30 * 60 * 1000, // 30m
    });

    protected _fetchAdminFee = async (): Promise<bigint> => BigInt(0);

    protected _getAdminFeesXY = async (): Promise<[bigint, bigint]> => [BigInt(0), BigInt(0)];

    public async statsCapAndAvailable(isGetter = true, useAPI = false): Promise<{ cap: string, available: string, totalAssets: string }> {
        if(useAPI) {
            const market = await fetchMarketDataByVault(
                this.llamalend.constants.NETWORK_NAME,
                this.market.addresses.vault,
                _getMarketsData
            );
            return {
                totalAssets: market.totalSupplied.total.toString(),
                cap: market.cap.total.toString(),
                available: market.availableToBorrow.total.toString(),
            };
        } else {
            const vaultContract = this.llamalend.contracts[this.market.addresses.vault].multicallContract;
            const controllerContract = this.llamalend.contracts[this.market.addresses.controller].multicallContract;

            let _cap, _available, _totalAssets;
            if(isGetter) {
                _totalAssets = cacheStats.get(cacheKey(this.market.addresses.vault, 'totalAssets', this.market.addresses.controller));
                _cap = cacheStats.get(cacheKey(this.market.addresses.controller, 'borrow_cap'));
                _available = cacheStats.get(cacheKey(this.market.addresses.controller, 'available_balance'));
            } else {
                [_totalAssets, _cap, _available] =await this.llamalend.multicallProvider.all([
                    vaultContract.totalAssets(this.market.addresses.controller),
                    controllerContract.available_balance(),
                    controllerContract.borrow_cap(),
                ]);
                cacheStats.set(cacheKey(this.market.addresses.vault, 'totalAssets', this.market.addresses.controller), _totalAssets);
                cacheStats.set(cacheKey(this.market.addresses.controller, 'borrow_cap'), _cap);
                cacheStats.set(cacheKey(this.market.addresses.controller, 'available_balance'), _available);
            }

            return {
                totalAssets: this.llamalend.formatUnits(_totalAssets, this.market.borrowed_token.decimals),
                cap: this.llamalend.formatUnits(_cap, this.market.borrowed_token.decimals),
                available: this.llamalend.formatUnits(_available, this.market.borrowed_token.decimals),
            }
        }
    }
}
