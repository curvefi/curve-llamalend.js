import { ethers, Networkish } from "ethers";
import { OneWayMarketTemplate, getOneWayMarket } from "./markets/index.js";
import { lending as _lending } from "./lending.js";
import {
    getBalances,
    getAllowance,
    hasAllowance,
    ensureAllowanceEstimateGas,
    ensureAllowance,
    getUsdRate,
    getGasPriceFromL2,
    getGasInfoForL2,
    getGasPriceFromL1,
} from "./utils.js";
import {
    convertToAssets,
    convertToShares,
    userBalances,
    totalSupplyAndCrvUSDLocked,
    maxDeposit,
    previewDeposit,
    depositIsApproved,
    depositAllowance,
    depositApproveEstimateGas,
    depositApprove,
    depositEstimateGas,
    deposit,
    maxMint,
    previewMint,
    mintIsApproved,
    mintAllowance,
    mintApproveEstimateGas,
    mintApprove,
    mintEstimateGas,
    mint,
    maxWithdraw,
    previewWithdraw,
    withdrawEstimateGas,
    withdraw,
    maxRedeem,
    previewRedeem,
    redeemEstimateGas,
    redeem,
} from "./st-crvUSD.js";


async function init (
    providerType: 'JsonRpc' | 'Web3' | 'Infura' | 'Alchemy',
    providerSettings: { url?: string, privateKey?: string, batchMaxCount? : number } | { externalProvider: ethers.Eip1193Provider } | { network?: Networkish, apiKey?: string },
    options: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number, chainId?: number } = {}
): Promise<void> {
    await _lending.init(providerType, providerSettings, options);
    // @ts-ignore
    this.signerAddress = _lending.signerAddress;
    // @ts-ignore
    this.chainId = _lending.chainId;
}

function setCustomFeeData (customFeeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number }): void {
    _lending.setCustomFeeData(customFeeData);
}

const lending = {
    init,
    chainId: 0,
    signerAddress: '',
    OneWayMarketTemplate,
    getOneWayMarket,
    setCustomFeeData,
    getBalances,
    getAllowance,
    hasAllowance,
    ensureAllowance,
    getUsdRate,
    getGasPriceFromL1,
    getGasPriceFromL2,
    getGasInfoForL2,
    fetchStats: _lending.fetchStats,
    oneWayfactory: {
        fetchMarkets:  _lending.fetchOneWayMarkets,
        getMarketList: _lending.getOneWayMarketList,
    },
    estimateGas: {
        ensureAllowance: ensureAllowanceEstimateGas,
    },
    st_crvUSD: {
        convertToAssets,
        convertToShares,
        userBalances,
        totalSupplyAndCrvUSDLocked,
        maxDeposit,
        previewDeposit,
        depositIsApproved,
        depositAllowance,
        depositApprove,
        deposit,
        maxMint,
        previewMint,
        mintIsApproved,
        mintAllowance,
        mintApprove,
        mint,
        maxWithdraw,
        previewWithdraw,
        withdraw,
        maxRedeem,
        previewRedeem,
        redeem,
        estimateGas: {
            depositApprove: depositApproveEstimateGas,
            deposit: depositEstimateGas,
            mintApprove: mintApproveEstimateGas,
            mint: mintEstimateGas,
            withdraw: withdrawEstimateGas,
            redeem: redeemEstimateGas,
        },
    },
}

export default lending;
