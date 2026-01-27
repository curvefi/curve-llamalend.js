import {IReward, TAmount, TGas} from "../../interfaces";

export interface IVaultV1 {
    maxDeposit: (address?: string) => Promise<string>,
    previewDeposit: (amount: TAmount) => Promise<string>,
    depositIsApproved: (borrowed: TAmount) => Promise<boolean>
    depositApprove: (borrowed: TAmount) => Promise<string[]>
    deposit: (amount: TAmount) => Promise<string>,
    maxMint: (address?: string) => Promise<string>,
    previewMint: (amount: TAmount) => Promise<string>,
    mintIsApproved: (borrowed: TAmount) => Promise<boolean>
    mintApprove: (borrowed: TAmount) => Promise<string[]>
    mint: (amount: TAmount) => Promise<string>,
    maxWithdraw: (address?: string) => Promise<string>,
    previewWithdraw: (amount: TAmount) => Promise<string>,
    withdraw: (amount: TAmount) => Promise<string>,
    maxRedeem: (address?: string) => Promise<string>,
    previewRedeem: (amount: TAmount) => Promise<string>,
    redeem: (amount: TAmount) => Promise<string>,
    convertToShares: (assets: TAmount) => Promise<string>,
    convertToAssets: (shares: TAmount) => Promise<string>,
    stakeIsApproved: (vaultShares: number | string) => Promise<boolean>,
    stakeApprove: (vaultShares: number | string) => Promise<string[]>,
    stake: (vaultShares: number | string) => Promise<string>,
    unstake: (vaultShares: number | string) => Promise<string>,
    rewardsOnly: () => boolean,
    totalLiquidity: () => Promise<string>,
    crvApr: (useApi?: boolean) => Promise<[baseApy: number, boostedApy: number]>,
    claimableCrv: (address?: string) => Promise<string>,
    claimCrv: () => Promise<string>,
    rewardTokens: (useApi?: boolean) => Promise<{token: string, symbol: string, decimals: number}[]>,
    rewardsApr: (useApi?: boolean) => Promise<IReward[]>,
    claimableRewards: (address?: string) => Promise<{token: string, symbol: string, amount: string}[]>,
    claimRewards: () => Promise<string>,
    estimateGas: {
        depositApprove: (amount: TAmount) => Promise<TGas>,
        deposit: (amount: TAmount) => Promise<TGas>,
        mintApprove: (amount: TAmount) => Promise<TGas>,
        mint: (amount: TAmount) => Promise<TGas>,
        withdraw: (amount: TAmount) => Promise<TGas>,
        redeem: (amount: TAmount) => Promise<TGas>,
        stakeApprove: (vaultShares: number | string) => Promise<TGas>,
        stake: (vaultShares: number | string) => Promise<TGas>,
        unstake: (vaultShares: number | string) => Promise<TGas>,
        claimCrv: () => Promise<TGas>,
        claimRewards: () => Promise<TGas>,
    }
}