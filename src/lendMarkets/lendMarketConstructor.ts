import { LendMarketTemplate} from "./LendMarketTemplate.js";
import type { Llamalend } from "../llamalend.js";

export const getLendMarket = function (this: Llamalend, lendMarketId: string): LendMarketTemplate {
    if (!(lendMarketId in this.lendMarkets)) {
        const marketData = this.constants.ONE_WAY_MARKETS[lendMarketId];
        if (!marketData) throw new Error(`Lend market with id ${lendMarketId} not found`);
        this.lendMarkets[lendMarketId] = new LendMarketTemplate(lendMarketId, marketData, this);
    }
    return this.lendMarkets[lendMarketId];
}
