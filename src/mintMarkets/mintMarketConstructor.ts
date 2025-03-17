import { MintMarketTemplate} from "./MintMarketTemplate";

export const getMintMarket = (mintMarketId: string): MintMarketTemplate => {
    return new MintMarketTemplate(mintMarketId)
}
