import {IDict, TAmount, TGas} from "../../interfaces";

export interface IDeprecatedLeverage {
    createLoanMaxRecv: (collateral: number | string, range: number) => Promise<{ maxBorrowable: string, maxCollateral: string, leverage: string, routeIdx: number }>,
    createLoanMaxRecvAllRanges: (collateral: number | string) => Promise<IDict<{ maxBorrowable: string, maxCollateral: string, leverage: string, routeIdx: number }>>,
    createLoanCollateral: (userCollateral: number | string, debt: number | string) => Promise<{ collateral: string, leverage: string, routeIdx: number }>,
    getRouteName: (routeIdx: number) => Promise<string>,
    getMaxRange: (collateral: number | string, debt: number | string) => Promise<number>,
    createLoanBands: (collateral: number | string, debt: number | string, range: number) => Promise<[number, number]>,
    createLoanBandsAllRanges: (collateral: number | string, debt: number | string) => Promise<IDict<[number, number] | null>>,
    createLoanPrices: (collateral: number | string, debt: number | string, range: number) => Promise<string[]>,
    createLoanPricesAllRanges: (collateral: number | string, debt: number | string) => Promise<IDict<[string, string] | null>>,
    createLoanHealth: (collateral: number | string, debt: number | string, range: number, full?: boolean, address?: string) => Promise<string>,
    createLoanIsApproved: (collateral: number | string) => Promise<boolean>,
    createLoanApprove: (collateral: number | string) => Promise<string[]>,
    priceImpact: (collateral: number | string, debt: number | string) => Promise<string>,
    createLoan: (collateral: number | string, debt: number | string, range: number, slippage?: number) => Promise<string>,
    estimateGas: {
        createLoanApprove: (collateral: number | string) => Promise<TGas>,
        createLoan: (collateral: number | string, debt: number | string, range: number, slippage?: number) => Promise<TGas>,
    }
}

export interface ILeverage {
    hasLeverage: () => boolean,

    maxLeverage: (N: number) => Promise<string>,

    createLoanMaxRecv: (userCollateral: TAmount, userBorrowed: TAmount, range: number) =>
        Promise<{
            maxDebt: string,
            maxTotalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromMaxDebt: string,
            maxLeverage: string,
            avgPrice: string,
        }>,
    createLoanMaxRecvAllRanges: (userCollateral: TAmount, userBorrowed: TAmount) =>
        Promise<IDict<{
            maxDebt: string,
            maxTotalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromMaxDebt: string,
            maxLeverage: string,
            avgPrice: string,
        }>>,
    createLoanExpectedCollateral: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, slippage?: number) =>
        Promise<{
            totalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromDebt: string,
            leverage: string,
            avgPrice: string
        }>,
    createLoanPriceImpact: (userBorrowed: TAmount, debt: TAmount) => Promise<string>,
    createLoanMaxRange: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount) => Promise<number>,
    createLoanBands: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number) => Promise<[number, number]>,
    createLoanBandsAllRanges: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount) => Promise<IDict<[number, number] | null>>,
    createLoanPrices: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number) => Promise<string[]>,
    createLoanPricesAllRanges: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount) => Promise<IDict<[string, string] | null>>,
    createLoanHealth: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, full?: boolean) => Promise<string>,
    createLoanIsApproved: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<boolean>,
    createLoanApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<string[]>,
    createLoanRouteImage: (userBorrowed: TAmount, debt: TAmount) => Promise<string>,
    createLoan: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, slippage?: number) => Promise<string>,

    borrowMoreMaxRecv: (userCollateral: TAmount, userBorrowed: TAmount, address?: string) =>
        Promise<{
            maxDebt: string,
            maxTotalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromMaxDebt: string,
            avgPrice: string,
        }>,
    borrowMoreExpectedCollateral: (userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, slippage?: number, address?: string) =>
        Promise<{
            totalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromDebt: string,
            avgPrice: string
        }>,
    borrowMorePriceImpact: (userBorrowed: TAmount, dDebt: TAmount, address?: string) => Promise<string>,
    borrowMoreBands: (userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, address?: string) => Promise<[number, number]>,
    borrowMorePrices: (userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, address?: string) => Promise<string[]>,
    borrowMoreHealth: (userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, full?: boolean, address?: string) => Promise<string>,
    borrowMoreIsApproved: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<boolean>,
    borrowMoreApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<string[]>,
    borrowMoreRouteImage: (userBorrowed: TAmount, debt: TAmount) => Promise<string>,
    borrowMore: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, slippage?: number) => Promise<string>,

    repayExpectedBorrowed: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, slippage?: number) =>
        Promise<{
            totalBorrowed: string,
            borrowedFromStateCollateral: string,
            borrowedFromUserCollateral: string,
            userBorrowed: string,
            avgPrice: string
        }>,
    repayPriceImpact: (stateCollateral: TAmount, userCollateral: TAmount) => Promise<string>,
    repayIsFull: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address?: string) => Promise<boolean>,
    repayIsAvailable: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address?: string) => Promise<boolean>,
    repayBands: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address?: string) => Promise<[number, number]>,
    repayPrices: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address?: string) => Promise<string[]>,
    repayHealth: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, full?: boolean, address?: string) => Promise<string>,
    repayIsApproved: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<boolean>,
    repayApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<string[]>,
    repayRouteImage: (stateCollateral: TAmount, userCollateral: TAmount) => Promise<string>,
    repay: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, slippage?: number) => Promise<string>,

    estimateGas: {
        createLoanApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<TGas>,
        createLoan: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, slippage?: number) => Promise<number>,

        borrowMoreApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<TGas>,
        borrowMore: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, slippage?: number) => Promise<number>,

        repayApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<TGas>,
        repay: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, slippage?: number) => Promise<number>,
    }
}

export interface IDeleverage {
    repayStablecoins: (collateral: number | string) => Promise<{ stablecoins: string, routeIdx: number }>;
    getRouteName: (routeIdx: number) => Promise<string>;
    isAvailable: (deleverageCollateral: number | string, address?: string) => Promise<boolean>;
    isFullRepayment: (deleverageCollateral: number | string, address?: string) => Promise<boolean>;
    repayBands: (collateral: number | string, address?: string) => Promise<[number, number]>;
    repayPrices: (collateral: number | string, address?: string) => Promise<string[]>;
    repayHealth: (collateral: number | string, full?: boolean, address?: string) => Promise<string>;
    repay: (collateral: number | string, slippage?: number) => Promise<string>;
    priceImpact: (collateral: number | string) => Promise<string>;
    estimateGas: {
        repay: (collateral: number | string, slippage?: number) => Promise<number>;
    }
} 