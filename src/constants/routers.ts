export enum RouterName {
    ODOS = 'odos',
}

export type TRouterName = RouterName;

export interface IRouter {
    name: RouterName;
    address: string;
}

export type IRouterConfig = Record<number, IRouter[]>;

export interface IQuote {
    outAmounts: string[],
    priceImpact: number,
    pathId: string | null,
    pathVizImage?: string,
    slippage: number,
}

export const ROUTERS: IRouterConfig = {
    1: [{ name: RouterName.ODOS, address: '0xC5898606BdB494a994578453B92e7910a90aA873' }],
    10: [{ name: RouterName.ODOS, address: '0xCa423977156BB05b13A2BA3b76Bc5419E2fE9680' }],
    252: [{ name: RouterName.ODOS, address: '0x2d8879046f1559E53eb052E949e9544bCB72f414' }],
    42161: [{ name: RouterName.ODOS, address: '0xa669e7A0d4b3e4Fa48af2dE86BD4CD7126Be4e13' }],
};
