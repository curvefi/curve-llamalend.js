import {GetExpectedFn, IDict, ILeverageMetrics, IQuote, TAmount, TGas} from "../../interfaces.js";

export interface ILeverageZapV2 {
    hasLeverage: () => boolean,

    maxLeverage: (N: number) => Promise<string>,

    createLoanMaxRecv: ({
        userCollateral,
        range,
        getExpected,
    }: {
        userCollateral: TAmount,
        range: number,
        getExpected: GetExpectedFn
    }) => Promise<{
        maxDebt: string,
        maxTotalCollateral: string,
        userCollateral: string,
        collateralFromUserBorrowed: string,
        collateralFromMaxDebt: string,
        maxLeverage: string,
        avgPrice: string,
    }>,
    createLoanMaxRecvAllRanges: ({
        userCollateral,
        getExpected,
    }: {
        userCollateral: TAmount,
        getExpected: GetExpectedFn
    }) => Promise<IDict<{
        maxDebt: string,
        maxTotalCollateral: string,
        userCollateral: string,
        collateralFromUserBorrowed: string,
        collateralFromMaxDebt: string,
        maxLeverage: string,
        avgPrice: string,
    }>>,
    createLoanExpectedCollateral: ({
        userCollateral,
        debt,
        quote,
    }: {
        userCollateral: TAmount,
        debt: TAmount,
        quote: IQuote
    }) => Promise<{
        totalCollateral: string,
        userCollateral: string,
        collateralFromUserBorrowed: string,
        collateralFromDebt: string,
        leverage: string,
        avgPrice: string
    }>,
    createLoanExpectedMetrics: ({
        userCollateral,
        debt,
        range,
        quote,
        healthIsFull,
    }: {
        userCollateral: TAmount,
        debt: TAmount,
        range: number,
        quote: IQuote,
        healthIsFull?: boolean
    }) => Promise<ILeverageMetrics>,
    createLoanMaxRange: ({
        userCollateral,
        debt,
        getExpected,
    }: {
        userCollateral: TAmount,
        debt: TAmount,
        getExpected: GetExpectedFn
    }) => Promise<number>,
    createLoanBandsAllRanges: ({
        userCollateral,
        debt,
        getExpected,
        quote,
    }: {
        userCollateral: TAmount,
        debt: TAmount,
        getExpected: GetExpectedFn,
        quote: IQuote
    }) => Promise<IDict<[number, number] | null>>,
    createLoanPricesAllRanges: ({
        userCollateral,
        debt,
        getExpected,
        quote,
    }: {
        userCollateral: TAmount,
        debt: TAmount,
        getExpected: GetExpectedFn,
        quote: IQuote
    }) => Promise<IDict<[string, string] | null>>,
    createLoanIsApproved: ({
        userCollateral,
    }: {
        userCollateral: TAmount
    }) => Promise<boolean>,
    createLoanApprove: ({
        userCollateral,
    }: {
        userCollateral: TAmount
    }) => Promise<string[]>,
    calcMinRecv: (expected: TAmount, slippage: number) => string,
    createLoan: ({
        userCollateral,
        debt,
        range,
        minRecv,
        router,
        calldata,
    }: {
        userCollateral: TAmount,
        debt: TAmount,
        range: number,
        minRecv: TAmount,
        router: string,
        calldata: string
    }) => Promise<string>,

    borrowMoreMaxRecv: ({ userCollateral, getExpected, address }: {
        userCollateral: TAmount,
        getExpected: GetExpectedFn,
        address?: string
    }) => Promise<{
        maxDebt: string,
        maxTotalCollateral: string,
        userCollateral: string,
        collateralFromUserBorrowed: string,
        collateralFromMaxDebt: string,
        avgPrice: string,
    }>,
    borrowMoreExpectedCollateral: ({ userCollateral, dDebt, quote, address }: {
        userCollateral: TAmount,
        dDebt: TAmount,
        quote: IQuote,
        address?: string
    }) => Promise<{
        totalCollateral: string,
        userCollateral: string,
        collateralFromUserBorrowed: string,
        collateralFromDebt: string,
        avgPrice: string
    }>,
    borrowMoreExpectedMetrics: ({ userCollateral, debt, quote, healthIsFull, address }: {
        userCollateral: TAmount,
        debt: TAmount,
        quote: IQuote,
        healthIsFull?: boolean,
        address?: string
    }) => Promise<ILeverageMetrics>,
    borrowMoreIsApproved: ({ userCollateral }: {
        userCollateral: TAmount
    }) => Promise<boolean>,
    borrowMoreApprove: ({ userCollateral }: {
        userCollateral: TAmount
    }) => Promise<string[]>,
    borrowMore: ({ userCollateral, debt, minRecv, router, calldata }: {
        userCollateral: TAmount,
        debt: TAmount,
        minRecv: TAmount,
        router: string,
        calldata: string
    }) => Promise<string>,
    borrowMoreFutureLeverage: ({ userCollateral, debt, quote, address }: {
        userCollateral: TAmount,
        debt: TAmount,
        quote: IQuote,
        address?: string
    }) => Promise<string>,

    repayExpectedBorrowed: ({ stateCollateral, userCollateral, quote }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        quote: IQuote
    }) => Promise<{
        totalBorrowed: string,
        borrowedFromStateCollateral: string,
        borrowedFromUserCollateral: string,
        userBorrowed: string,
        avgPrice: string
    }>,
    repayIsFull: ({ stateCollateral, userCollateral, quote, address }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        quote: IQuote,
        address?: string
    }) => Promise<boolean>,
    repayIsAvailable: ({ stateCollateral, userCollateral, quote, address }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        quote: IQuote,
        address?: string
    }) => Promise<boolean>,
    repayExpectedMetrics: ({ stateCollateral, userCollateral, healthIsFull, quote, address }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        healthIsFull: boolean,
        quote: IQuote,
        address: string
    }) => Promise<ILeverageMetrics>,
    repayIsApproved: ({ userCollateral }: {
        userCollateral: TAmount
    }) => Promise<boolean>,
    repayApprove: ({ userCollateral }: {
        userCollateral: TAmount
    }) => Promise<string[]>,
    repay: ({ stateCollateral, userCollateral, minRecv, router, calldata }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        minRecv: TAmount,
        router: string,
        calldata: string
    }) => Promise<string>,
    repayFutureLeverage: ({ stateCollateral, userCollateral, address }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        address?: string
    }) => Promise<string>,

    estimateGas: {
        createLoanApprove: ({ userCollateral }: {
            userCollateral: TAmount
        }) => Promise<TGas>,
        createLoan: ({ userCollateral, debt, range, minRecv, router, calldata }: {
            userCollateral: TAmount,
            debt: TAmount,
            range: number,
            minRecv: TAmount,
            router: string,
            calldata: string
        }) => Promise<number>,

        borrowMoreApprove: ({ userCollateral }: {
            userCollateral: TAmount
        }) => Promise<TGas>,
        borrowMore: ({ userCollateral, debt, minRecv, router, calldata }: {
            userCollateral: TAmount,
            debt: TAmount,
            minRecv: TAmount,
            router: string,
            calldata: string
        }) => Promise<number>,

        repayApprove: ({ userCollateral }: {
            userCollateral: TAmount
        }) => Promise<TGas>,
        repay: ({ stateCollateral, userCollateral, minRecv, router, calldata }: {
            stateCollateral: TAmount,
            userCollateral: TAmount,
            minRecv: TAmount,
            router: string,
            calldata: string
        }) => Promise<number>,
    }
}
