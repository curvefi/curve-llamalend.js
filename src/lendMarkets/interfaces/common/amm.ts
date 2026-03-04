import {TAmount} from "../../../interfaces";

export interface IAmm {
    maxSwappable: (i: number, j: number) => Promise<string>;
    swapExpected: (i: number, j: number, amount: TAmount) => Promise<string>;
    swapRequired: (i: number, j: number, outAmount: TAmount) => Promise<string>;
    swapPriceImpact: (i: number, j: number, amount: TAmount) => Promise<string>;
    swapIsApproved: (i: number, amount: TAmount) => Promise<boolean>;
    swapApprove: (i: number, amount: TAmount) => Promise<string[]>;
    swap: (i: number, j: number, amount: TAmount, slippage?: number) => Promise<string>;
}