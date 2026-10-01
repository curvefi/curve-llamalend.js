import { TGas } from "../../../interfaces";

export interface ICollateralRewards {
    callbackAddress: () => Promise<string>,
    isCollateralRewardEnable: () => Promise<boolean>,
    totalCollateral: () => Promise<string>,
    userCollateral: (address?: string) => Promise<string>,
    claimableCrv: (address?: string) => Promise<string>,
    claimCrv: () => Promise<string>,
    estimateGas: {
        claimCrv: () => Promise<TGas>,
    }
}
