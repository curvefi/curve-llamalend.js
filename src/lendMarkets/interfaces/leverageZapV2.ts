import {GetExpectedFn, IDict, ILeverageMetrics, IQuote, TAmount, TGas} from "../../interfaces.js";

export interface ILeverageZapV2 {
    hasLeverage: () => boolean,

    maxLeverage: (N: number) => Promise<string>,

    createLoanMaxRecv: ({
        userCollateral,
        userBorrowed,
        range,
        getExpected
    }: {
        userCollateral: TAmount,
        userBorrowed: TAmount,
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
        userBorrowed,
        getExpected
    }: {
        userCollateral: TAmount,
        userBorrowed: TAmount,
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
        userBorrowed,
        debt,
        quote
    }: {
        userCollateral: TAmount,
        userBorrowed: TAmount,
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
        userBorrowed,
        debt,
        range,
        quote,
        healthIsFull
    }: {
        userCollateral: TAmount,
        userBorrowed: TAmount,
        debt: TAmount,
        range: number,
        quote: IQuote,
        healthIsFull?: boolean
    }) => Promise<ILeverageMetrics>,
    createLoanMaxRange: ({
        userCollateral,
        userBorrowed,
        debt,
        getExpected
    }: {
        userCollateral: TAmount,
        userBorrowed: TAmount,
        debt: TAmount,
        getExpected: GetExpectedFn
    }) => Promise<number>,
    createLoanBandsAllRanges: ({
        userCollateral,
        userBorrowed,
        debt,
        getExpected,
        quote
    }: {
        userCollateral: TAmount,
        userBorrowed: TAmount,
        debt: TAmount,
        getExpected: GetExpectedFn,
        quote: IQuote
    }) => Promise<IDict<[number, number] | null>>,
    createLoanPricesAllRanges: ({
        userCollateral,
        userBorrowed,
        debt,
        getExpected,
        quote
    }: {
        userCollateral: TAmount,
        userBorrowed: TAmount,
        debt: TAmount,
        getExpected: GetExpectedFn,
        quote: IQuote
    }) => Promise<IDict<[string, string] | null>>,
    createLoanIsApproved: ({
        userCollateral,
        userBorrowed
    }: {
        userCollateral: TAmount,
        userBorrowed: TAmount
    }) => Promise<boolean>,
    createLoanApprove: ({
        userCollateral,
        userBorrowed
    }: {
        userCollateral: TAmount,
        userBorrowed: TAmount
    }) => Promise<string[]>,
    createLoan: ({
        userCollateral,
        userBorrowed,
        debt,
        range,
        router,
        calldata
    }: {
        userCollateral: TAmount,
        userBorrowed: TAmount,
        debt: TAmount,
        range: number,
        router: string,
        calldata: string
    }) => Promise<string>,

    borrowMoreMaxRecv: ({ userCollateral, userBorrowed, getExpected, address }: {
        userCollateral: TAmount,
        userBorrowed: TAmount,
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
    borrowMoreExpectedCollateral: ({ userCollateral, userBorrowed, dDebt, quote, address }: {
        userCollateral: TAmount,
        userBorrowed: TAmount,
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
    borrowMoreExpectedMetrics: ({ userCollateral, userBorrowed, debt, quote, healthIsFull, address }: {
        userCollateral: TAmount,
        userBorrowed: TAmount,
        debt: TAmount,
        quote: IQuote,
        healthIsFull?: boolean,
        address?: string
    }) => Promise<ILeverageMetrics>,
    borrowMoreIsApproved: ({ userCollateral, userBorrowed }: {
        userCollateral: TAmount,
        userBorrowed: TAmount
    }) => Promise<boolean>,
    borrowMoreApprove: ({ userCollateral, userBorrowed }: {
        userCollateral: TAmount,
        userBorrowed: TAmount
    }) => Promise<string[]>,
    borrowMore: ({ userCollateral, userBorrowed, debt, router, calldata }: {
        userCollateral: TAmount,
        userBorrowed: TAmount,
        debt: TAmount,
        router: string,
        calldata: string
    }) => Promise<string>,

    repayExpectedBorrowed: ({ stateCollateral, userCollateral, userBorrowed, quote }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        userBorrowed: TAmount,
        quote: IQuote
    }) => Promise<{
        totalBorrowed: string,
        borrowedFromStateCollateral: string,
        borrowedFromUserCollateral: string,
        userBorrowed: string,
        avgPrice: string
    }>,
    repayIsFull: ({ stateCollateral, userCollateral, userBorrowed, quote, address }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        userBorrowed: TAmount,
        quote: IQuote,
        address?: string
    }) => Promise<boolean>,
    repayIsAvailable: ({ stateCollateral, userCollateral, userBorrowed, quote, address }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        userBorrowed: TAmount,
        quote: IQuote,
        address?: string
    }) => Promise<boolean>,
    repayExpectedMetrics: ({ stateCollateral, userCollateral, userBorrowed, healthIsFull, quote, address }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        userBorrowed: TAmount,
        healthIsFull: boolean,
        quote: IQuote,
        address: string
    }) => Promise<ILeverageMetrics>,
    repayIsApproved: ({ userCollateral, userBorrowed }: {
        userCollateral: TAmount,
        userBorrowed: TAmount
    }) => Promise<boolean>,
    repayApprove: ({ userCollateral, userBorrowed }: {
        userCollateral: TAmount,
        userBorrowed: TAmount
    }) => Promise<string[]>,
    repay: ({ stateCollateral, userCollateral, userBorrowed, router, calldata }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        userBorrowed: TAmount,
        router: string,
        calldata: string
    }) => Promise<string>,

    estimateGas: {
        createLoanApprove: ({ userCollateral, userBorrowed }: {
            userCollateral: TAmount,
            userBorrowed: TAmount
        }) => Promise<TGas>,
        createLoan: ({ userCollateral, userBorrowed, debt, range, router, calldata }: {
            userCollateral: TAmount,
            userBorrowed: TAmount,
            debt: TAmount,
            range: number,
            router: string,
            calldata: string
        }) => Promise<number>,

        borrowMoreApprove: ({ userCollateral, userBorrowed }: {
            userCollateral: TAmount,
            userBorrowed: TAmount
        }) => Promise<TGas>,
        borrowMore: ({ userCollateral, userBorrowed, debt, router, calldata }: {
            userCollateral: TAmount,
            userBorrowed: TAmount,
            debt: TAmount,
            router: string,
            calldata: string
        }) => Promise<number>,

        repayApprove: ({ userCollateral, userBorrowed }: {
            userCollateral: TAmount,
            userBorrowed: TAmount
        }) => Promise<TGas>,
        repay: ({ stateCollateral, userCollateral, userBorrowed, router, calldata }: {
            stateCollateral: TAmount,
            userCollateral: TAmount,
            userBorrowed: TAmount,
            router: string,
            calldata: string
        }) => Promise<number>,
    }
}
