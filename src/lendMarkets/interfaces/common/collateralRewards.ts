import { TGas } from "../../../interfaces";

export interface ICollateralRewards {
    callbackAddress: () => Promise<string>,
    isCollateralRewardEnable: () => Promise<boolean>,
    isCallbackKilled: () => Promise<boolean | null>,
    isCallbackRegistered: () => Promise<boolean | null>,
    stats: () => Promise<{ crvApr: number, crvApy: number }>,
    totalCollateral: () => Promise<string>,
    userCollateral: (address?: string) => Promise<string>,
    claimableCrv: (address?: string) => Promise<string>,
    claimCrv: () => Promise<string>,
    estimateGas: {
        claimCrv: () => Promise<TGas>,
    }
}
