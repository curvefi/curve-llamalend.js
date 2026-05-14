import { MintMarketTemplate} from "./MintMarketTemplate.js";
import type { ILlamma } from "../interfaces.js";
import type { Llamalend } from "../llamalend.js";
import { setupMintMarketContracts } from "./setupContracts.js";

export const getMintMarket = function (this: Llamalend, mintMarketId: string): MintMarketTemplate {
    if (!(mintMarketId in this.mintMarkets)) {
        const llammaData = this.constants.LLAMMAS[mintMarketId];
        if (!llammaData) throw new Error(`No market with id ${mintMarketId} found`);
        this.mintMarkets[mintMarketId] = new MintMarketTemplate(mintMarketId, llammaData, this)
    }
    return this.mintMarkets[mintMarketId]
}

export const getMintMarketByData = function (this: Llamalend, id: string, llammaData: ILlamma): MintMarketTemplate {
    setupMintMarketContracts(this, llammaData);
    this.mintMarkets[id] = new MintMarketTemplate(id, llammaData, this);

    return this.mintMarkets[id];
}
