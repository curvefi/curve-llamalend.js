import { StatsBaseModule } from "../common/statsBase.js";
import {cacheKey, cacheStats} from "../../../cache";

export class StatsV1Module extends StatsBaseModule {
    public statsAdminPercentage = async (): Promise<string> => {
        return "0";
    } 

    protected override _getRate = async (isGetter = true): Promise<bigint> => {
        let _rate;
        if(isGetter) {
            _rate = cacheStats.get(cacheKey(this.market.addresses.amm, 'rate'));
        } else {
            _rate = await this.llamalend.contracts[this.market.addresses.amm].contract.rate(this.llamalend.constantOptions);
            cacheStats.set(cacheKey(this.market.addresses.controller, 'rate'), _rate);
        }
        return _rate;
    }

    protected override _getFutureRate = async (_dReserves: bigint, _dDebt: bigint): Promise<bigint> => {
        const mpContract = this.llamalend.contracts[this.market.addresses.monetary_policy].contract;
        return await mpContract.future_rate(this.market.addresses.controller, _dReserves, _dDebt);
    }
}
