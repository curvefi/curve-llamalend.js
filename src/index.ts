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
    const _llamalend = new Llamalend();

    return {
        // Internal reference
        _llamalend,

        // Init and config
        async init(
            providerType: 'JsonRpc' | 'Web3' | 'Infura' | 'Alchemy',
            providerSettings: { url?: string, privateKey?: string, batchMaxCount? : number } | { externalProvider: ethers.Eip1193Provider } | { network?: Networkish, apiKey?: string },
            options: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number, chainId?: number } = {}
        ): Promise<void> {
            await _llamalend.init(providerType, providerSettings, options);
        },

        setCustomFeeData(customFeeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number }): void {
            _llamalend.setCustomFeeData(customFeeData);
        },

        get chainId(): number { return _llamalend.chainId; },
        get signerAddress(): string { return _llamalend.signerAddress; },

        // Market templates
        LendMarketTemplate,
        MintMarketTemplate,

        // Market constructors
        getLendMarket: getLendMarket.bind(_llamalend),
        getMintMarket: getMintMarket.bind(_llamalend),

        // Utility functions
        totalSupply: totalSupply.bind(_llamalend),
        getLsdApy: getLsdApy.bind(_llamalend),
        getBalances: getBalances.bind(_llamalend),
        getAllowance: getAllowance.bind(_llamalend),
        hasAllowance: hasAllowance.bind(_llamalend),
        ensureAllowance: ensureAllowance.bind(_llamalend),
        getUsdRate: getUsdRate.bind(_llamalend),
        getGasPriceFromL1: getGasPriceFromL1.bind(_llamalend),
        getGasPriceFromL2: getGasPriceFromL2.bind(_llamalend),
        getGasInfoForL2: getGasInfoForL2.bind(_llamalend),

        // Core methods
        fetchStats: _llamalend.fetchStats.bind(_llamalend),

        // Market lists
        mintMarkets: {
            getMarketList: _llamalend.getMintMarketList.bind(_llamalend),
        },
        lendMarkets: {
            fetchMarkets: _llamalend.fetchLendMarkets.bind(_llamalend),
            getMarketList: _llamalend.getLendMarketList.bind(_llamalend),
        },

        // Gas estimation
        estimateGas: {
            ensureAllowance: ensureAllowanceEstimateGas.bind(_llamalend),
        },

        // st-crvUSD methods
        st_crvUSD: {
            convertToAssets: convertToAssets.bind(_llamalend),
            convertToShares: convertToShares.bind(_llamalend),
            userBalances: userBalances.bind(_llamalend),
            totalSupplyAndCrvUSDLocked: totalSupplyAndCrvUSDLocked.bind(_llamalend),
            maxDeposit: maxDeposit.bind(_llamalend),
            previewDeposit: previewDeposit.bind(_llamalend),
            depositIsApproved: depositIsApproved.bind(_llamalend),
            depositAllowance: depositAllowance.bind(_llamalend),
            depositApprove: depositApprove.bind(_llamalend),
            deposit: deposit.bind(_llamalend),
            maxMint: maxMint.bind(_llamalend),
            previewMint: previewMint.bind(_llamalend),
            mintIsApproved: mintIsApproved.bind(_llamalend),
            mintAllowance: mintAllowance.bind(_llamalend),
            mintApprove: mintApprove.bind(_llamalend),
            mint: mint.bind(_llamalend),
            maxWithdraw: maxWithdraw.bind(_llamalend),
            previewWithdraw: previewWithdraw.bind(_llamalend),
            withdraw: withdraw.bind(_llamalend),
            maxRedeem: maxRedeem.bind(_llamalend),
            previewRedeem: previewRedeem.bind(_llamalend),
            redeem: redeem.bind(_llamalend),
            estimateGas: {
                depositApprove: depositApproveEstimateGas.bind(_llamalend),
                deposit: depositEstimateGas.bind(_llamalend),
                mintApprove: mintApproveEstimateGas.bind(_llamalend),
                mint: mintEstimateGas.bind(_llamalend),
                withdraw: withdrawEstimateGas.bind(_llamalend),
                redeem: redeemEstimateGas.bind(_llamalend),
            },
        },
    };
}

export default createLlamalend();
