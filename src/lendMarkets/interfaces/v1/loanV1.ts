import {TAmount, TGas, IPartialFrac} from "../../../interfaces";

export interface ILoanV1 {
    createLoanMaxRecv: (collateral: TAmount, range: number) => Promise<string>;
    createLoanMaxRecvAllRanges: (collateral: TAmount) => Promise<{ [index: number]: string }>;
    getMaxRange: (collateral: TAmount, debt: TAmount) => Promise<number>;
    createLoanBands: (collateral: TAmount, debt: TAmount, range: number) => Promise<[number, number]>;
    createLoanBandsAllRanges: (collateral: TAmount, debt: TAmount) => Promise<{ [index: number]: [number, number] | null }>;
    createLoanPrices: (collateral: TAmount, debt: TAmount, range: number) => Promise<string[]>;
    createLoanPricesAllRanges: (collateral: TAmount, debt: TAmount) => Promise<{ [index: number]: [string, string] | null }>;
    createLoanHealth: (collateral: TAmount, debt: TAmount, range: number, full?: boolean) => Promise<string>;
    createLoanIsApproved: (collateral: TAmount) => Promise<boolean>;
    createLoanApprove: (collateral: TAmount) => Promise<string[]>;
    createLoan: (collateral: TAmount, debt: TAmount, range: number) => Promise<string>;

    borrowMoreMaxRecv: (collateralAmount: TAmount) => Promise<string>;
    borrowMoreBands: (collateral: TAmount, debt: TAmount) => Promise<[number, number]>;
    borrowMorePrices: (collateral: TAmount, debt: TAmount) => Promise<string[]>;
    borrowMoreHealth: (collateral: TAmount, debt: TAmount, full?: boolean, address?: string) => Promise<string>;
    borrowMoreIsApproved: (collateral: TAmount) => Promise<boolean>;
    borrowMoreApprove: (collateral: TAmount) => Promise<string[]>;
    borrowMore: (collateral: TAmount, debt: TAmount) => Promise<string>;
    borrowMoreFutureLeverage: (collateral: TAmount, debt: TAmount, userAddress?: string) => Promise<string>;

    addCollateralBands: (collateral: TAmount, address?: string) => Promise<[number, number]>;
    addCollateralPrices: (collateral: TAmount, address?: string) => Promise<string[]>;
    addCollateralHealth: (collateral: TAmount, full?: boolean, address?: string) => Promise<string>;
    addCollateralIsApproved: (collateral: TAmount) => Promise<boolean>;
    addCollateralApprove: (collateral: TAmount) => Promise<string[]>;
    addCollateral: (collateral: TAmount, address?: string) => Promise<string>;
    addCollateralFutureLeverage: (collateral: TAmount, userAddress?: string) => Promise<string>;

    maxRemovable: () => Promise<string>;
    removeCollateralBands: (collateral: TAmount) => Promise<[number, number]>;
    removeCollateralPrices: (collateral: TAmount) => Promise<string[]>;
    removeCollateralHealth: (collateral: TAmount, full?: boolean, address?: string) => Promise<string>;
    removeCollateral: (collateral: TAmount) => Promise<string>;
    removeCollateralFutureLeverage: (collateral: TAmount, userAddress?: string) => Promise<string>;

    repayBands: (debt: TAmount, address?: string) => Promise<[number, number]>;
    repayPrices: (debt: TAmount, address?: string) => Promise<string[]>;
    repayIsApproved: (debt: TAmount) => Promise<boolean>;
    repayApprove: (debt: TAmount) => Promise<string[]>;
    repayHealth: (debt: TAmount, full?: boolean, address?: string) => Promise<string>;
    repay: (debt: TAmount, address?: string) => Promise<string>;
    repayFutureLeverage: (debt: TAmount, userAddress?: string) => Promise<string>;

    fullRepayIsApproved: (address?: string) => Promise<boolean>;
    fullRepayApprove: (address?: string) => Promise<string[]>;
    fullRepay: (address?: string) => Promise<string>;

    tokensToLiquidate: (address?: string) => Promise<string>;
    calcPartialFrac: (amount: TAmount, address?: string) => Promise<IPartialFrac>;
    liquidateIsApproved: (address?: string) => Promise<boolean>;
    liquidateApprove: (address?: string) => Promise<string[]>;
    liquidate: (address: string, slippage?: number) => Promise<string>;

    selfLiquidateIsApproved: () => Promise<boolean>;
    selfLiquidateApprove: () => Promise<string[]>;
    selfLiquidate: (slippage?: number) => Promise<string>;

    partialSelfLiquidateIsApproved: (partialFrac: IPartialFrac) => Promise<boolean>;
    partialSelfLiquidateApprove: (partialFrac: IPartialFrac) => Promise<string[]>;
    partialSelfLiquidate: (partialFrac: IPartialFrac, slippage?: number) => Promise<string>;

    estimateGas: {
        createLoan: (collateral: TAmount, debt: TAmount, range: number) => Promise<TGas>;
        borrowMore: (collateral: TAmount, debt: TAmount) => Promise<TGas>;
        addCollateral: (collateral: TAmount, address?: string) => Promise<TGas>;
        removeCollateral: (collateral: TAmount) => Promise<TGas>;
        repay: (debt: TAmount, address?: string) => Promise<TGas>;
        fullRepay: (address?: string) => Promise<TGas>;
        liquidate: (address: string, slippage?: number) => Promise<TGas>;
        selfLiquidate: (slippage?: number) => Promise<TGas>;
        partialSelfLiquidate: (partialFrac: IPartialFrac, slippage?: number) => Promise<TGas>;
    };
}
