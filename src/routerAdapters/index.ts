import type { Llamalend } from "../llamalend.js";
import { ROUTERS } from "../constants/routers.js";
import { IChainId } from "../interfaces.js";
import { RouterAdapterType } from "./types.js";
import { createOdosAdapter } from "./adapters/odos.js";

export * from "./types.js";

/**
 * Create Router Adapter for Llamalend instance
 * 
 * Usage:
 *   const routerAdapter = createRouterAdapter(llamalend);
 *   const expected = await routerAdapter['odos'].getExpected(...);
 *   const swapData = await routerAdapter['odos'].getSwapData(...);
 *   const routes = routerAdapter.getRoutes();
 * 
 * @param llamalend - Llamalend instance
 * @returns Router adapter with access to all routers
 */
export function createRouterAdapter(llamalend: Llamalend): RouterAdapterType {
    const chainId = llamalend.chainId as IChainId;
    const availableRouters = ROUTERS[chainId] || [];

    // Create adapters
    const odosAdapter = createOdosAdapter(llamalend, availableRouters);

    // Build adapter object
    const adapter: any = {
        odos: odosAdapter,

        getRoutes(): string[] {
            return availableRouters.map(r => r.name);
        }
    };

    return adapter as RouterAdapterType;
}

