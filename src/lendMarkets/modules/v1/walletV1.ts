import type { LendMarketTemplate } from "../../LendMarketTemplate";
import {
    getBalances,
} from "../../../utils";
import {Llamalend} from "../../../llamalend";

export class WalletV1Module {
    private market: LendMarketTemplate;
    private llamalend: Llamalend;

    constructor(market: LendMarketTemplate) {
        this.market = market;
        this.llamalend = market.getLlamalend();
    }

    public async walletBalances(address = ""): Promise<{ collateral: string, borrowed: string, vaultShares: string, gauge: string }> {
        if (this.market.addresses.gauge === this.llamalend.constants.ZERO_ADDRESS) {
            const [collateral, borrowed, vaultShares] =
                await getBalances.call(this.llamalend, [this.market.collateral_token.address, this.market.borrowed_token.address, this.market.addresses.vault], address);
            return { collateral, borrowed, vaultShares, gauge: "0" }
        } else {
            const [collateral, borrowed, vaultShares, gauge] =
                await getBalances.call(this.llamalend, [this.market.collateral_token.address, this.market.borrowed_token.address, this.market.addresses.vault, this.market.addresses.gauge], address);
            return { collateral, borrowed, vaultShares, gauge }
        }
    }

}