import {IReward, TAmount, TGas} from "../../../interfaces";

export interface IVault {
    maxDeposit: (address?: string) => Promise<string>,
    previewDeposit: (assets: TAmount) => Promise<string>,
    depositIsApproved: (assets: TAmount) => Promise<boolean>
    depositApprove: (assets: TAmount, isMax?: boolean) => Promise<string[]>
    deposit: (assets: TAmount, isMax?: boolean) => Promise<string>,
    maxMint: (address?: string) => Promise<string>,
    previewMint: (vaultShares: TAmount) => Promise<string>,
    mintIsApproved: (assets: TAmount) => Promise<boolean>
    mintApprove: (assets: TAmount, isMax?: boolean) => Promise<string[]>
    mint: (vaultShares: TAmount, isMax?: boolean) => Promise<string>,
    maxWithdraw: (address?: string) => Promise<string>,
    previewWithdraw: (assets: TAmount) => Promise<string>,
    withdraw: (assets: TAmount) => Promise<string>,
    maxRedeem: (address?: string) => Promise<string>,
    previewRedeem: (vaultShares: TAmount) => Promise<string>,
    redeem: (vaultShares: TAmount) => Promise<string>,
    convertToShares: (assets: TAmount) => Promise<string>,
    convertToAssets: (vaultShares: TAmount) => Promise<string>,
    stakeIsApproved: (vaultShares: number | string) => Promise<boolean>,
    stakeApprove: (vaultShares: number | string, isMax?: boolean) => Promise<string[]>,
    stake: (vaultShares: number | string, isMax?: boolean) => Promise<string>,
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
        depositApprove: (assets: TAmount, isMax?: boolean) => Promise<TGas>,
        deposit: (assets: TAmount) => Promise<TGas>,
        mintApprove: (assets: TAmount, isMax?: boolean) => Promise<TGas>,
        mint: (vaultShares: TAmount) => Promise<TGas>,
        withdraw: (assets: TAmount) => Promise<TGas>,
        redeem: (vaultShares: TAmount) => Promise<TGas>,
        stakeApprove: (vaultShares: number | string, isMax?: boolean) => Promise<TGas>,
        stake: (vaultShares: number | string) => Promise<TGas>,
        unstake: (vaultShares: number | string) => Promise<TGas>,
        claimCrv: () => Promise<TGas>,
        claimRewards: () => Promise<TGas>,
    }
}
