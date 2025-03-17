import { ethers, Networkish } from "ethers";
import { LendMarketTemplate, getLendMarket } from "./lendMarkets/index.js";
import { MintMarketTemplate, getMintMarket} from "./mintMarkets/index.js";
import { llamalend as _llamalend} from "./llamalend.js";
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
    totalSupply,
    getLsdApy,
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
    await _llamalend.init(providerType, providerSettings, options);
    // @ts-ignore
    this.signerAddress = _llamalend.signerAddress;
    // @ts-ignore
    this.chainId = _llamalend.chainId;
}

function setCustomFeeData (customFeeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number }): void {
    _llamalend.setCustomFeeData(customFeeData);
}

const llamalend = {
    init,
    chainId: 0,
    signerAddress: '',
    LendMarketTemplate,
    getLendMarket,
    MintMarketTemplate,
    getMintMarket,
    totalSupply,
    getLsdApy,
    setCustomFeeData,
    getBalances,
    getAllowance,
    hasAllowance,
    ensureAllowance,
    getUsdRate,
    getGasPriceFromL1,
    getGasPriceFromL2,
    getGasInfoForL2,
    fetchStats: _llamalend.fetchStats,
    getLlammaList: _llamalend.getMintMarketList,
    lendMarkets: {
        fetchMarkets:  _llamalend.fetchLendMarkets,
        getMarketList: _llamalend.getLendMarketList,
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

export default llamalend;
