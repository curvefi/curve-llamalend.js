import { OneWayMarketTemplate} from "./OneWayMarketTemplate.js";
import { llamalend } from "../lending.js";

export const getOneWayMarket = (oneWayMarketId: string): OneWayMarketTemplate => {
    const marketData = llamalend.constants.ONE_WAY_MARKETS[oneWayMarketId];
    return new OneWayMarketTemplate(oneWayMarketId, marketData)
}
