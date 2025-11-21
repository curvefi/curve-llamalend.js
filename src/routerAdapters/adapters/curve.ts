import type { Llamalend } from "../../llamalend.js";
import { IRouter } from "../../constants/routers.js";
import { IRouterMethods } from "../types.js";

/**
 * Curve Router Adapter
 * TODO: Implement Curve Router integration
 */
export function createCurveAdapter(
    llamalend: Llamalend,
    availableRouters: IRouter[]
): IRouterMethods {
    const chainId = llamalend.chainId;

    return {
        async getExpected(
            fromToken: string,
            toToken: string,
            amount: bigint,
            blacklist: string
        ): Promise<string> {
            throw Error('Curve router adapter not implemented yet');
        },

        async getSwapData(
            fromToken: string,
            toToken: string,
            amount: bigint,
            blacklist: string,
            slippage: number
        ): Promise<string> {
            throw Error('Curve router adapter not implemented yet');
        },

        getAddress(): string {
            const router = availableRouters.find(r => r.name === 'curve');
            if (!router) {
                throw Error(`Curve router not found for chainId ${chainId}`);
            }
            return router.address;
        }
    };
}

