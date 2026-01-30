import {IDict} from "../../../interfaces";

export interface IUserPositionV1 {
    userLoanExists: (address?: string) => Promise<boolean>,
    _userState: (address?: string) => Promise<{ _collateral: bigint, _borrowed: bigint, _debt: bigint, _N: bigint }>,
    userState: (address?: string) => Promise<{ collateral: string, borrowed: string, debt: string, N: string }>,
    userHealth: (full?: boolean, address?: string) => Promise<string>,
    userBands: (address?: string) => Promise<number[]>,
    userRange: (address?: string) => Promise<number>,
    userPrices: (address?: string) => Promise<string[]>,
    userLoss: (userAddress?: string) => Promise<{ 
        deposited_collateral: string, 
        current_collateral_estimation: string, 
        loss: string, 
        loss_pct: string 
    }>,
    userBandsBalances: (address?: string) => Promise<IDict<{ collateral: string, borrowed: string }>>,
    currentLeverage: (userAddress?: string) => Promise<string>,
    currentPnL: (userAddress?: string) => Promise<Record<string, string>>,
    userBoost: (address?: string) => Promise<string>,
    forceUpdateUserState: (newTx: string, userAddress?: string) => Promise<void>,
}
