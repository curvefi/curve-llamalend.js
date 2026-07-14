import {TAmount, TGas, IPartialFrac} from "../../../interfaces";

export interface ILoanV2 {
    createLoanMaxRecv: (collateral: TAmount, range: number) => Promise<string>;
    createLoanMaxRecvAllRanges: (collateral: TAmount) => Promise<{ [index: number]: string }>;
    getMaxRange: (collateral: TAmount, debt: TAmount) => Promise<number>;
    createLoanBands: (collateral: TAmount, debt: TAmount, range: number) => Promise<[number, number]>;
    createLoanBandsAllRanges: (collateral: TAmount, debt: TAmount) => Promise<{ [index: number]: [number, number] | null }>;
    createLoanPrices: (collateral: TAmount, debt: TAmount, range: number) => Promise<string[]>;
    createLoanPricesAllRanges: (collateral: TAmount, debt: TAmount) => Promise<{ [index: number]: [string, string] | null }>;
    createLoanHealth: (collateral: TAmount, debt: TAmount, range: number, full?: boolean) => Promise<string>;
    createLoanIsApproved: (collateral: TAmount) => Promise<boolean>;
    createLoanApprove: (collateral: TAmount, isMax?: boolean) => Promise<string[]>;
    createLoan: (collateral: TAmount, debt: TAmount, range: number, isMax?: boolean) => Promise<string>;

    borrowMoreMaxRecv: (collateralAmount: TAmount) => Promise<string>;
    borrowMoreBands: (collateral: TAmount, debt: TAmount) => Promise<[number, number]>;
    borrowMorePrices: (collateral: TAmount, debt: TAmount) => Promise<string[]>;
    borrowMoreHealth: (collateral: TAmount, debt: TAmount, full?: boolean, address?: string) => Promise<string>;
    borrowMoreIsApproved: (collateral: TAmount) => Promise<boolean>;
    borrowMoreApprove: (collateral: TAmount, isMax?: boolean) => Promise<string[]>;
    borrowMore: (collateral: TAmount, debt: TAmount, isMax?: boolean) => Promise<string>;
    borrowMoreFutureLeverage: (collateral: TAmount, debt: TAmount, userAddress?: string) => Promise<string>;

    addCollateralBands: (collateral: TAmount, address?: string) => Promise<[number, number]>;
    addCollateralPrices: (collateral: TAmount, address?: string) => Promise<string[]>;
    addCollateralHealth: (collateral: TAmount, full?: boolean, address?: string) => Promise<string>;
    addCollateralIsApproved: (collateral: TAmount) => Promise<boolean>;
    addCollateralApprove: (collateral: TAmount, isMax?: boolean) => Promise<string[]>;
    addCollateral: (collateral: TAmount, address?: string, isMax?: boolean) => Promise<string>;
    addCollateralFutureLeverage: (collateral: TAmount, userAddress?: string) => Promise<string>;

    tokensToShrink: (dCollateral?: TAmount, address?: string) => Promise<string>;
    isRepayWithShrinkAvailable: (address?: string) => Promise<boolean>;

    maxRemovable: () => Promise<string>;
    removeCollateralBands: (collateral: TAmount) => Promise<[number, number]>;
    removeCollateralPrices: (collateral: TAmount) => Promise<string[]>;
    removeCollateralHealth: (collateral: TAmount, full?: boolean, address?: string) => Promise<string>;
    removeCollateral: (collateral: TAmount) => Promise<string>;
    removeCollateralFutureLeverage: (collateral: TAmount, userAddress?: string) => Promise<string>;

    repayBands: (params: { debt: TAmount; address?: string; shrink?: boolean }) => Promise<[number, number]>;
    repayPrices: (params: { debt: TAmount; address?: string; shrink?: boolean }) => Promise<string[]>;
    repayIsApproved: (debt: TAmount) => Promise<boolean>;
    repayApprove: (debt: TAmount, isMax?: boolean) => Promise<string[]>;
    repayHealth: (params: { debt: TAmount; shrink?: boolean; full?: boolean; address?: string }) => Promise<string>;
    repay: (params: { debt: TAmount; address?: string; shrink?: boolean; isMax?: boolean }) => Promise<string>;
    repayFutureLeverage: (debt: TAmount, userAddress?: string) => Promise<string>;

    fullRepayIsApproved: (address?: string) => Promise<boolean>;
    fullRepayApprove: (address?: string, isMax?: boolean) => Promise<string[]>;
    fullRepay: (address?: string, isMax?: boolean) => Promise<string>;

    tokensToLiquidate: (address?: string) => Promise<string>;
    calcPartialFrac: (amount: TAmount, address?: string) => Promise<IPartialFrac>;
    liquidateIsApproved: (address?: string) => Promise<boolean>;
    liquidateApprove: (address?: string, isMax?: boolean) => Promise<string[]>;
    liquidate: (address: string, slippage?: number, isMax?: boolean) => Promise<string>;

    selfLiquidateIsApproved: () => Promise<boolean>;
    selfLiquidateApprove: (address?: string, isMax?: boolean) => Promise<string[]>;
    selfLiquidate: (slippage?: number, isMax?: boolean) => Promise<string>;

    partialSelfLiquidateIsApproved: (partialFrac: IPartialFrac) => Promise<boolean>;
    partialSelfLiquidateApprove: (partialFrac: IPartialFrac, isMax?: boolean) => Promise<string[]>;
    partialSelfLiquidate: (partialFrac: IPartialFrac, slippage?: number, isMax?: boolean) => Promise<string>;

    estimateGas: {
        createLoanApprove: (collateral: TAmount, isMax?: boolean) => Promise<TGas>;
        createLoan: (collateral: TAmount, debt: TAmount, range: number) => Promise<TGas>;
        borrowMoreApprove: (collateral: TAmount, isMax?: boolean) => Promise<TGas>;
        borrowMore: (collateral: TAmount, debt: TAmount) => Promise<TGas>;
        addCollateralApprove: (collateral: TAmount, isMax?: boolean) => Promise<TGas>;
        addCollateral: (collateral: TAmount, address?: string) => Promise<TGas>;
        removeCollateral: (collateral: TAmount) => Promise<TGas>;
        repayApprove: (debt: TAmount, isMax?: boolean) => Promise<TGas>;
        repay: (params: { debt: TAmount; address?: string; shrink?: boolean }) => Promise<TGas>;
        fullRepayApprove: (address?: string, isMax?: boolean) => Promise<TGas>;
        fullRepay: (address?: string) => Promise<TGas>;
        liquidateApprove: (address?: string, isMax?: boolean) => Promise<TGas>;
        liquidate: (address: string, slippage?: number) => Promise<TGas>;
        selfLiquidateApprove: (address?: string, isMax?: boolean) => Promise<TGas>;
        selfLiquidate: (slippage?: number) => Promise<TGas>;
        partialSelfLiquidateApprove: (partialFrac: IPartialFrac, isMax?: boolean) => Promise<TGas>;
        partialSelfLiquidate: (partialFrac: IPartialFrac, slippage?: number) => Promise<TGas>;
    };
}
