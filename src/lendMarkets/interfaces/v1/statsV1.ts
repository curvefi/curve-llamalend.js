import {TAmount} from "../../../interfaces";

export interface IStatsV1 {
    parameters: () => Promise<{
        fee: string, // %
        admin_fee: string, // %
        liquidation_discount: string, // %
        loan_discount: string, // %
        base_price: string,
        A: string,
    }>,
    rates: (isGetter?: boolean, useAPI?: boolean) => Promise<{borrowApr: string, lendApr: string, borrowApy: string, lendApy: string}>,
    futureRates: (dReserves: TAmount, dDebt: TAmount) => Promise<{borrowApr: string, lendApr: string, borrowApy: string, lendApy: string}>,
    balances: () => Promise<[string, string]>,
    bandsInfo: () => Promise<{ activeBand: number, maxBand: number, minBand: number, liquidationBand: number | null }>
    bandBalances:(n: number) => Promise<{ borrowed: string, collateral: string }>,
    bandsBalances: () => Promise<{ [index: number]: { borrowed: string, collateral: string } }>,
    totalDebt: (isGetter?: boolean, useAPI?: boolean) => Promise<string>,
    ammBalances: (isGetter?: boolean, useAPI?: boolean) => Promise<{ borrowed: string, collateral: string }>,
    capAndAvailable: (isGetter?: boolean, useAPI?: boolean) => Promise<{ cap: string, available: string }>,
}