import {IReward, TAmount, TGas} from "../../../interfaces";

export interface IVault {
    maxDeposit: (address?: string) => Promise<string>,
    previewDeposit: (borrowed: TAmount) => Promise<string>,
    depositIsApproved: (borrowed: TAmount) => Promise<boolean>
    depositApprove: (borrowed: TAmount) => Promise<string[]>
    deposit: (borrowed: TAmount) => Promise<string>,
    maxMint: (address?: string) => Promise<string>,
    previewMint: (shares: TAmount) => Promise<string>,
    mintIsApproved: (borrowed: TAmount) => Promise<boolean>
    mintApprove: (borrowed: TAmount) => Promise<string[]>
    mint: (shares: TAmount) => Promise<string>,
    maxWithdraw: (address?: string) => Promise<string>,
    previewWithdraw: (borrowed: TAmount) => Promise<string>,
    withdraw: (borrowed: TAmount) => Promise<string>,
    maxRedeem: (address?: string) => Promise<string>,
    previewRedeem: (shares: TAmount) => Promise<string>,
    redeem: (shares: TAmount) => Promise<string>,
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
        depositApprove: (borrowed: TAmount) => Promise<TGas>,
        deposit: (borrowed: TAmount) => Promise<TGas>,
        mintApprove: (borrowed: TAmount) => Promise<TGas>,
        mint: (shares: TAmount) => Promise<TGas>,
        withdraw: (borrowed: TAmount) => Promise<TGas>,
        redeem: (shares: TAmount) => Promise<TGas>,
        stakeApprove: (vaultShares: number | string) => Promise<TGas>,
        stake: (vaultShares: number | string) => Promise<TGas>,
        unstake: (vaultShares: number | string) => Promise<TGas>,
        claimCrv: () => Promise<TGas>,
        claimRewards: () => Promise<TGas>,
    }
}