import {IQuote, TRouterName} from "../constants/routers.js";

export interface IRouterMethods {
    getExpected(fromToken: string, toToken: string, amount: bigint, blacklist: string): Promise<string>;
    getQuote(fromToken: string, toToken: string, amount: bigint, blacklist: string, slippage: number): Promise<IQuote>;
    getCalldata(pathId: string): Promise<string>;
    isQuoteValid(quote: IQuote): boolean;
    getAddress(): string;
}

export type RouterAdapterType = {
    [K in TRouterName]: IRouterMethods;
} & {
    getRoutes(): TRouterName[];
};