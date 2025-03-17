import { LendMarketTemplate} from "./LendMarketTemplate.js";
import { llamalend } from "../llamalend.js";

export const getLendMarket = (lendMarketId: string): LendMarketTemplate => {
    const marketData = llamalend.constants.ONE_WAY_MARKETS[lendMarketId];
    return new LendMarketTemplate(lendMarketId, marketData)
}
