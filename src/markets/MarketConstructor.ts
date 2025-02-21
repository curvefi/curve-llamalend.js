import { OneWayMarketTemplate} from "./OneWayMarketTemplate.js";
import { lending } from "../lending.js";

export const getOneWayMarket = (oneWayMarketId: string): OneWayMarketTemplate => {
    const marketData = lending.constants.ONE_WAY_MARKETS[oneWayMarketId];
    return new OneWayMarketTemplate(oneWayMarketId, marketData)
}
