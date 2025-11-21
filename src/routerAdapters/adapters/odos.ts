import type { Llamalend } from "../../llamalend.js";
import { _getQuoteOdos, _assembleTxOdos, _getExpectedOdos } from "../../external-api.js";
import { IRouter } from "../../constants/routers.js";
import { IRouterMethods } from "../types.js";

export function createOdosAdapter(
    llamalend: Llamalend,
    availableRouters: IRouter[]
): IRouterMethods {
    return {
        async getExpected(
            fromToken: string,
            toToken: string,
            amount: bigint,
            blacklist: string
        ): Promise<string> {
            return await _getExpectedOdos.call(
                llamalend,
                fromToken,
                toToken,
                amount,
                blacklist
            );
        },

        async getSwapData(
            fromToken: string,
            toToken: string,
            amount: bigint,
            blacklist: string,
            slippage: number
        ): Promise<string> {
            const quote = await _getQuoteOdos.call(
                llamalend,
                fromToken,
                toToken,
                amount,
                blacklist,
                false, // pathVizImage
                slippage
            );

            if (!quote.pathId) {
                throw Error('ODOS pathId is null');
            }

            return await _assembleTxOdos.call(llamalend, quote.pathId);
        },

        getAddress(): string {
            const router = availableRouters.find(r => r.name === 'odos');
            if (!router) {
                throw Error(`ODOS router not found for chainId ${llamalend.chainId}`);
            }
            return router.address;
        }
    };
}

