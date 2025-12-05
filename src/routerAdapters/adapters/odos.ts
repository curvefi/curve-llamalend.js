import type { Llamalend } from "../../llamalend.js";
import { _getQuoteOdos, _assembleTxOdos, _getExpectedOdos } from "../../external-api.js";
import { IRouter, RouterName, IQuote } from "../../constants/routers.js";
import { BaseRouterAdapter } from "./BaseRouterAdapter.js";
import {buildCalldataForLeverageZapV2} from "../../utils";

/**
 * Odos Router Adapter
 */
export class OdosAdapter extends BaseRouterAdapter {
    constructor(llamalend: Llamalend, availableRouters: IRouter[]) {
        super(llamalend, availableRouters, RouterName.ODOS);
    }

    async getExpected(
        fromToken: string,
        toToken: string,
        amount: bigint,
        blacklist: string
    ): Promise<string> {
        return await _getExpectedOdos.call(
            this.llamalend,
            fromToken,
            toToken,
            amount,
            blacklist,
            true // useZapV2 = true for lend markets (leverage_zap_v2)
        );
    }

    async getQuote(
        fromToken: string,
        toToken: string,
        amount: bigint,
        blacklist: string,
        slippage: number
    ): Promise<IQuote> {
        return await _getQuoteOdos.call(
            this.llamalend,
            fromToken,
            toToken,
            amount,
            blacklist,
            false, // pathVizImage
            slippage,
            true // useZapV2 = true for lend markets (leverage_zap_v2)
        );
    }

    async getCalldata(
        pathID: string
    ): Promise<string> {
        return buildCalldataForLeverageZapV2(
            this.getAddress(), 
            await _assembleTxOdos.call(this.llamalend, pathID, true) // useZapV2 = true for lend markets (leverage_zap_v2)
        );
    }

    isQuoteValid(quote: IQuote): boolean {
        return quote.pathId !== null && quote.pathId !== undefined && quote.outAmounts.length > 0;
    }
}

