import type { Llamalend } from "../llamalend.js";
import { RouterAdapter } from "./RouterAdapter.js";

export * from "./types.js";
export { RouterAdapter } from "./RouterAdapter.js";
export { BaseRouterAdapter } from "./adapters/BaseRouterAdapter.js";
export { OdosAdapter } from "./adapters/odos.js";

export function createRouterAdapter(llamalend: Llamalend): RouterAdapter {
    return new RouterAdapter(llamalend);
}

