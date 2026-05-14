import { LendMarketTemplate} from "./LendMarketTemplate.js";
import type { IOneWayMarket } from "../interfaces.js";
import type { Llamalend } from "../llamalend.js";

export const getLendMarket = function (this: Llamalend, lendMarketId: string): LendMarketTemplate<'v1'> | LendMarketTemplate<'v2'> {
    if (!(lendMarketId in this.lendMarkets)) {
        const marketData = this.constants.ONE_WAY_MARKETS[lendMarketId] || this.constants.ONE_WAY_MARKETS_V2[lendMarketId];
        if (!marketData) throw new Error(`Lend market with id ${lendMarketId} not found`);
        if (marketData.version === 'v2') {
            this.lendMarkets[lendMarketId] = new LendMarketTemplate<'v2'>(lendMarketId, marketData, this);
        } else {
            this.lendMarkets[lendMarketId] = new LendMarketTemplate<'v1'>(lendMarketId, marketData, this);
        }
    }
    return this.lendMarkets[lendMarketId];
}

export const getLendMarketByData = function (this: Llamalend, id: string, marketData: IOneWayMarket): LendMarketTemplate<'v1'> | LendMarketTemplate<'v2'> {
    if (!(id in this.lendMarkets)) {
        if (marketData.version === 'v2') {
            this.lendMarkets[id] = new LendMarketTemplate<'v2'>(id, marketData, this);
        } else {
            this.lendMarkets[id] = new LendMarketTemplate<'v1'>(id, marketData, this);
        }
    }
    return this.lendMarkets[id];
}
