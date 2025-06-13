import { MintMarketTemplate} from "./MintMarketTemplate";
import type { Llamalend } from "../llamalend.js";

export const getMintMarket = function (this: Llamalend, mintMarketId: string): MintMarketTemplate {
    return new MintMarketTemplate(mintMarketId, this)
}
