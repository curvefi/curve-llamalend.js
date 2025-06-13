import { LendMarketTemplate} from "./LendMarketTemplate.js";
import type { Llamalend } from "../llamalend.js";

export const getLendMarket = function (this: Llamalend, lendMarketId: string): LendMarketTemplate {
    const marketData = this.constants.ONE_WAY_MARKETS[lendMarketId];
    return new LendMarketTemplate(lendMarketId, marketData, this)
}
