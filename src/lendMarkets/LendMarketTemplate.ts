import type { Llamalend } from "../llamalend.js";
import {IDict, TGas, TAmount, IQuoteOdos, IOneWayMarket, IPartialFrac} from "../interfaces.js";
import {ILeverageZapV2} from "./interfaces/leverageZapV2.js";
import {LeverageZapV2Module} from "./modules/v1/leverageV1ZapV2";
import {VaultV1Module} from "./modules/v1/vaultV1";
import {IStatsV1, IWalletV1, IVaultV1} from "./interfaces/v1";


export class LendMarketTemplate {
    private llamalend: Llamalend;
    id: string;
    name: string
    addresses: {
        amm: string,
        controller: string,
        borrowed_token: string,
        collateral_token: string,
        monetary_policy: string,
        vault: string,
        gauge: string,
    };
    borrowed_token: {
        address: string;
        name: string;
        symbol: string;
        decimals: number;
    };
    collateral_token: {
        address: string;
        name: string;
        symbol: string;
        decimals: number;
    }
    coinAddresses: [string, string]
    coinDecimals: [number, number]
    defaultBands: number
    minBands: number
    maxBands: number
    swapDataCache: IDict<IQuoteOdos> = {}

    estimateGas: {
        createLoanApprove: (collateral: number | string) => Promise<TGas>,
        createLoan: (collateral: number | string, debt: number | string, range: number) => Promise<TGas>,
        borrowMoreApprove: (collateral: number | string) => Promise<TGas>,
        borrowMore: (collateral: number | string, debt: number | string) => Promise<TGas>,
        addCollateralApprove: (collateral: number | string) => Promise<TGas>,
        addCollateral: (collateral: number | string, address?: string) => Promise<TGas>,
        removeCollateral: (collateral: number | string) => Promise<TGas>,
        repayApprove: (debt: number | string) => Promise<TGas>,
        repay: (debt: number | string, address?: string) => Promise<TGas>,
        fullRepayApprove: (address?: string) => Promise<TGas>,
        fullRepay: (address?: string) => Promise<TGas>,
        swapApprove: (i: number, amount: number | string) => Promise<TGas>,
        swap: (i: number, j: number, amount: number | string, slippage?: number) => Promise<TGas>,
        liquidateApprove: (address: string) => Promise<TGas>,
        liquidate: (address: string, slippage?: number) => Promise<TGas>,
        selfLiquidateApprove: () => Promise<TGas>,
        selfLiquidate: (slippage?: number) => Promise<TGas>,
        partialSelfLiquidateApprove: (partialFrac: IPartialFrac) => Promise<TGas>,
        partialSelfLiquidate: (partialFrac: IPartialFrac, slippage?: number) => Promise<TGas>,
    };
    stats: IStatsV1;
    wallet: IWalletV1;
    leverage: {
        hasLeverage: () => boolean,

        maxLeverage: (N: number) => Promise<string>,

        createLoanMaxRecv: (userCollateral: TAmount, userBorrowed: TAmount, range: number) =>
            Promise<{
                maxDebt: string,
                maxTotalCollateral: string,
                userCollateral: string,
                collateralFromUserBorrowed: string,
                collateralFromMaxDebt: string,
                maxLeverage: string,
                avgPrice: string,
            }>,
        createLoanMaxRecvAllRanges: (userCollateral: TAmount, userBorrowed: TAmount) =>
            Promise<IDict<{
                maxDebt: string,
                maxTotalCollateral: string,
                userCollateral: string,
                collateralFromUserBorrowed: string,
                collateralFromMaxDebt: string,
                maxLeverage: string,
                avgPrice: string,
            }>>,
        createLoanExpectedCollateral: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, slippage?: number) =>
            Promise<{ totalCollateral: string, userCollateral: string, collateralFromUserBorrowed: string, collateralFromDebt: string, leverage: string, avgPrice: string }>,
        createLoanPriceImpact: (userBorrowed: TAmount, debt: TAmount) => Promise<string>,
        createLoanMaxRange: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount) => Promise<number>,
        createLoanBands: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number) => Promise<[number, number]>,
        createLoanBandsAllRanges: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount) => Promise<IDict<[number, number] | null>>,
        createLoanPrices: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number) => Promise<string[]>,
        createLoanPricesAllRanges: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount) => Promise<IDict<[string, string] | null>>,
        createLoanHealth: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, full?: boolean) => Promise<string>,
        createLoanIsApproved: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<boolean>,
        createLoanApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<string[]>,
        createLoanRouteImage: (userBorrowed: TAmount, debt: TAmount) => Promise<string>,
        createLoan: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, slippage?: number) => Promise<string>,

        borrowMoreMaxRecv: (userCollateral: TAmount, userBorrowed: TAmount, address?: string) =>
            Promise<{
                maxDebt: string,
                maxTotalCollateral: string,
                userCollateral: string,
                collateralFromUserBorrowed: string,
                collateralFromMaxDebt: string,
                avgPrice: string,
            }>,
        borrowMoreExpectedCollateral: (userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, slippage?: number, address?: string) =>
            Promise<{ totalCollateral: string, userCollateral: string, collateralFromUserBorrowed: string, collateralFromDebt: string, avgPrice: string }>,
        borrowMorePriceImpact: (userBorrowed: TAmount, dDebt: TAmount, address?: string) => Promise<string>,
        borrowMoreBands: (userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, address?: string) => Promise<[number, number]>,
        borrowMorePrices: (userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, address?: string) => Promise<string[]>,
        borrowMoreHealth: (userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, full?: boolean, address?: string) => Promise<string>,
        borrowMoreIsApproved: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<boolean>,
        borrowMoreApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<string[]>,
        borrowMoreRouteImage: (userBorrowed: TAmount, debt: TAmount) => Promise<string>,
        borrowMore: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, slippage?: number) => Promise<string>,

        repayExpectedBorrowed: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, slippage?: number) =>
            Promise<{ totalBorrowed: string, borrowedFromStateCollateral: string, borrowedFromUserCollateral: string, userBorrowed: string, avgPrice: string }>,
        repayPriceImpact: (stateCollateral: TAmount, userCollateral: TAmount) => Promise<string>,
        repayIsFull: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address?: string) => Promise<boolean>,
        repayIsAvailable: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address?: string) => Promise<boolean>,
        repayBands: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address?: string) => Promise<[number, number]>,
        repayPrices: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address?: string) => Promise<string[]>,
        repayHealth: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, full?: boolean, address?: string) => Promise<string>,
        repayIsApproved: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<boolean>,
        repayApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<string[]>,
        repayRouteImage: (stateCollateral: TAmount, userCollateral: TAmount) => Promise<string>,
        repay: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, slippage?: number) => Promise<string>,

        estimateGas: {
            createLoanApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<TGas>,
            createLoan: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, slippage?: number) => Promise<number>,

            borrowMoreApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<TGas>,
            borrowMore: (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, slippage?: number) => Promise<number>,

            repayApprove: (userCollateral: TAmount, userBorrowed: TAmount) => Promise<TGas>,
            repay: (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, slippage?: number) => Promise<number>,
        }
    };
    leverageZapV2: ILeverageZapV2;
    vault: IVaultV1;

    constructor(id: string, marketData: IOneWayMarket, llamalend: Llamalend) {
        this.llamalend = llamalend;
        this.id = id;
        this.name = marketData.name;
        this.addresses = marketData.addresses;
        this.borrowed_token = marketData.borrowed_token;
        this.collateral_token = marketData.collateral_token;
        this.coinDecimals = [this.borrowed_token.decimals, this.collateral_token.decimals]
        this.coinAddresses = [this.borrowed_token.address, this.collateral_token.address]
        this.defaultBands = 10
        this.minBands = 4
        this.maxBands = 50
        this.estimateGas = {
            createLoanApprove: this.createLoanApproveEstimateGas.bind(this),
            createLoan: this.createLoanEstimateGas.bind(this),
            borrowMoreApprove: this.borrowMoreApproveEstimateGas.bind(this),
            borrowMore: this.borrowMoreEstimateGas.bind(this),
            addCollateralApprove: this.addCollateralApproveEstimateGas.bind(this),
            addCollateral: this.addCollateralEstimateGas.bind(this),
            removeCollateral: this.removeCollateralEstimateGas.bind(this),
            repayApprove: this.repayApproveEstimateGas.bind(this),
            repay: this.repayEstimateGas.bind(this),
            fullRepayApprove: this.fullRepayApproveEstimateGas.bind(this),
            fullRepay: this.fullRepayEstimateGas.bind(this),
            swapApprove: this.swapApproveEstimateGas.bind(this),
            swap: this.swapEstimateGas.bind(this),
            liquidateApprove: this.liquidateApproveEstimateGas.bind(this),
            liquidate: this.liquidateEstimateGas.bind(this),
            selfLiquidateApprove: this.selfLiquidateApproveEstimateGas.bind(this),
            selfLiquidate: this.selfLiquidateEstimateGas.bind(this),
            partialSelfLiquidateApprove: this.partialSelfLiquidateApproveEstimateGas.bind(this),
            partialSelfLiquidate: this.partialSelfLiquidateEstimateGas.bind(this),
        }
        this.stats = {
            parameters: this.statsParameters.bind(this),
            rates: this.statsRates.bind(this),
            futureRates: this.statsFutureRates.bind(this),
            balances: this.statsBalances.bind(this),
            bandsInfo: this.statsBandsInfo.bind(this),
            bandBalances: this.statsBandBalances.bind(this),
            bandsBalances: this.statsBandsBalances.bind(this),
            totalDebt: this.statsTotalDebt.bind(this),
            ammBalances: this.statsAmmBalances.bind(this),
            capAndAvailable: this.statsCapAndAvailable.bind(this),
        }
        this.wallet = {
            balances: this.walletBalances.bind(this),
        }
        const vault = new VaultV1Module(this)

        this.vault = {
            maxDeposit: vault.vaultMaxDeposit.bind(vault),
            previewDeposit: vault.vaultPreviewDeposit.bind(vault),
            depositIsApproved: vault.vaultDepositIsApproved.bind(vault),
            depositApprove: vault.vaultDepositApprove.bind(vault),
            deposit: vault.vaultDeposit.bind(vault),
            maxMint: vault.vaultMaxMint.bind(vault),
            previewMint: vault.vaultPreviewMint.bind(vault),
            mintIsApproved: vault.vaultMintIsApproved.bind(vault),
            mintApprove: vault.vaultMintApprove.bind(vault),
            mint: vault.vaultMint.bind(vault),
            maxWithdraw: vault.vaultMaxWithdraw.bind(vault),
            previewWithdraw: vault.vaultPreviewWithdraw.bind(vault),
            withdraw: vault.vaultWithdraw.bind(vault),
            maxRedeem: vault.vaultMaxRedeem.bind(vault),
            previewRedeem: vault.vaultPreviewRedeem.bind(vault),
            redeem: vault.vaultRedeem.bind(vault),
            convertToShares: vault.vaultConvertToShares.bind(vault),
            convertToAssets: vault.vaultConvertToAssets.bind(vault),
            stakeIsApproved: vault.vaultStakeIsApproved.bind(vault),
            stakeApprove: vault.vaultStakeApprove.bind(vault),
            stake: vault.vaultStake.bind(vault),
            unstake: vault.vaultUnstake.bind(vault),
            rewardsOnly: vault.vaultRewardsOnly.bind(vault),
            totalLiquidity: vault.vaultTotalLiquidity.bind(vault),
            crvApr: vault.vaultCrvApr.bind(vault),
            claimableCrv: vault.vaultClaimableCrv.bind(vault),
            claimCrv: vault.vaultClaimCrv.bind(vault),
            rewardTokens: vault.vaultRewardTokens.bind(vault),
            rewardsApr: vault.vaultRewardsApr.bind(vault),
            claimableRewards: vault.vaultClaimableRewards.bind(vault),
            claimRewards: vault.vaultClaimRewards.bind(vault),
            estimateGas: {
                depositApprove: vault.vaultDepositApproveEstimateGas.bind(vault),
                deposit: vault.vaultDepositEstimateGas.bind(vault),
                mintApprove: vault.vaultMintApproveEstimateGas.bind(vault),
                mint: vault.vaultMintEstimateGas.bind(vault),
                withdraw: vault.vaultWithdrawEstimateGas.bind(vault),
                redeem: vault.vaultRedeemEstimateGas.bind(vault),
                stakeApprove: vault.vaultStakeApproveEstimateGas.bind(vault),
                stake: vault.vaultStakeEstimateGas.bind(vault),
                unstake: vault.vaultUnstakeEstimateGas.bind(vault),
                claimCrv: vault.vaultClaimCrvEstimateGas.bind(vault),
                claimRewards: vault.vaultClaimRewardsEstimateGas.bind(vault),
            },
        }
        this.leverage = {
            hasLeverage: this.hasLeverage.bind(this),

            maxLeverage: this.maxLeverage.bind(this),

            createLoanMaxRecv: this.leverageCreateLoanMaxRecv.bind(this),
            createLoanMaxRecvAllRanges: this.leverageCreateLoanMaxRecvAllRanges.bind(this),
            createLoanExpectedCollateral: this.leverageCreateLoanExpectedCollateral.bind(this),
            createLoanPriceImpact: this.leverageCreateLoanPriceImpact.bind(this),
            createLoanMaxRange: this.leverageCreateLoanMaxRange.bind(this),
            createLoanBands: this.leverageCreateLoanBands.bind(this),
            createLoanBandsAllRanges: this.leverageCreateLoanBandsAllRanges.bind(this),
            createLoanPrices: this.leverageCreateLoanPrices.bind(this),
            createLoanPricesAllRanges: this.leverageCreateLoanPricesAllRanges.bind(this),
            createLoanHealth: this.leverageCreateLoanHealth.bind(this),
            createLoanIsApproved: this.leverageCreateLoanIsApproved.bind(this),
            createLoanApprove: this.leverageCreateLoanApprove.bind(this),
            createLoanRouteImage: this.leverageCreateLoanRouteImage.bind(this),
            createLoan: this.leverageCreateLoan.bind(this),

            borrowMoreMaxRecv: this.leverageBorrowMoreMaxRecv.bind(this),
            borrowMoreExpectedCollateral: this.leverageBorrowMoreExpectedCollateral.bind(this),
            borrowMorePriceImpact: this.leverageBorrowMorePriceImpact.bind(this),
            borrowMoreBands: this.leverageBorrowMoreBands.bind(this),
            borrowMorePrices: this.leverageBorrowMorePrices.bind(this),
            borrowMoreHealth: this.leverageBorrowMoreHealth.bind(this),
            borrowMoreIsApproved: this.leverageCreateLoanIsApproved.bind(this),
            borrowMoreApprove: this.leverageCreateLoanApprove.bind(this),
            borrowMoreRouteImage: this.leverageBorrowMoreRouteImage.bind(this),
            borrowMore: this.leverageBorrowMore.bind(this),

            repayExpectedBorrowed: this.leverageRepayExpectedBorrowed.bind(this),
            repayPriceImpact: this.leverageRepayPriceImpact.bind(this),
            repayIsFull: this.leverageRepayIsFull.bind(this),
            repayIsAvailable: this.leverageRepayIsAvailable.bind(this),
            repayBands: this.leverageRepayBands.bind(this),
            repayPrices: this.leverageRepayPrices.bind(this),
            repayHealth: this.leverageRepayHealth.bind(this),
            repayIsApproved: this.leverageRepayIsApproved.bind(this),
            repayApprove: this.leverageRepayApprove.bind(this),
            repayRouteImage: this.leverageRepayRouteImage.bind(this),
            repay: this.leverageRepay.bind(this),

            estimateGas: {
                createLoanApprove: this.leverageCreateLoanApproveEstimateGas.bind(this),
                createLoan: this.leverageCreateLoanEstimateGas.bind(this),

                borrowMoreApprove: this.leverageCreateLoanApproveEstimateGas.bind(this),
                borrowMore: this.leverageBorrowMoreEstimateGas.bind(this),

                repayApprove: this.leverageRepayApproveEstimateGas.bind(this),
                repay: this.leverageRepayEstimateGas.bind(this),
            },
        }

        const leverageZapV2 = new LeverageZapV2Module(this);

        this.leverageZapV2 = {
            hasLeverage: leverageZapV2.hasLeverage.bind(leverageZapV2),

            maxLeverage: leverageZapV2.maxLeverage.bind(leverageZapV2),

            createLoanMaxRecv: leverageZapV2.leverageCreateLoanMaxRecv.bind(leverageZapV2),
            createLoanMaxRecvAllRanges: leverageZapV2.leverageCreateLoanMaxRecvAllRanges.bind(leverageZapV2),
            createLoanExpectedCollateral: leverageZapV2.leverageCreateLoanExpectedCollateral.bind(leverageZapV2),
            createLoanMaxRange: leverageZapV2.leverageCreateLoanMaxRange.bind(leverageZapV2),
            createLoanBandsAllRanges: leverageZapV2.leverageCreateLoanBandsAllRanges.bind(leverageZapV2),
            createLoanPricesAllRanges: leverageZapV2.leverageCreateLoanPricesAllRanges.bind(leverageZapV2),
            createLoanIsApproved: leverageZapV2.leverageCreateLoanIsApproved.bind(leverageZapV2),
            createLoanApprove: leverageZapV2.leverageCreateLoanApprove.bind(leverageZapV2),
            createLoanExpectedMetrics: leverageZapV2.leverageCreateLoanExpectedMetrics.bind(leverageZapV2),
            createLoan: leverageZapV2.leverageCreateLoan.bind(leverageZapV2),

            borrowMoreMaxRecv: leverageZapV2.leverageBorrowMoreMaxRecv.bind(leverageZapV2),
            borrowMoreExpectedCollateral: leverageZapV2.leverageBorrowMoreExpectedCollateral.bind(leverageZapV2),
            borrowMoreIsApproved: leverageZapV2.leverageCreateLoanIsApproved.bind(leverageZapV2),
            borrowMoreApprove: leverageZapV2.leverageCreateLoanApprove.bind(leverageZapV2),
            borrowMoreExpectedMetrics: leverageZapV2.leverageBorrowMoreExpectedMetrics.bind(leverageZapV2),
            borrowMore: leverageZapV2.leverageBorrowMore.bind(leverageZapV2),

            repayExpectedBorrowed: leverageZapV2.leverageRepayExpectedBorrowed.bind(leverageZapV2),
            repayIsFull: leverageZapV2.leverageRepayIsFull.bind(leverageZapV2),
            repayIsAvailable: leverageZapV2.leverageRepayIsAvailable.bind(leverageZapV2),
            repayExpectedMetrics: leverageZapV2.leverageRepayExpectedMetrics.bind(leverageZapV2),
            repayIsApproved: leverageZapV2.leverageRepayIsApproved.bind(leverageZapV2),
            repayApprove: leverageZapV2.leverageRepayApprove.bind(leverageZapV2),
            repay: leverageZapV2.leverageRepay.bind(leverageZapV2),

            estimateGas: {
                createLoanApprove: leverageZapV2.leverageCreateLoanApproveEstimateGas.bind(leverageZapV2),
                createLoan: leverageZapV2.leverageCreateLoanEstimateGas.bind(leverageZapV2),

                borrowMoreApprove: leverageZapV2.leverageCreateLoanApproveEstimateGas.bind(leverageZapV2),
                borrowMore: leverageZapV2.leverageBorrowMoreEstimateGas.bind(leverageZapV2),

                repayApprove: leverageZapV2.leverageRepayApproveEstimateGas.bind(leverageZapV2),
                repay: leverageZapV2.leverageRepayEstimateGas.bind(leverageZapV2),
            },
        }

    }

    public getLlamalend(): Llamalend {
        return this.llamalend;
    }
}