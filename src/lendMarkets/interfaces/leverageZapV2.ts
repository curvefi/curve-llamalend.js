import {GetExpectedFn, IDict, ILeverageMetrics, IQuote, TAmount, TGas} from "../../interfaces.js";

export interface ILeverageZapV2 {
    hasLeverage: () => boolean,

    maxLeverage: (N: number) => Promise<string>,

    createLoanMaxRecv: (userCollateral: TAmount, userBorrowed: TAmount, range: number, getExpected: GetExpectedFn) =>
        Promise<{
            maxDebt: string,
            maxTotalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromMaxDebt: string,
            maxLeverage: string,
            avgPrice: string,
        }>,
    createLoanMaxRecvAllRanges: (userCollateral: TAmount, userBorrowed: TAmount, getExpected: GetExpectedFn) =>
        Promise<IDict<{
            maxDebt: string,
            maxTotalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromMaxDebt: string,
            maxLeverage: string,
            avgPrice: string,
        }>>,
    createLoanExpectedCollateral: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, quote: IQuote) =>
        Promise<{ totalCollateral: string, userCollateral: string, collateralFromUserBorrowed: string, collateralFromDebt: string, leverage: string, avgPrice: string }>,
    createLoanExpectedMetrics: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, quote: IQuote, healthIsFull?: boolean) => Promise<ILeverageMetrics>,
    createLoanMaxRange: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, getExpected: GetExpectedFn) => Promise<number>,
    createLoanBandsAllRanges: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, getExpected: GetExpectedFn, quote: IQuote) => Promise<IDict<[number, number] | null>>,
    createLoanPricesAllRanges: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, getExpected: GetExpectedFn, quote: IQuote) => Promise<IDict<[string, string] | null>>,
    createLoanIsApproved: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<boolean>,
    createLoanApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<string[]>,
    createLoan: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, router: string, calldata: string) => Promise<string>,

    borrowMoreMaxRecv: (userCollateral: TAmount, userBorrowed: TAmount, getExpected: GetExpectedFn, address?: string) =>
        Promise<{
            maxDebt: string,
            maxTotalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromMaxDebt: string,
            avgPrice: string,
        }>,
    borrowMoreExpectedCollateral: (userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, quote: IQuote, address?: string) =>
        Promise<{ totalCollateral: string, userCollateral: string, collateralFromUserBorrowed: string, collateralFromDebt: string, avgPrice: string }>,
    borrowMoreExpectedMetrics: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, quote: IQuote, healthIsFull?: boolean, address?: string) => Promise<ILeverageMetrics>,
    borrowMoreIsApproved: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<boolean>,
    borrowMoreApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<string[]>,
    borrowMore: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, router: string, calldata: string) => Promise<string>,

    repayExpectedBorrowed: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, quote: IQuote) =>
        Promise<{ totalBorrowed: string, borrowedFromStateCollateral: string, borrowedFromUserCollateral: string, userBorrowed: string, avgPrice: string }>,
    repayIsFull: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, quote: IQuote, address?: string) => Promise<boolean>,
    repayIsAvailable: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, quote: IQuote, address?: string) => Promise<boolean>,
    repayExpectedMetrics: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, healthIsFull: boolean, quote: IQuote, address: string) => Promise<ILeverageMetrics>,
    repayIsApproved: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<boolean>,
    repayApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<string[]>,
    repay: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, router: string, calldata: string) => Promise<string>,

    estimateGas: {
        createLoanApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<TGas>,
        createLoan: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, router: string, calldata: string) => Promise<number>,

        borrowMoreApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<TGas>,
        borrowMore: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, router: string, calldata: string) => Promise<number>,

        repayApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<TGas>,
        repay: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, router: string, calldata: string) => Promise<number>,
    }
}
