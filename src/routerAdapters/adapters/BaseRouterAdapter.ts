import type { Llamalend } from "../../llamalend.js";
import { IRouter, IQuote } from "../../constants/routers.js";
import { IRouterMethods } from "../types.js";

export abstract class BaseRouterAdapter implements IRouterMethods {
    protected llamalend: Llamalend;
    protected availableRouters: IRouter[];
    protected routerName: string;

    constructor(
        llamalend: Llamalend,
        availableRouters: IRouter[],
        routerName: string
    ) {
        this.llamalend = llamalend;
        this.availableRouters = availableRouters;
        this.routerName = routerName;
    }

    abstract getExpected(
        fromToken: string,
        toToken: string,
        amount: bigint,
        blacklist: string
    ): Promise<string>;

    abstract getQuote(
        fromToken: string,
        toToken: string,
        amount: bigint,
        blacklist: string,
        slippage: number
    ): Promise<IQuote>;

    abstract getCalldata(
        pathId: string,
    ): Promise<string>;

    abstract isQuoteValid(quote: IQuote): boolean;

    getAddress(): string {
        const router = this.availableRouters.find(r => r.name === this.routerName);
        if (!router) {
            throw Error(`${this.routerName} router not found for chainId ${this.llamalend.chainId}`);
        }
        return router.address;
    }
}

