import { LendMarketTemplate} from "./LendMarketTemplate.js";
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
