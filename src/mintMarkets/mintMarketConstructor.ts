import { MintMarketTemplate} from "./MintMarketTemplate";
import type { Llamalend } from "../llamalend.js";

export const getMintMarket = function (this: Llamalend, mintMarketId: string): MintMarketTemplate {
    if (!(mintMarketId in this.mintMarkets)) {
        const llammaData = this.constants.LLAMMAS[mintMarketId];
        if (!llammaData) throw new Error(`No market with id ${mintMarketId} found`);
        this.mintMarkets[mintMarketId] = new MintMarketTemplate(mintMarketId, llammaData, this)
    }
    return this.mintMarkets[mintMarketId]
}
