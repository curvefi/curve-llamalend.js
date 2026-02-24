import type { Llamalend } from "../llamalend.js";
import {IDict, IQuoteOdos, IOneWayMarket} from "../interfaces.js";
import {ILeverageZapV2} from "./interfaces/leverageZapV2.js";
import {IStatsV1, IWalletV1, IVaultV1, IPricesV1, ILoanV1, IUserPositionV1, ILeverageV1, IAmmV1} from "./interfaces/v1";
import {
    LeverageZapV1Module,
    LeverageZapV2Module,
    VaultV1Module,
    WalletV1Module,
    StatsV1Module,
    UserPositionV1Module,
    PricesV1Module,
    LoanV1Module,
    AmmV1Module,
} from "./modules/v1";


export class LendMarketTemplate {
    private llamalend: Llamalend;
    id: string;
    name: string;
    version: 'v1' | 'v2';
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

    stats: IStatsV1;
    wallet: IWalletV1;
    prices: IPricesV1;
    loan: ILoanV1;
    amm: IAmmV1;
    userPosition: IUserPositionV1;
    leverage: ILeverageV1;
    leverageZapV2: ILeverageZapV2;
    vault: IVaultV1;

    constructor(id: string, marketData: IOneWayMarket, llamalend: Llamalend) {
        this.llamalend = llamalend;
        this.version = marketData.version || 'v1';
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
        
        const loan = new LoanV1Module(this)
        
        const userPosition = new UserPositionV1Module(this);
        this.userPosition = {
            userLoanExists: userPosition.userLoanExists.bind(userPosition),
            userStateBigInt: userPosition.userStateBigInt.bind(userPosition),
            userState: userPosition.userState.bind(userPosition),
            userHealth: userPosition.userHealth.bind(userPosition),
            userBandsBigInt: userPosition.userBandsBigInt.bind(userPosition),
            userBands: userPosition.userBands.bind(userPosition),
            userRange: userPosition.userRange.bind(userPosition),
            userPrices: userPosition.userPrices.bind(userPosition),
            userLoss: userPosition.userLoss.bind(userPosition),
            userBandsBalances: userPosition.userBandsBalances.bind(userPosition),
            currentLeverage: userPosition.currentLeverage.bind(userPosition),
            currentPnL: userPosition.currentPnL.bind(userPosition),
            userBoost: userPosition.userBoost.bind(userPosition),
            forceUpdateUserState: userPosition.forceUpdateUserState.bind(userPosition),
        }

        const stats = new StatsV1Module(this)
        this.stats = {
            parameters: stats.statsParameters.bind(this),
            rates: stats.statsRates.bind(this),
            futureRates: stats.statsFutureRates.bind(this),
            balances: stats.statsBalances.bind(this),
            bandsInfo: stats.statsBandsInfo.bind(this),
            bandBalances: stats.statsBandBalances.bind(this),
            bandsBalances: stats.statsBandsBalances.bind(this),
            totalDebt: stats.statsTotalDebt.bind(this),
            ammBalances: stats.statsAmmBalances.bind(this),
            capAndAvailable: stats.statsCapAndAvailable.bind(this),
        }

        const wallet = new WalletV1Module(this)
        this.wallet = {
            balances: wallet.balances.bind(this),
        }

        const prices = new PricesV1Module(this)
        this.prices = {
            A: prices.A.bind(prices),
            basePrice: prices.basePrice.bind(prices),
            oraclePrice: prices.oraclePrice.bind(prices),
            oraclePriceBand: prices.oraclePriceBand.bind(prices),
            price: prices.price.bind(prices),
            calcTickPrice: prices.calcTickPrice.bind(prices),
            calcBandPrices: prices.calcBandPrices.bind(prices),
            calcRangePct: prices.calcRangePct.bind(prices),
            getPrices: prices.getPrices.bind(prices),
            calcPrices: prices.getPrices.bind(prices),
            checkRange: prices.checkRange.bind(prices),
        }

        const amm = new AmmV1Module(this)

        this.amm = {
            maxSwappable: amm.maxSwappable.bind(amm),
            swapExpected: amm.swapExpected.bind(amm),
            swapRequired: amm.swapRequired.bind(amm),
            swapPriceImpact: amm.swapPriceImpact.bind(amm),
            swapIsApproved: amm.swapIsApproved.bind(amm),
            swapApprove: amm.swapApprove.bind(amm),
            swap: amm.swap.bind(amm),
        }

        this.loan = {
            createLoanMaxRecv: loan.createLoanMaxRecv.bind(loan),
            createLoanMaxRecvAllRanges: loan.createLoanMaxRecvAllRanges.bind(loan),
            getMaxRange: loan.getMaxRange.bind(loan),
            createLoanBands: loan.createLoanBands.bind(loan),
            createLoanBandsAllRanges: loan.createLoanBandsAllRanges.bind(loan),
            createLoanPrices: loan.createLoanPrices.bind(loan),
            createLoanPricesAllRanges: loan.createLoanPricesAllRanges.bind(loan),
            createLoanHealth: loan.createLoanHealth.bind(loan),
            createLoanIsApproved: loan.createLoanIsApproved.bind(loan),
            createLoanApprove: loan.createLoanApprove.bind(loan),
            createLoan: loan.createLoan.bind(loan),

            borrowMoreMaxRecv: loan.borrowMoreMaxRecv.bind(loan),
            borrowMoreBands: loan.borrowMoreBands.bind(loan),
            borrowMorePrices: loan.borrowMorePrices.bind(loan),
            borrowMoreHealth: loan.borrowMoreHealth.bind(loan),
            borrowMoreIsApproved: loan.borrowMoreIsApproved.bind(loan),
            borrowMoreApprove: loan.borrowMoreApprove.bind(loan),
            borrowMore: loan.borrowMore.bind(loan),

            addCollateralBands: loan.addCollateralBands.bind(loan),
            addCollateralPrices: loan.addCollateralPrices.bind(loan),
            addCollateralHealth: loan.addCollateralHealth.bind(loan),
            addCollateralIsApproved: loan.addCollateralIsApproved.bind(loan),
            addCollateralApprove: loan.addCollateralApprove.bind(loan),
            addCollateral: loan.addCollateral.bind(loan),
            addCollateralFutureLeverage: loan.addCollateralFutureLeverage.bind(loan),

            maxRemovable: loan.maxRemovable.bind(loan),
            removeCollateralBands: loan.removeCollateralBands.bind(loan),
            removeCollateralPrices: loan.removeCollateralPrices.bind(loan),
            removeCollateralHealth: loan.removeCollateralHealth.bind(loan),
            removeCollateral: loan.removeCollateral.bind(loan),
            removeCollateralFutureLeverage: loan.removeCollateralFutureLeverage.bind(loan),

            repayBands: loan.repayBands.bind(loan),
            repayPrices: loan.repayPrices.bind(loan),
            repayIsApproved: loan.repayIsApproved.bind(loan),
            repayApprove: loan.repayApprove.bind(loan),
            repayHealth: loan.repayHealth.bind(loan),
            repay: loan.repay.bind(loan),

            fullRepayIsApproved: loan.fullRepayIsApproved.bind(loan),
            fullRepayApprove: loan.fullRepayApprove.bind(loan),
            fullRepay: loan.fullRepay.bind(loan),

            tokensToLiquidate: loan.tokensToLiquidate.bind(loan),
            calcPartialFrac: loan.calcPartialFrac.bind(loan),
            liquidateIsApproved: loan.liquidateIsApproved.bind(loan),
            liquidateApprove: loan.liquidateApprove.bind(loan),
            liquidate: loan.liquidate.bind(loan),

            selfLiquidateIsApproved: loan.selfLiquidateIsApproved.bind(loan),
            selfLiquidateApprove: loan.selfLiquidateApprove.bind(loan),
            selfLiquidate: loan.selfLiquidate.bind(loan),

            partialSelfLiquidateIsApproved: loan.partialSelfLiquidateIsApproved.bind(loan),
            partialSelfLiquidateApprove: loan.partialSelfLiquidateApprove.bind(loan),
            partialSelfLiquidate: loan.partialSelfLiquidate.bind(loan),

            estimateGas: {
                createLoan: loan.createLoanEstimateGas.bind(loan),
                borrowMore: loan.borrowMoreEstimateGas.bind(loan),
                addCollateral: loan.addCollateralEstimateGas.bind(loan),
                removeCollateral: loan.removeCollateralEstimateGas.bind(loan),
                repay: loan.repayEstimateGas.bind(loan),
                fullRepay: loan.fullRepayEstimateGas.bind(loan),
                liquidate: loan.liquidateEstimateGas.bind(loan),
                selfLiquidate: loan.selfLiquidateEstimateGas.bind(loan),
                partialSelfLiquidate: loan.partialSelfLiquidateEstimateGas.bind(loan),
            },
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

        const leverageZapV1 = new LeverageZapV1Module(this);
        this.leverage = {
            hasLeverage: leverageZapV1.hasLeverage.bind(leverageZapV1),

            maxLeverage: leverageZapV1.maxLeverage.bind(leverageZapV1),

            createLoanMaxRecv: leverageZapV1.leverageCreateLoanMaxRecv.bind(leverageZapV1),
            createLoanMaxRecvAllRanges: leverageZapV1.leverageCreateLoanMaxRecvAllRanges.bind(leverageZapV1),
            createLoanExpectedCollateral: leverageZapV1.leverageCreateLoanExpectedCollateral.bind(leverageZapV1),
            createLoanPriceImpact: leverageZapV1.leverageCreateLoanPriceImpact.bind(leverageZapV1),
            createLoanMaxRange: leverageZapV1.leverageCreateLoanMaxRange.bind(leverageZapV1),
            createLoanBands: leverageZapV1.leverageCreateLoanBands.bind(leverageZapV1),
            createLoanBandsAllRanges: leverageZapV1.leverageCreateLoanBandsAllRanges.bind(leverageZapV1),
            createLoanPrices: leverageZapV1.leverageCreateLoanPrices.bind(leverageZapV1),
            createLoanPricesAllRanges: leverageZapV1.leverageCreateLoanPricesAllRanges.bind(leverageZapV1),
            createLoanHealth: leverageZapV1.leverageCreateLoanHealth.bind(leverageZapV1),
            createLoanIsApproved: leverageZapV1.leverageCreateLoanIsApproved.bind(leverageZapV1),
            createLoanApprove: leverageZapV1.leverageCreateLoanApprove.bind(leverageZapV1),
            createLoanRouteImage: leverageZapV1.leverageCreateLoanRouteImage.bind(leverageZapV1),
            createLoan: leverageZapV1.leverageCreateLoan.bind(leverageZapV1),

            borrowMoreMaxRecv: leverageZapV1.leverageBorrowMoreMaxRecv.bind(leverageZapV1),
            borrowMoreExpectedCollateral: leverageZapV1.leverageBorrowMoreExpectedCollateral.bind(leverageZapV1),
            borrowMorePriceImpact: leverageZapV1.leverageBorrowMorePriceImpact.bind(leverageZapV1),
            borrowMoreBands: leverageZapV1.leverageBorrowMoreBands.bind(leverageZapV1),
            borrowMorePrices: leverageZapV1.leverageBorrowMorePrices.bind(leverageZapV1),
            borrowMoreHealth: leverageZapV1.leverageBorrowMoreHealth.bind(leverageZapV1),
            borrowMoreIsApproved: leverageZapV1.leverageCreateLoanIsApproved.bind(leverageZapV1),
            borrowMoreApprove: leverageZapV1.leverageCreateLoanApprove.bind(leverageZapV1),
            borrowMoreRouteImage: leverageZapV1.leverageBorrowMoreRouteImage.bind(leverageZapV1),
            borrowMore: leverageZapV1.leverageBorrowMore.bind(leverageZapV1),

            repayExpectedBorrowed: leverageZapV1.leverageRepayExpectedBorrowed.bind(leverageZapV1),
            repayPriceImpact: leverageZapV1.leverageRepayPriceImpact.bind(leverageZapV1),
            repayIsFull: leverageZapV1.leverageRepayIsFull.bind(leverageZapV1),
            repayIsAvailable: leverageZapV1.leverageRepayIsAvailable.bind(leverageZapV1),
            repayBands: leverageZapV1.leverageRepayBands.bind(leverageZapV1),
            repayPrices: leverageZapV1.leverageRepayPrices.bind(leverageZapV1),
            repayHealth: leverageZapV1.leverageRepayHealth.bind(leverageZapV1),
            repayIsApproved: leverageZapV1.leverageRepayIsApproved.bind(leverageZapV1),
            repayApprove: leverageZapV1.leverageRepayApprove.bind(leverageZapV1),
            repayRouteImage: leverageZapV1.leverageRepayRouteImage.bind(leverageZapV1),
            repay: leverageZapV1.leverageRepay.bind(leverageZapV1),

            estimateGas: {
                createLoanApprove: leverageZapV1.leverageCreateLoanApproveEstimateGas.bind(leverageZapV1),
                createLoan: leverageZapV1.leverageCreateLoanEstimateGas.bind(leverageZapV1),

                borrowMoreApprove: leverageZapV1.leverageCreateLoanApproveEstimateGas.bind(leverageZapV1),
                borrowMore: leverageZapV1.leverageBorrowMoreEstimateGas.bind(leverageZapV1),

                repayApprove: leverageZapV1.leverageRepayApproveEstimateGas.bind(leverageZapV1),
                repay: leverageZapV1.leverageRepayEstimateGas.bind(leverageZapV1),
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
            calcMinRecv: leverageZapV2.calcMinRecv.bind(leverageZapV2),
            createLoan: leverageZapV2.leverageCreateLoan.bind(leverageZapV2),

            borrowMoreMaxRecv: leverageZapV2.leverageBorrowMoreMaxRecv.bind(leverageZapV2),
            borrowMoreExpectedCollateral: leverageZapV2.leverageBorrowMoreExpectedCollateral.bind(leverageZapV2),
            borrowMoreIsApproved: leverageZapV2.leverageCreateLoanIsApproved.bind(leverageZapV2),
            borrowMoreApprove: leverageZapV2.leverageCreateLoanApprove.bind(leverageZapV2),
            borrowMoreExpectedMetrics: leverageZapV2.leverageBorrowMoreExpectedMetrics.bind(leverageZapV2),
            borrowMore: leverageZapV2.leverageBorrowMore.bind(leverageZapV2),
            borrowMoreFutureLeverage: leverageZapV2.leverageBorrowMoreFutureLeverage.bind(leverageZapV2),

            repayExpectedBorrowed: leverageZapV2.leverageRepayExpectedBorrowed.bind(leverageZapV2),
            repayIsFull: leverageZapV2.leverageRepayIsFull.bind(leverageZapV2),
            repayIsAvailable: leverageZapV2.leverageRepayIsAvailable.bind(leverageZapV2),
            repayExpectedMetrics: leverageZapV2.leverageRepayExpectedMetrics.bind(leverageZapV2),
            repayIsApproved: leverageZapV2.leverageRepayIsApproved.bind(leverageZapV2),
            repayApprove: leverageZapV2.leverageRepayApprove.bind(leverageZapV2),
            repay: leverageZapV2.leverageRepay.bind(leverageZapV2),
            repayFutureLeverage: leverageZapV2.leverageRepayFutureLeverage.bind(leverageZapV2),

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