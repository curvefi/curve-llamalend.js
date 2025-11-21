import type { Llamalend } from "../llamalend.js";
import type { IChainId } from "../interfaces.js";
import { ROUTERS } from "../constants/routers.js";
import { RouterName, TRouterName } from "../constants/routers.js";
import { RouterAdapterType } from "./types.js";
import { OdosAdapter } from "./adapters/odos.js";

export class RouterAdapter implements RouterAdapterType {
    public readonly odos: OdosAdapter;

    private availableRouters: Array<{ name: RouterName; address: string }>;
    private chainId: IChainId;

    constructor(llamalend: Llamalend) {
        this.chainId = llamalend.chainId as IChainId;
        this.availableRouters = ROUTERS[this.chainId] || [];

        this.odos = new OdosAdapter(llamalend, this.availableRouters);
    }

    getRoutes(): TRouterName[] {
        return this.availableRouters.map(r => r.name) as TRouterName[];
    }
}

