import { ethers, Networkish } from "ethers";
import { LendMarketTemplate, getLendMarket } from "./lendMarkets/index.js";
import { MintMarketTemplate, getMintMarket} from "./mintMarkets/index.js";
import { Llamalend } from "./llamalend.js";
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


export function createLlamalend() {
    const llamalend = new Llamalend();
    return {
        // Init and config
        async init(
            providerType: 'JsonRpc' | 'Web3' | 'Infura' | 'Alchemy',
            providerSettings: { url?: string, privateKey?: string, batchMaxCount? : number } | { externalProvider: ethers.Eip1193Provider } | { network?: Networkish, apiKey?: string },
            options: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number, chainId?: number } = {}
        ): Promise<void> {
            await llamalend.init(providerType, providerSettings, options);
        },

        setCustomFeeData(customFeeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number }): void {
            llamalend.setCustomFeeData(customFeeData);
        },

        get chainId(): number { return llamalend.chainId; },
        get signerAddress(): string { return llamalend.signerAddress; },

        // Market templates
        LendMarketTemplate,
        MintMarketTemplate,

        // Market constructors
        getLendMarket: getLendMarket.bind(llamalend),
        getMintMarket: getMintMarket.bind(llamalend),

        // Utility functions
        totalSupply: totalSupply.bind(llamalend),
        getLsdApy: getLsdApy.bind(llamalend),
        getBalances: getBalances.bind(llamalend),
        getAllowance: getAllowance.bind(llamalend),
        hasAllowance: hasAllowance.bind(llamalend),
        ensureAllowance: ensureAllowance.bind(llamalend),
        getUsdRate: getUsdRate.bind(llamalend),
        getGasPriceFromL1: getGasPriceFromL1.bind(llamalend),
        getGasPriceFromL2: getGasPriceFromL2.bind(llamalend),
        getGasInfoForL2: getGasInfoForL2.bind(llamalend),

        // Core methods
        fetchStats: llamalend.fetchStats.bind(llamalend),

        // Market lists
        mintMarkets: {
            getMarketList: llamalend.getMintMarketList.bind(llamalend),
        },
        lendMarkets: {
            fetchMarkets: llamalend.fetchLendMarkets.bind(llamalend),
            getMarketList: llamalend.getLendMarketList.bind(llamalend),
        },

        // Gas estimation
        estimateGas: {
            ensureAllowance: ensureAllowanceEstimateGas.bind(llamalend),
        },

        // st-crvUSD methods
        st_crvUSD: {
            convertToAssets: convertToAssets.bind(llamalend),
            convertToShares: convertToShares.bind(llamalend),
            userBalances: userBalances.bind(llamalend),
            totalSupplyAndCrvUSDLocked: totalSupplyAndCrvUSDLocked.bind(llamalend),
            maxDeposit: maxDeposit.bind(llamalend),
            previewDeposit: previewDeposit.bind(llamalend),
            depositIsApproved: depositIsApproved.bind(llamalend),
            depositAllowance: depositAllowance.bind(llamalend),
            depositApprove: depositApprove.bind(llamalend),
            deposit: deposit.bind(llamalend),
            maxMint: maxMint.bind(llamalend),
            previewMint: previewMint.bind(llamalend),
            mintIsApproved: mintIsApproved.bind(llamalend),
            mintAllowance: mintAllowance.bind(llamalend),
            mintApprove: mintApprove.bind(llamalend),
            mint: mint.bind(llamalend),
            maxWithdraw: maxWithdraw.bind(llamalend),
            previewWithdraw: previewWithdraw.bind(llamalend),
            withdraw: withdraw.bind(llamalend),
            maxRedeem: maxRedeem.bind(llamalend),
            previewRedeem: previewRedeem.bind(llamalend),
            redeem: redeem.bind(llamalend),
            estimateGas: {
                depositApprove: depositApproveEstimateGas.bind(llamalend),
                deposit: depositEstimateGas.bind(llamalend),
                mintApprove: mintApproveEstimateGas.bind(llamalend),
                mint: mintEstimateGas.bind(llamalend),
                withdraw: withdrawEstimateGas.bind(llamalend),
                redeem: redeemEstimateGas.bind(llamalend),
            },
        },
    };
}

export default createLlamalend();
