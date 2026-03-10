import memoize from "memoizee";
import { StatsBaseModule } from "../common/statsBase.js";
import {cacheKey, cacheStats} from "../../../cache";
import { formatUnits } from "../../../utils";

const PRECISION = BigInt("1000000000000000000"); // 1e18

export class StatsV2Module extends StatsBaseModule {
    private _fetchAdminPercentage = memoize(async (): Promise<bigint> => {
        return await this.llamalend.contracts[this.market.addresses.controller].contract.admin_percentage(this.llamalend.constantOptions);
    }, {
        promise: true,
        maxAge: 30 * 60 * 1000, // 30m
    });

    public statsAdminPercentage = async (): Promise<string> => {
        const _adminPercentage = await this._fetchAdminPercentage();
        return formatUnits(_adminPercentage * BigInt(100));
    }

    protected override _getRate = async (isGetter = true): Promise<bigint> => {
        let _rate: bigint;
        if (isGetter) {
            _rate = cacheStats.get(cacheKey(this.market.addresses.amm, 'rate'));
        } else {
            _rate = await this.llamalend.contracts[this.market.addresses.amm].contract.rate(this.llamalend.constantOptions);
            cacheStats.set(cacheKey(this.market.addresses.controller, 'rate'), _rate);
        }
        const _adminPercentage = await this._fetchAdminPercentage();
        return _rate * (PRECISION - _adminPercentage) / PRECISION;
    }

    protected override _getFutureRate = async (_dReserves: bigint, _dDebt: bigint): Promise<bigint> => {
        const mpContract = this.llamalend.contracts[this.market.addresses.monetary_policy].contract;
        const _rate = await mpContract.future_rate(this.market.addresses.controller, _dReserves, _dDebt);
        const _adminPercentage = await this._fetchAdminPercentage();
        return _rate * (PRECISION - _adminPercentage) / PRECISION;
    }
}
