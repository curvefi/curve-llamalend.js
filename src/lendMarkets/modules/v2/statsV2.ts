import memoize from "memoizee";
import { StatsBaseModule } from "../common/statsBase.js";

export class StatsV2Module extends StatsBaseModule {
    protected _fetchAdminPercentage = memoize(async (): Promise<bigint> => {
        return await this.llamalend.contracts[this.market.addresses.controller].contract.admin_percentage(this.llamalend.constantOptions);
    }, {
        promise: true,
        maxAge: 30 * 60 * 1000, // 30m
    });
}
