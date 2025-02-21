import memoize from "memoizee";
import BigNumber from "bignumber.js";
import { llamalend } from "../lending.js";
import {
    _getAddress,
    parseUnits,
    BN,
    toBN,
    fromBN,
    getBalances,
    _ensureAllowance,
    ensureAllowance,
    hasAllowance,
    ensureAllowanceEstimateGas,
    _cutZeros,
    formatUnits,
    formatNumber,
    MAX_ALLOWANCE,
    MAX_ACTIVE_BAND,
    _mulBy1_3,
    _getUsdRate,
    DIGas,
    smartNumber,
} from "../utils.js";
import {IDict, TGas, TAmount, IReward, IQuoteOdos, IOneWayMarket} from "../interfaces.js";
import { _getExpectedOdos, _getQuoteOdos, _assembleTxOdos, _getUserCollateral, _getMarketsData } from "../external-api.js";
import ERC20Abi from '../constants/abis/ERC20.json' assert { type: 'json' };
import {cacheKey, cacheStats} from "../cache/index.js";


const DAY = 86400;
const WEEK = 7 * DAY;


export class OneWayMarketTemplate {
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
    };
    stats: {
        parameters: () => Promise<{
            fee: string, // %
            admin_fee: string, // %
            liquidation_discount: string, // %
            loan_discount: string, // %
            base_price: string,
            A: string,
        }>,
        rates: (isGetter?: boolean, useAPI?: boolean) => Promise<{borrowApr: string, lendApr: string, borrowApy: string, lendApy: string}>,
        futureRates: (dReserves: TAmount, dDebt: TAmount) => Promise<{borrowApr: string, lendApr: string, borrowApy: string, lendApy: string}>,
        balances: () => Promise<[string, string]>,
        bandsInfo: () => Promise<{ activeBand: number, maxBand: number, minBand: number, liquidationBand: number | null }>
        bandBalances:(n: number) => Promise<{ borrowed: string, collateral: string }>,
        bandsBalances: () => Promise<{ [index: number]: { borrowed: string, collateral: string } }>,
        totalDebt: (isGetter?: boolean, useAPI?: boolean) => Promise<string>,
        ammBalances: (isGetter?: boolean, useAPI?: boolean) => Promise<{ borrowed: string, collateral: string }>,
        capAndAvailable: (isGetter?: boolean, useAPI?: boolean) => Promise<{ cap: string, available: string }>,
    };
    wallet: {
        balances: (address?: string) => Promise<{ collateral: string, borrowed: string, vaultShares: string, gauge: string }>,
    };
    vault: {
        maxDeposit: (address?: string) => Promise<string>,
        previewDeposit: (amount: TAmount) => Promise<string>,
        depositIsApproved: (borrowed: TAmount) => Promise<boolean>
        depositApprove: (borrowed: TAmount) => Promise<string[]>
        deposit: (amount: TAmount) => Promise<string>,
        maxMint: (address?: string) => Promise<string>,
        previewMint: (amount: TAmount) => Promise<string>,
        mintIsApproved: (borrowed: TAmount) => Promise<boolean>
        mintApprove: (borrowed: TAmount) => Promise<string[]>
        mint: (amount: TAmount) => Promise<string>,
        maxWithdraw: (address?: string) => Promise<string>,
        previewWithdraw: (amount: TAmount) => Promise<string>,
        withdraw: (amount: TAmount) => Promise<string>,
        maxRedeem: (address?: string) => Promise<string>,
        previewRedeem: (amount: TAmount) => Promise<string>,
        redeem: (amount: TAmount) => Promise<string>,
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
            depositApprove: (amount: TAmount) => Promise<TGas>,
            deposit: (amount: TAmount) => Promise<TGas>,
            mintApprove: (amount: TAmount) => Promise<TGas>,
            mint: (amount: TAmount) => Promise<TGas>,
            withdraw: (amount: TAmount) => Promise<TGas>,
            redeem: (amount: TAmount) => Promise<TGas>,
            stakeApprove: (vaultShares: number | string) => Promise<TGas>,
            stake: (vaultShares: number | string) => Promise<TGas>,
            unstake: (vaultShares: number | string) => Promise<TGas>,
            claimCrv: () => Promise<TGas>,
            claimRewards: () => Promise<TGas>,
        }
    };
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

    constructor(id: string, marketData: IOneWayMarket) {
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
        this.vault = {
            maxDeposit: this.vaultMaxDeposit.bind(this),
            previewDeposit: this.vaultPreviewDeposit.bind(this),
            depositIsApproved: this.vaultDepositIsApproved.bind(this),
            depositApprove: this.vaultDepositApprove.bind(this),
            deposit: this.vaultDeposit.bind(this),
            maxMint: this.vaultMaxMint.bind(this),
            previewMint: this.vaultPreviewMint.bind(this),
            mintIsApproved: this.vaultMintIsApproved.bind(this),
            mintApprove: this.vaultMintApprove.bind(this),
            mint: this.vaultMint.bind(this),
            maxWithdraw: this.vaultMaxWithdraw.bind(this),
            previewWithdraw: this.vaultPreviewWithdraw.bind(this),
            withdraw: this.vaultWithdraw.bind(this),
            maxRedeem: this.vaultMaxRedeem.bind(this),
            previewRedeem: this.vaultPreviewRedeem.bind(this),
            redeem: this.vaultRedeem.bind(this),
            convertToShares: this.vaultConvertToShares.bind(this),
            convertToAssets: this.vaultConvertToAssets.bind(this),
            stakeIsApproved: this.vaultStakeIsApproved.bind(this),
            stakeApprove: this.vaultStakeApprove.bind(this),
            stake: this.vaultStake.bind(this),
            unstake: this.vaultUnstake.bind(this),
            rewardsOnly: this.vaultRewardsOnly.bind(this),
            totalLiquidity: this.vaultTotalLiquidity.bind(this),
            crvApr: this.vaultCrvApr.bind(this),
            claimableCrv: this.vaultClaimableCrv.bind(this),
            claimCrv: this.vaultClaimCrv.bind(this),
            rewardTokens: this.vaultRewardTokens.bind(this),
            rewardsApr: this.vaultRewardsApr.bind(this),
            claimableRewards: this.vaultClaimableRewards.bind(this),
            claimRewards: this.vaultClaimRewards.bind(this),
            estimateGas: {
                depositApprove: this.vaultDepositApproveEstimateGas.bind(this),
                deposit: this.vaultDepositEstimateGas.bind(this),
                mintApprove: this.vaultMintApproveEstimateGas.bind(this),
                mint: this.vaultMintEstimateGas.bind(this),
                withdraw: this.vaultWithdrawEstimateGas.bind(this),
                redeem: this.vaultRedeemEstimateGas.bind(this),
                stakeApprove: this.vaultStakeApproveEstimateGas.bind(this),
                stake: this.vaultStakeEstimateGas.bind(this),
                unstake: this.vaultUnstakeEstimateGas.bind(this),
                claimCrv: this.vaultClaimCrvEstimateGas.bind(this),
                claimRewards: this.vaultClaimRewardsEstimateGas.bind(this),
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

    }

    private _getMarketId = (): number => Number(this.id.split("-").slice(-1)[0]);

    // ---------------- VAULT ----------------

    private async vaultMaxDeposit(address = ""): Promise<string> {
        address = _getAddress(address);
        // const _amount = await llamalend.contracts[this.addresses.vault].contract.maxDeposit(address);  TODO use maxDeposit
        const _amount = await llamalend.contracts[this.addresses.borrowed_token].contract.balanceOf(address);

        return formatUnits(_amount,  this.borrowed_token.decimals);
    }

    private async vaultPreviewDeposit(amount: TAmount): Promise<string> {
        const _amount = parseUnits(amount, this.borrowed_token.decimals);
        const _shares = await llamalend.contracts[this.addresses.vault].contract.previewDeposit(_amount);

        return formatUnits(_shares, 18);
    }

    private async vaultDepositIsApproved(borrowed: TAmount): Promise<boolean> {
        return await hasAllowance([this.borrowed_token.address], [borrowed], llamalend.signerAddress, this.addresses.vault);
    }

    private async vaultDepositApproveEstimateGas (borrowed: TAmount): Promise<TGas> {
        return await ensureAllowanceEstimateGas([this.borrowed_token.address], [borrowed], this.addresses.vault);
    }

    private async vaultDepositApprove(borrowed: TAmount): Promise<string[]> {
        return await ensureAllowance([this.borrowed_token.address], [borrowed], this.addresses.vault);
    }

    private async _vaultDeposit(amount: TAmount, estimateGas = false): Promise<string | TGas> {
        const _amount = parseUnits(amount, this.borrowed_token.decimals);
        const gas = await llamalend.contracts[this.addresses.vault].contract.deposit.estimateGas(_amount, { ...llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();

        const gasLimit = _mulBy1_3(DIGas(gas));

        return (await llamalend.contracts[this.addresses.vault].contract.deposit(_amount, { ...llamalend.options, gasLimit })).hash;
    }

    private async vaultDepositEstimateGas(amount: TAmount): Promise<TGas> {
        if (!(await this.vaultDepositIsApproved(amount))) throw Error("Approval is needed for gas estimation");
        return await this._vaultDeposit(amount, true) as number;
    }

    private async vaultDeposit(amount: TAmount): Promise<string> {
        await this.vaultDepositApprove(amount);
        return await this._vaultDeposit(amount, false) as string;
    }


    private async vaultMaxMint(address = ""): Promise<string> {
        address = _getAddress(address);
        // const _shares = await llamalend.contracts[this.addresses.vault].contract.maxMint(address);  TODO use maxMint
        const _assetBalance = await llamalend.contracts[this.addresses.borrowed_token].contract.balanceOf(address);
        const _shares = await llamalend.contracts[this.addresses.vault].contract.convertToShares(_assetBalance);

        return formatUnits(_shares, 18);
    }

    private async vaultPreviewMint(amount: TAmount): Promise<string> {
        const _amount = parseUnits(amount, 18);
        const _assets = await llamalend.contracts[this.addresses.vault].contract.previewMint(_amount);

        return formatUnits(_assets, this.borrowed_token.decimals);
    }

    private async vaultMintIsApproved(borrowed: TAmount): Promise<boolean> {
        return await hasAllowance([this.borrowed_token.address], [borrowed], llamalend.signerAddress, this.addresses.vault);
    }

    private async vaultMintApproveEstimateGas (borrowed: TAmount): Promise<TGas> {
        return await ensureAllowanceEstimateGas([this.borrowed_token.address], [borrowed], this.addresses.vault);
    }

    private async vaultMintApprove(borrowed: TAmount): Promise<string[]> {
        return await ensureAllowance([this.borrowed_token.address], [borrowed], this.addresses.vault);
    }

    private async _vaultMint(amount: TAmount, estimateGas = false): Promise<string | TGas> {
        const _amount = parseUnits(amount, 18);
        const gas = await llamalend.contracts[this.addresses.vault].contract.mint.estimateGas(_amount, { ...llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();

        const gasLimit = _mulBy1_3(DIGas(gas));

        return (await llamalend.contracts[this.addresses.vault].contract.mint(_amount, { ...llamalend.options, gasLimit })).hash;
    }

    private async vaultMintEstimateGas(amount: TAmount): Promise<TGas> {
        if (!(await this.vaultMintIsApproved(amount))) throw Error("Approval is needed for gas estimation");
        return await this._vaultMint(amount, true) as number;
    }

    private async vaultMint(amount: TAmount): Promise<string> {
        await this.vaultMintApprove(amount);
        return await this._vaultMint(amount, false) as string;
    }


    private async vaultMaxWithdraw(address = ""): Promise<string> {
        address = _getAddress(address);
        const _assets = await llamalend.contracts[this.addresses.vault].contract.maxWithdraw(address);

        return formatUnits(_assets, this.borrowed_token.decimals);
    }

    private async vaultPreviewWithdraw(amount: TAmount): Promise<string> {
        const _amount = parseUnits(amount, this.borrowed_token.decimals);
        const _shares = await llamalend.contracts[this.addresses.vault].contract.previewWithdraw(_amount);

        return formatUnits(_shares, 18);
    }

    private async _vaultWithdraw(amount: TAmount, estimateGas = false): Promise<string | TGas> {
        const _amount = parseUnits(amount, this.borrowed_token.decimals);
        const gas = await llamalend.contracts[this.addresses.vault].contract.withdraw.estimateGas(_amount, { ...llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();

        const gasLimit = _mulBy1_3(DIGas(gas));

        return (await llamalend.contracts[this.addresses.vault].contract.withdraw(_amount, { ...llamalend.options, gasLimit })).hash;
    }

    private async vaultWithdrawEstimateGas(amount: TAmount): Promise<TGas> {
        return await this._vaultWithdraw(amount, true) as number;
    }

    private async vaultWithdraw(amount: TAmount): Promise<string> {
        return await this._vaultWithdraw(amount, false) as string;
    }


    private async vaultMaxRedeem(address = ""): Promise<string> {
        address = _getAddress(address);
        const _shares = await llamalend.contracts[this.addresses.vault].contract.maxRedeem(address)

        return formatUnits(_shares, 18);
    }

    private async vaultPreviewRedeem(amount: TAmount): Promise<string> {
        const _amount = parseUnits(amount, 18);
        const _assets = await llamalend.contracts[this.addresses.vault].contract.previewRedeem(_amount);

        return formatUnits(_assets, this.borrowed_token.decimals);
    }

    private async _vaultRedeem(amount: TAmount, estimateGas = false): Promise<string | TGas> {
        const _amount = parseUnits(amount, 18);
        const gas = await llamalend.contracts[this.addresses.vault].contract.redeem.estimateGas(_amount, { ...llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();

        const gasLimit = _mulBy1_3(DIGas(gas));

        return (await llamalend.contracts[this.addresses.vault].contract.redeem(_amount, { ...llamalend.options, gasLimit })).hash;
    }

    private async vaultRedeemEstimateGas(amount: TAmount): Promise<TGas> {
        return await this._vaultRedeem(amount, true) as number;
    }

    private async vaultRedeem(amount: TAmount): Promise<string> {
        return await this._vaultRedeem(amount, false) as string;
    }

    // ---------------- VAULT UTILS ----------------

    private async vaultConvertToShares(assets: TAmount): Promise<string> {
        const _assets = parseUnits(assets, this.borrowed_token.decimals);
        const _shares = await llamalend.contracts[this.addresses.vault].contract.convertToShares(_assets);

        return llamalend.formatUnits(_shares);
    }

    private async vaultConvertToAssets(shares: TAmount): Promise<string> {
        const _shares = parseUnits(shares);
        const _assets = await llamalend.contracts[this.addresses.vault].contract.convertToAssets(_shares);

        return llamalend.formatUnits(_assets, this.borrowed_token.decimals);
    }

    // ---------------- VAULT STAKING ----------------

    private async vaultStakeIsApproved(vaultShares: number | string): Promise<boolean> {
        if (this.addresses.gauge === llamalend.constants.ZERO_ADDRESS) {
            throw Error(`stakeIsApproved method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        return await hasAllowance([this.addresses.vault], [vaultShares], llamalend.signerAddress, this.addresses.gauge);
    }

    private async vaultStakeApproveEstimateGas(vaultShares: number | string): Promise<TGas> {
        if (this.addresses.gauge === llamalend.constants.ZERO_ADDRESS) {
            throw Error(`stakeApproveEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        return await ensureAllowanceEstimateGas([this.addresses.vault], [vaultShares], this.addresses.gauge);
    }

    private async vaultStakeApprove(vaultShares: number | string): Promise<string[]> {
        if (this.addresses.gauge === llamalend.constants.ZERO_ADDRESS) {
            throw Error(`stakeApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        return await ensureAllowance([this.addresses.vault], [vaultShares], this.addresses.gauge);
    }

    private async vaultStakeEstimateGas(vaultShares: number | string): Promise<TGas> {
        if (this.addresses.gauge === llamalend.constants.ZERO_ADDRESS) {
            throw Error(`stakeEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _vaultShares = parseUnits(vaultShares);
        return smartNumber(await llamalend.contracts[this.addresses.gauge].contract.deposit.estimateGas(_vaultShares, llamalend.constantOptions));
    }

    private async vaultStake(vaultShares: number | string): Promise<string> {
        if (this.addresses.gauge === llamalend.constants.ZERO_ADDRESS) {
            throw Error(`stake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _vaultShares = parseUnits(vaultShares);
        await _ensureAllowance([this.addresses.vault], [_vaultShares], this.addresses.gauge)

        await llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(await llamalend.contracts[this.addresses.gauge].contract.deposit.estimateGas(_vaultShares, llamalend.constantOptions)));
        return (await llamalend.contracts[this.addresses.gauge].contract.deposit(_vaultShares, { ...llamalend.options, gasLimit })).hash;
    }

    private async vaultUnstakeEstimateGas(vaultShares: number | string): Promise<TGas> {
        if (this.addresses.gauge === llamalend.constants.ZERO_ADDRESS) {
            throw Error(`unstakeEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _vaultShares = parseUnits(vaultShares);
        return smartNumber(await llamalend.contracts[this.addresses.gauge].contract.withdraw.estimateGas(_vaultShares, llamalend.constantOptions));
    }

    private async vaultUnstake(vaultShares: number | string): Promise<string> {
        if (this.addresses.gauge === llamalend.constants.ZERO_ADDRESS) {
            throw Error(`unstake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _vaultShares = parseUnits(vaultShares);

        await llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas((await llamalend.contracts[this.addresses.gauge].contract.withdraw.estimateGas(_vaultShares, llamalend.constantOptions))));
        return (await llamalend.contracts[this.addresses.gauge].contract.withdraw(_vaultShares, { ...llamalend.options, gasLimit })).hash;
    }

    // ---------------- VAULT STAKING REWARDS ----------------

    private vaultRewardsOnly(): boolean {
        if (llamalend.chainId === 2222 || llamalend.chainId === 324) return true;  // TODO remove this for Kava and ZkSync
        if (this.addresses.gauge === llamalend.constants.ZERO_ADDRESS) throw Error(`${this.name} doesn't have gauge`);
        const gaugeContract = llamalend.contracts[this.addresses.gauge].contract;

        return !('inflation_rate()' in gaugeContract || 'inflation_rate(uint256)' in gaugeContract);
    }

    private async vaultTotalLiquidity(useAPI = true): Promise<string> {
        const { cap } = await this.statsCapAndAvailable(true, useAPI);
        const price = await _getUsdRate(this.addresses.borrowed_token);

        return BN(cap).times(price).toFixed(6)
    }

    private _calcCrvApr = async (futureWorkingSupplyBN: BigNumber | null = null): Promise<[baseApy: number, boostedApy: number]> => {
        const totalLiquidityUSD = await this.vaultTotalLiquidity();
        if (Number(totalLiquidityUSD) === 0) return [0, 0];

        let inflationRateBN, workingSupplyBN, totalSupplyBN;
        if (llamalend.chainId !== 1) {
            const gaugeContract = llamalend.contracts[this.addresses.gauge].multicallContract;
            const lpTokenContract = llamalend.contracts[this.addresses.vault].multicallContract;
            const crvContract = llamalend.contracts[llamalend.constants.ALIASES.crv].contract;

            const currentWeek = Math.floor(Date.now() / 1000 / WEEK);
            [inflationRateBN, workingSupplyBN, totalSupplyBN] = (await llamalend.multicallProvider.all([
                gaugeContract.inflation_rate(currentWeek),
                gaugeContract.working_supply(),
                lpTokenContract.totalSupply(),
            ]) as bigint[]).map((value) => toBN(value));

            if (inflationRateBN.eq(0)) {
                inflationRateBN = toBN(await crvContract.balanceOf(this.addresses.gauge, llamalend.constantOptions)).div(WEEK);
            }
        } else {
            const gaugeContract = llamalend.contracts[this.addresses.gauge].multicallContract;
            const lpTokenContract = llamalend.contracts[this.addresses.vault].multicallContract;
            const gaugeControllerContract = llamalend.contracts[llamalend.constants.ALIASES.gauge_controller].multicallContract;

            let weightBN;
            [inflationRateBN, weightBN, workingSupplyBN, totalSupplyBN] = (await llamalend.multicallProvider.all([
                gaugeContract.inflation_rate(),
                gaugeControllerContract.gauge_relative_weight(this.addresses.gauge),
                gaugeContract.working_supply(),
                lpTokenContract.totalSupply(),
            ]) as bigint[]).map((value) => toBN(value));

            inflationRateBN = inflationRateBN.times(weightBN);
        }

        if (inflationRateBN.eq(0)) return [0, 0];
        if (futureWorkingSupplyBN !== null) workingSupplyBN = futureWorkingSupplyBN;

        // If you added 1$ value of LP it would be 0.4$ of working LP. So your annual reward per 1$ in USD is:
        // (annual reward per working liquidity in $) * (0.4$ of working LP)
        const rateBN = inflationRateBN.times(31536000).div(workingSupplyBN).times(totalSupplyBN).div(Number(totalLiquidityUSD)).times(0.4);
        const crvPrice = await _getUsdRate(llamalend.constants.ALIASES.crv);
        const baseApyBN = rateBN.times(crvPrice);
        const boostedApyBN = baseApyBN.times(2.5);

        return [baseApyBN.times(100).toNumber(), boostedApyBN.times(100).toNumber()]
    }

    private async vaultCrvApr(useApi = true): Promise<[baseApy: number, boostedApy: number]> {
        if (this.vaultRewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use stats.rewardsApy instead`);

        // const isDisabledChain = [1313161554].includes(llamalend.chainId); // Disable Aurora
        // if (useApi && !isDisabledChain) {
        //     const crvAPYs = await _getCrvApyFromApi();
        //     const poolCrvApy = crvAPYs[this.addresses.gauge] ?? [0, 0];  // new pools might be missing
        //     return [poolCrvApy[0], poolCrvApy[1]];
        // }

        return await this._calcCrvApr();
    }

    private async vaultClaimableCrv (address = ""): Promise<string> {
        if (this.vaultRewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use claimableRewards instead`);
        address = address || llamalend.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        return llamalend.formatUnits(await llamalend.contracts[this.addresses.gauge].contract.claimable_tokens(address, llamalend.constantOptions));
    }

    private async _vaultClaimCrv(estimateGas: boolean): Promise<string | TGas> {
        if (this.vaultRewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use claimRewards instead`);
        const contract = llamalend.contracts[llamalend.constants.ALIASES.minter].contract;
        const gas = await contract.mint.estimateGas(this.addresses.gauge, llamalend.constantOptions);
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.mint(this.addresses.gauge, { ...llamalend.options, gasLimit })).hash
    }

    private async vaultClaimCrvEstimateGas(): Promise<TGas> {
        return await this._vaultClaimCrv(true) as TGas;
    }

    private async vaultClaimCrv(): Promise<string> {
        return await this._vaultClaimCrv(false) as string;
    }

    private vaultRewardTokens = memoize(async (useApi = true): Promise<{token: string, symbol: string, decimals: number}[]> => {
        if (this.addresses.gauge === llamalend.constants.ZERO_ADDRESS) return []

        // if (useApi) {
        //     const rewards = await _getRewardsFromApi();
        //     if (!rewards[this.addresses.gauge]) return [];
        //     rewards[this.addresses.gauge].forEach((r) => _setContracts(r.tokenAddress, ERC20Abi));
        //     return rewards[this.addresses.gauge].map((r) => ({ token: r.tokenAddress, symbol: r.symbol, decimals: Number(r.decimals) }));
        // }

        const gaugeContract = llamalend.contracts[this.addresses.gauge].contract;
        const gaugeMulticallContract = llamalend.contracts[this.addresses.gauge].multicallContract;
        const rewardCount = Number(llamalend.formatUnits(await gaugeContract.reward_count(llamalend.constantOptions), 0));

        const tokenCalls = [];
        for (let i = 0; i < rewardCount; i++) {
            tokenCalls.push(gaugeMulticallContract.reward_tokens(i));
        }
        const tokens = (await llamalend.multicallProvider.all(tokenCalls) as string[])
            .filter((addr) => addr !== llamalend.constants.ZERO_ADDRESS)
            .map((addr) => addr.toLowerCase())
            .filter((addr) => llamalend.chainId === 1 || addr !== llamalend.constants.COINS.crv);

        const tokenInfoCalls = [];
        for (const token of tokens) {
            llamalend.setContract(token, ERC20Abi);
            const tokenMulticallContract = llamalend.contracts[token].multicallContract;
            tokenInfoCalls.push(tokenMulticallContract.symbol(), tokenMulticallContract.decimals());
        }
        const tokenInfo = await llamalend.multicallProvider.all(tokenInfoCalls);
        for (let i = 0; i < tokens.length; i++) {
            llamalend.constants.DECIMALS[tokens[i]] = Number(tokenInfo[(i * 2) + 1]);
        }

        return tokens.map((token, i) => ({ token, symbol: tokenInfo[i * 2] as string, decimals: Number(tokenInfo[(i * 2) + 1]) }));
    },
    {
        promise: true,
        maxAge: 30 * 60 * 1000, // 30m
    });

    private vaultRewardsApr = async (useApi = true): Promise<IReward[]> => {
        if(useApi) {
            const response = await _getMarketsData(llamalend.constants.NETWORK_NAME);

            const market = response.lendingVaultData.find((item) => item.address.toLowerCase() === this.addresses.vault.toLowerCase())

            if(market) {
                return market.gaugeRewards
            } else {
                throw new Error('Market not found in API')
            }
        } else {
            if (this.addresses.gauge === llamalend.constants.ZERO_ADDRESS) return [];

            // const isDisabledChain = [1313161554].includes(llamalend.chainId); // Disable Aurora
            // if (useApi && !isDisabledChain) {
            //     const rewards = await _getRewardsFromApi();
            //     if (!rewards[this.addresses.gauge]) return [];
            //     return rewards[this.addresses.gauge].map((r) => ({ gaugeAddress: r.gaugeAddress, tokenAddress: r.tokenAddress, symbol: r.symbol, apy: r.apy }));
            // }

            const apy: IReward[] = [];
            const rewardTokens = await this.vaultRewardTokens(false);
            for (const rewardToken of rewardTokens) {
                const gaugeContract = llamalend.contracts[this.addresses.gauge].multicallContract;
                const lpTokenContract = llamalend.contracts[this.addresses.vault].multicallContract;
                const rewardContract = llamalend.contracts[this.addresses.gauge].multicallContract;

                const totalLiquidityUSD = await this.vaultTotalLiquidity();
                const rewardRate = await _getUsdRate(rewardToken.token);

                const [rewardData, _stakedSupply, _totalSupply] = (await llamalend.multicallProvider.all([
                    rewardContract.reward_data(rewardToken.token),
                    gaugeContract.totalSupply(),
                    lpTokenContract.totalSupply(),
                ]) as any[]);
                const stakedSupplyBN = toBN(_stakedSupply as bigint);
                const totalSupplyBN = toBN(_totalSupply as bigint);
                const inflationBN = toBN(rewardData.rate, rewardToken.decimals);
                const periodFinish = Number(llamalend.formatUnits(rewardData.period_finish, 0)) * 1000;
                const baseApy = periodFinish > Date.now() ?
                    inflationBN.times(31536000).times(rewardRate).div(stakedSupplyBN).times(totalSupplyBN).div(Number(totalLiquidityUSD)) :
                    BN(0);

                apy.push({
                    gaugeAddress: this.addresses.gauge,
                    tokenAddress: rewardToken.token,
                    symbol: rewardToken.symbol,
                    apy: baseApy.times(100).toNumber(),
                });
            }

            return apy
        }
    }

    private async vaultClaimableRewards(address = ""): Promise<{token: string, symbol: string, amount: string}[]> {
        if (this.addresses.gauge === llamalend.constants.ZERO_ADDRESS) {
            throw Error(`claimableRewards method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        address = address || llamalend.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const gaugeContract = llamalend.contracts[this.addresses.gauge].contract;
        const rewardTokens = await this.vaultRewardTokens();
        const rewards = [];
        for (const rewardToken of rewardTokens) {
            const _amount = await gaugeContract.claimable_reward(address, rewardToken.token, llamalend.constantOptions);
            rewards.push({
                token: rewardToken.token,
                symbol: rewardToken.symbol,
                amount: llamalend.formatUnits(_amount, rewardToken.decimals),
            });
        }

        return rewards
    }

    private async _vaultClaimRewards(estimateGas: boolean): Promise<string | TGas> {
        if (this.addresses.gauge === llamalend.constants.ZERO_ADDRESS) {
            throw Error(`claimRewards method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const gaugeContract = llamalend.contracts[this.addresses.gauge].contract;
        if (!("claim_rewards()" in gaugeContract)) throw Error (`${this.name} pool doesn't have such method`);
        const gas = await gaugeContract.claim_rewards.estimateGas(llamalend.constantOptions);
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await gaugeContract.claim_rewards({ ...llamalend.options, gasLimit })).hash;
    }

    private async vaultClaimRewardsEstimateGas(): Promise<TGas> {
        return await this._vaultClaimRewards(true) as TGas;
    }

    private async vaultClaimRewards(): Promise<string> {
        return await this._vaultClaimRewards(false) as string;
    }

    // ---------------- STATS ----------------

    private statsParameters = memoize(async (): Promise<{
            fee: string, // %
            admin_fee: string, // %
            liquidation_discount: string, // %
            loan_discount: string, // %
            base_price: string,
            A: string,
        }> => {
        const llammaContract = llamalend.contracts[this.addresses.amm].multicallContract;
        const controllerContract = llamalend.contracts[this.addresses.controller].multicallContract;

        const calls = [
            llammaContract.fee(),
            llammaContract.admin_fee(),
            controllerContract.liquidation_discount(),
            controllerContract.loan_discount(),
            llammaContract.get_base_price(),
            llammaContract.A(),
        ]

        const [_fee, _admin_fee, _liquidation_discount, _loan_discount, _base_price, _A]: bigint[] = await llamalend.multicallProvider.all(calls) as bigint[];
        const A = formatUnits(_A, 0)
        const base_price = formatUnits(_base_price)
        const [fee, admin_fee, liquidation_discount, loan_discount] = [_fee, _admin_fee, _liquidation_discount, _loan_discount]
            .map((_x) => formatUnits(_x * BigInt(100)));

        return { fee, admin_fee, liquidation_discount, loan_discount, base_price, A }
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    });

    private _getRate = async (isGetter = true): Promise<bigint> => {
        let _rate;
        if(isGetter) {
            _rate = cacheStats.get(cacheKey(this.addresses.amm, 'rate'));
        } else {
            _rate = await llamalend.contracts[this.addresses.amm].contract.rate(llamalend.constantOptions);
            cacheStats.set(cacheKey(this.addresses.controller, 'rate'), _rate);
        }
        return _rate;
    }

    private _getFutureRate = async (_dReserves: bigint, _dDebt: bigint): Promise<bigint> => {
        const mpContract = llamalend.contracts[this.addresses.monetary_policy].contract;
        return await mpContract.future_rate(this.addresses.controller, _dReserves, _dDebt);
    }

    private async statsRates(isGetter = true, useAPI = false): Promise<{borrowApr: string, lendApr: string, borrowApy: string, lendApy: string}> {
        if(useAPI) {
            const response = await _getMarketsData(llamalend.constants.NETWORK_NAME);

            const market = response.lendingVaultData.find((item) => item.address.toLowerCase() === this.addresses.vault.toLowerCase())

            if(market) {
                return {
                    borrowApr: (market.rates.borrowApr * 100).toString(),
                    lendApr: (market.rates.lendApr * 100).toString(),
                    borrowApy: (market.rates.borrowApy * 100).toString(),
                    lendApy: (market.rates.lendApy * 100).toString(),
                }
            } else {
                throw new Error('Market not found in API')
            }
        } else {
            const _rate = await this._getRate(isGetter);
            const borrowApr =  toBN(_rate).times(365).times(86400).times(100).toString();
            // borrowApy = e**(rate*365*86400) - 1
            const borrowApy = String(((2.718281828459 ** (toBN(_rate).times(365).times(86400)).toNumber()) - 1) * 100);
            let lendApr = "0";
            let lendApy = "0";
            const debt = await this.statsTotalDebt(isGetter);
            if (Number(debt) > 0) {
                const { cap } = await this.statsCapAndAvailable(isGetter);
                lendApr = toBN(_rate).times(365).times(86400).times(debt).div(cap).times(100).toString();
                // lendApy = (debt * e**(rate*365*86400) - debt) / cap
                const debtInAYearBN = BN(debt).times(2.718281828459 ** (toBN(_rate).times(365).times(86400)).toNumber());
                lendApy = debtInAYearBN.minus(debt).div(cap).times(100).toString();
            }

            return { borrowApr, lendApr, borrowApy, lendApy }
        }
    }

    private async statsFutureRates(dReserves: TAmount, dDebt: TAmount, useAPI = true): Promise<{borrowApr: string, lendApr: string, borrowApy: string, lendApy: string}> {
        const _dReserves = parseUnits(dReserves, this.borrowed_token.decimals);
        const _dDebt = parseUnits(dDebt, this.borrowed_token.decimals);
        const _rate = await this._getFutureRate(_dReserves, _dDebt);
        const borrowApr =  toBN(_rate).times(365).times(86400).times(100).toString();
        // borrowApy = e**(rate*365*86400) - 1
        const borrowApy = String(((2.718281828459 ** (toBN(_rate).times(365).times(86400)).toNumber()) - 1) * 100);
        let lendApr = "0";
        let lendApy = "0";
        const debt = Number(await this.statsTotalDebt()) + Number(dDebt);
        if (Number(debt) > 0) {
            const cap = Number((await this.statsCapAndAvailable(true, useAPI)).cap) + Number(dReserves);
            lendApr = toBN(_rate).times(365).times(86400).times(debt).div(cap).times(100).toString();
            // lendApy = (debt * e**(rate*365*86400) - debt) / cap
            const debtInAYearBN = BN(debt).times(2.718281828459 ** (toBN(_rate).times(365).times(86400)).toNumber());
            lendApy = debtInAYearBN.minus(debt).div(cap).times(100).toString();
        }

        return { borrowApr, lendApr, borrowApy, lendApy }
    }

    private async statsBalances(): Promise<[string, string]> {
        const borrowedContract = llamalend.contracts[this.borrowed_token.address].multicallContract;
        const collateralContract = llamalend.contracts[this.collateral_token.address].multicallContract;
        const ammContract = llamalend.contracts[this.addresses.amm].multicallContract;
        const calls = [
            borrowedContract.balanceOf(this.addresses.amm),
            collateralContract.balanceOf(this.addresses.amm),
            ammContract.admin_fees_x(),
            ammContract.admin_fees_y(),
        ]
        const [_borrowedBalance, _collateralBalance, _borrowedAdminFees, _collateralAdminFees]: bigint[] = await llamalend.multicallProvider.all(calls);

        return [
            formatUnits(_borrowedBalance - _borrowedAdminFees, this.borrowed_token.decimals),
            formatUnits(_collateralBalance - _collateralAdminFees, this.collateral_token.decimals),
        ];
    }

    private statsBandsInfo = memoize(async (): Promise<{ activeBand: number, maxBand: number, minBand: number, liquidationBand: number | null }> => {
        const ammContract = llamalend.contracts[this.addresses.amm].multicallContract;
        const calls = [
            ammContract.active_band(),
            ammContract.max_band(),
            ammContract.min_band(),
        ]

        const [activeBand, maxBand, minBand] = (await llamalend.multicallProvider.all(calls) as bigint[]).map((_b) => Number(_b));
        const { borrowed, collateral } = await this.statsBandBalances(activeBand);
        let liquidationBand = null;
        if (Number(borrowed) > 0 && Number(collateral) > 0) liquidationBand = activeBand;
        return { activeBand, maxBand, minBand, liquidationBand }
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    private async statsBandBalances(n: number): Promise<{ borrowed: string, collateral: string }> {
        const ammContract = llamalend.contracts[this.addresses.amm].multicallContract;
        const calls = [];
        calls.push(ammContract.bands_x(n), ammContract.bands_y(n));
        const _balances: bigint[] = await llamalend.multicallProvider.all(calls);

        // bands_x and bands_y always return amounts with 18 decimals
        return {
            borrowed: formatNumber(formatUnits(_balances[0]), this.borrowed_token.decimals),
            collateral: formatNumber(formatUnits(_balances[1]), this.collateral_token.decimals),
        }
    }

    private async statsBandsBalances(): Promise<{ [index: number]: { borrowed: string, collateral: string } }> {
        const { maxBand, minBand } = await this.statsBandsInfo();

        const ammContract = llamalend.contracts[this.addresses.amm].multicallContract;
        const calls = [];
        for (let i = minBand; i <= maxBand; i++) {
            calls.push(ammContract.bands_x(i), ammContract.bands_y(i));
        }

        const _bands: bigint[] = await llamalend.multicallProvider.all(calls);

        const bands: { [index: number]: { borrowed: string, collateral: string } } = {};
        for (let i = minBand; i <= maxBand; i++) {
            const _i = i - minBand
            // bands_x and bands_y always return amounts with 18 decimals
            bands[i] = {
                borrowed: formatNumber(formatUnits(_bands[2 * _i]), this.borrowed_token.decimals),
                collateral: formatNumber(formatUnits(_bands[(2 * _i) + 1]), this.collateral_token.decimals),
            }
        }

        return bands
    }

    private async statsTotalDebt(isGetter = true, useAPI = true): Promise<string> {
        if(useAPI) {
            const response = await _getMarketsData(llamalend.constants.NETWORK_NAME);

            const market = response.lendingVaultData.find((item) => item.address.toLowerCase() === this.addresses.vault.toLowerCase())

            if(market) {
                return market.borrowed.total.toString();
            } else {
                throw new Error('Market not found in API')
            }
        } else {
            let _debt;
            if(isGetter) {
                _debt = cacheStats.get(cacheKey(this.addresses.controller, 'total_debt'));
            } else {
                _debt = await llamalend.contracts[this.addresses.controller].contract.total_debt(llamalend.constantOptions);
                cacheStats.set(cacheKey(this.addresses.controller, 'total_debt'), _debt);
            }

            return formatUnits(_debt, this.borrowed_token.decimals);
        }
    }

    private statsAmmBalances = async (isGetter = true, useAPI = false): Promise<{ borrowed: string, collateral: string }> => {
        if(useAPI) {
            const response = await _getMarketsData(llamalend.constants.NETWORK_NAME);

            const market = response.lendingVaultData.find((item) => item.address.toLowerCase() === this.addresses.vault.toLowerCase())

            if(market) {
                return {
                    borrowed: market.ammBalances.ammBalanceBorrowed.toString(),
                    collateral: market.ammBalances.ammBalanceCollateral.toString(),
                }
            } else {
                throw new Error('Market not found in API')
            }
        } else {
            const borrowedContract = llamalend.contracts[this.addresses.borrowed_token].multicallContract;
            const collateralContract = llamalend.contracts[this.addresses.collateral_token].multicallContract;
            const ammContract = llamalend.contracts[this.addresses.amm].multicallContract;

            let _balance_x, _fee_x, _balance_y, _fee_y;
            if(isGetter) {
                [_balance_x, _fee_x, _balance_y, _fee_y] = [
                    cacheStats.get(cacheKey(this.addresses.borrowed_token, 'balanceOf', this.addresses.amm)),
                    cacheStats.get(cacheKey(this.addresses.amm, 'admin_fees_x')),
                    cacheStats.get(cacheKey(this.addresses.collateral_token, 'balanceOf', this.addresses.amm)),
                    cacheStats.get(cacheKey(this.addresses.amm, 'admin_fees_y')),
                ]
            } else {
                [_balance_x, _fee_x, _balance_y, _fee_y] = await llamalend.multicallProvider.all([
                    borrowedContract.balanceOf(this.addresses.amm),
                    ammContract.admin_fees_x(),
                    collateralContract.balanceOf(this.addresses.amm),
                    ammContract.admin_fees_y(),
                ]);
                cacheStats.set(cacheKey(this.addresses.borrowed_token, 'balanceOf', this.addresses.amm), _balance_x);
                cacheStats.set(cacheKey(this.addresses.amm, 'admin_fees_x'), _fee_x);
                cacheStats.set(cacheKey(this.addresses.collateral_token, 'balanceOf', this.addresses.amm), _balance_y);
                cacheStats.set(cacheKey(this.addresses.amm, 'admin_fees_y'), _fee_y);
            }

            return {
                borrowed: toBN(_balance_x, this.borrowed_token.decimals).minus(toBN(_fee_x, this.borrowed_token.decimals)).toString(),
                collateral: toBN(_balance_y, this.collateral_token.decimals).minus(toBN(_fee_y, this.collateral_token.decimals)).toString(),
            }
        }
    }

    private async statsCapAndAvailable(isGetter = true, useAPI = false): Promise<{ cap: string, available: string }> {
        if(useAPI) {
            const response = await _getMarketsData(llamalend.constants.NETWORK_NAME);

            const market = response.lendingVaultData.find((item) => item.address.toLowerCase() === this.addresses.vault.toLowerCase())

            if(market) {
                return {
                    cap: market.totalSupplied.total.toString(),
                    available: market.availableToBorrow.total.toString(),
                }
            } else {
                throw new Error('Market not found in API')
            }
        } else {
            const vaultContract = llamalend.contracts[this.addresses.vault].multicallContract;
            const borrowedContract = llamalend.contracts[this.addresses.borrowed_token].multicallContract;

            let _cap, _available;
            if(isGetter) {
                _cap = cacheStats.get(cacheKey(this.addresses.vault, 'totalAssets', this.addresses.controller));
                _available = cacheStats.get(cacheKey(this.addresses.borrowed_token, 'balanceOf', this.addresses.controller));
            } else {
                [_cap, _available] =await llamalend.multicallProvider.all([
                    vaultContract.totalAssets(this.addresses.controller),
                    borrowedContract.balanceOf(this.addresses.controller),
                ]);
                cacheStats.set(cacheKey(this.addresses.vault, 'totalAssets', this.addresses.controller), _cap);
                cacheStats.set(cacheKey(this.addresses.borrowed_token, 'balanceOf', this.addresses.controller), _available);
            }

            return {
                cap: llamalend.formatUnits(_cap, this.borrowed_token.decimals),
                available: llamalend.formatUnits(_available, this.borrowed_token.decimals),
            }
        }
    }

    // ---------------- PRICES ----------------

    public A = memoize(async(): Promise<string> => {
        const _A = await llamalend.contracts[this.addresses.amm].contract.A(llamalend.constantOptions) as bigint;
        return formatUnits(_A, 0);
    },
    {
        promise: true,
        maxAge: 86400 * 1000, // 1d
    });

    public basePrice = memoize(async(): Promise<string> => {
        const _price = await llamalend.contracts[this.addresses.amm].contract.get_base_price(llamalend.constantOptions) as bigint;
        return formatUnits(_price);
    },
    {
        promise: true,
        maxAge: 86400 * 1000, // 1d
    });

    public oraclePrice = memoize(async (): Promise<string> => {
        const _price = await llamalend.contracts[this.addresses.amm].contract.price_oracle(llamalend.constantOptions) as bigint;
        return formatUnits(_price);
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    public async oraclePriceBand(): Promise<number> {
        const oraclePriceBN = BN(await this.oraclePrice());
        const basePriceBN = BN(await this.basePrice());
        const A_BN = BN(await this.A());
        const multiplier = oraclePriceBN.lte(basePriceBN) ? A_BN.minus(1).div(A_BN) : A_BN.div(A_BN.minus(1));
        const term = oraclePriceBN.lte(basePriceBN) ? 1 : -1;
        const compareFunc = oraclePriceBN.lte(basePriceBN) ?
            (oraclePriceBN: BigNumber, currentTickPriceBN: BigNumber) => oraclePriceBN.lte(currentTickPriceBN) :
            (oraclePriceBN: BigNumber, currentTickPriceBN: BigNumber) => oraclePriceBN.gt(currentTickPriceBN);

        let band = 0;
        let currentTickPriceBN = oraclePriceBN.lte(basePriceBN) ? basePriceBN.times(multiplier) : basePriceBN;
        while (compareFunc(oraclePriceBN, currentTickPriceBN)) {
            currentTickPriceBN = currentTickPriceBN.times(multiplier);
            band += term;
        }

        return band;
    }

    public async price(): Promise<string> {
        const _price = await llamalend.contracts[this.addresses.amm].contract.get_p(llamalend.constantOptions) as bigint;
        return formatUnits(_price);
    }

    public async calcTickPrice(n: number): Promise<string> {
        const basePrice = await this.basePrice();
        const basePriceBN = BN(basePrice);
        const A_BN = BN(await this.A());

        return _cutZeros(basePriceBN.times(A_BN.minus(1).div(A_BN).pow(n)).toFixed(18))
    }

    public async calcBandPrices(n: number): Promise<[string, string]> {
        return [await this.calcTickPrice(n + 1), await this.calcTickPrice(n)]
    }

    public async calcRangePct(range: number): Promise<string> {
        const A_BN = BN(await this.A());
        const startBN = BN(1);
        const endBN = A_BN.minus(1).div(A_BN).pow(range);

        return startBN.minus(endBN).times(100).toFixed(6)
    }

    // ---------------- WALLET BALANCES ----------------

    private async walletBalances(address = ""): Promise<{ collateral: string, borrowed: string, vaultShares: string, gauge: string }> {
        if (this.addresses.gauge === llamalend.constants.ZERO_ADDRESS) {
            const [collateral, borrowed, vaultShares] =
                await getBalances([this.collateral_token.address, this.borrowed_token.address, this.addresses.vault], address);
            return { collateral, borrowed, vaultShares, gauge: "0" }
        } else {
            const [collateral, borrowed, vaultShares, gauge] =
                await getBalances([this.collateral_token.address, this.borrowed_token.address, this.addresses.vault, this.addresses.gauge], address);
            return { collateral, borrowed, vaultShares, gauge }
        }
    }

    // ---------------- USER POSITION ----------------

    public async userLoanExists(address = ""): Promise<boolean> {
        address = _getAddress(address);
        return  await llamalend.contracts[this.addresses.controller].contract.loan_exists(address, llamalend.constantOptions);
    }

    public _userState = memoize(async (address = ""): Promise<{ _collateral: bigint, _borrowed: bigint, _debt: bigint, _N: bigint }> => {
        address = _getAddress(address);
        const contract = llamalend.contracts[this.addresses.controller].contract;
        const [_collateral, _borrowed, _debt, _N] = await contract.user_state(address, llamalend.constantOptions) as bigint[];

        return { _collateral, _borrowed, _debt, _N }
    },
    {
        promise: true,
        maxAge: 10 * 1000, // 10s
    });

    public async userState(address = ""): Promise<{ collateral: string, borrowed: string, debt: string, N: string }> {
        const { _collateral, _borrowed, _debt, _N } = await this._userState(address);

        return {
            collateral: formatUnits(_collateral, this.collateral_token.decimals),
            borrowed: formatUnits(_borrowed, this.borrowed_token.decimals),
            debt: formatUnits(_debt, this.borrowed_token.decimals),
            N: formatUnits(_N, 0),
        };
    }

    public async userHealth(full = true, address = ""): Promise<string> {
        address = _getAddress(address);
        let _health = await llamalend.contracts[this.addresses.controller].contract.health(address, full, llamalend.constantOptions) as bigint;
        _health = _health * BigInt(100);

        return formatUnits(_health);
    }

    private async _userBands(address: string): Promise<bigint[]> {
        address = _getAddress(address);
        const _bands = await llamalend.contracts[this.addresses.amm].contract.read_user_tick_numbers(address, llamalend.constantOptions) as bigint[];

        return Array.from(_bands).reverse();
    }

    public async userBands(address = ""): Promise<number[]> {
        return (await this._userBands(address)).map((_t) => Number(_t));
    }

    public async userRange(address = ""): Promise<number> {
        const [n2, n1] = await this.userBands(address);
        if (n1 == n2) return 0;
        return n2 - n1 + 1;
    }

    public async userPrices(address = ""): Promise<string[]> {
        address = _getAddress(address);
        const _prices = await llamalend.contracts[this.addresses.controller].contract.user_prices(address, llamalend.constantOptions) as bigint[];

        return _prices.map((_p) => formatUnits(_p)).reverse();
    }

    public async userLoss(userAddress = ""): Promise<{ deposited_collateral: string, current_collateral_estimation: string, loss: string, loss_pct: string }> {
        userAddress = _getAddress(userAddress);
        const [userCollateral, _current_collateral_estimation] = await Promise.all([
            _getUserCollateral(llamalend.constants.NETWORK_NAME, this.addresses.controller, userAddress),
            llamalend.contracts[this.addresses.amm].contract.get_y_up(userAddress),
        ]);

        const deposited_collateral = userCollateral.total_deposit_precise;

        const current_collateral_estimation = llamalend.formatUnits(_current_collateral_estimation, this.collateral_token.decimals);
        if (BN(deposited_collateral).lte(0)) {
            return {
                deposited_collateral,
                current_collateral_estimation,
                loss: "0.0",
                loss_pct: "0.0",
            };
        }
        const loss = BN(deposited_collateral).minus(current_collateral_estimation).toString()
        const loss_pct = BN(loss).div(deposited_collateral).times(100).toString();

        return {
            deposited_collateral,
            current_collateral_estimation,
            loss,
            loss_pct,
        };
    }

    public async userBandsBalances(address = ""): Promise<IDict<{ collateral: string, borrowed: string }>> {
        const [n2, n1] = await this.userBands(address);
        if (n1 == 0 && n2 == 0) return {};

        address = _getAddress(address);
        const contract = llamalend.contracts[this.addresses.amm].contract;
        const [_borrowed, _collateral] = await contract.get_xy(address, llamalend.constantOptions) as [bigint[], bigint[]];

        const res: IDict<{ borrowed: string, collateral: string }> = {};
        for (let i = n1; i <= n2; i++) {
            res[i] = {
                collateral: formatUnits(_collateral[i - n1], this.collateral_token.decimals),
                borrowed: formatUnits(_borrowed[i - n1], this.borrowed_token.decimals),
            };
        }

        return res
    }

    // ---------------- CREATE LOAN ----------------

    private _checkRange(range: number): void {
        if (range < this.minBands) throw Error(`range must be >= ${this.minBands}`);
        if (range > this.maxBands) throw Error(`range must be <= ${this.maxBands}`);
    }

    public async createLoanMaxRecv(collateral: number | string, range: number): Promise<string> {
        this._checkRange(range);
        const _collateral = parseUnits(collateral, this.collateral_token.decimals);
        const contract = llamalend.contracts[this.addresses.controller].contract;

        return formatUnits(await contract.max_borrowable(_collateral, range, 0, llamalend.constantOptions), this.borrowed_token.decimals);
    }

    public createLoanMaxRecvAllRanges = memoize(async (collateral: number | string): Promise<{ [index: number]: string }> => {
        const _collateral = parseUnits(collateral, this.collateral_token.decimals);

        const calls = [];
        for (let N = this.minBands; N <= this.maxBands; N++) {
            calls.push(llamalend.contracts[this.addresses.controller].multicallContract.max_borrowable(_collateral, N, 0));
        }
        const _amounts = await llamalend.multicallProvider.all(calls) as bigint[];

        const res: { [index: number]: string } = {};
        for (let N = this.minBands; N <= this.maxBands; N++) {
            res[N] = formatUnits(_amounts[N - this.minBands], this.borrowed_token.decimals);
        }

        return res;
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    });

    public async getMaxRange(collateral: number | string, debt: number | string): Promise<number> {
        const maxRecv = await this.createLoanMaxRecvAllRanges(collateral);
        for (let N = this.minBands; N <= this.maxBands; N++) {
            if (BN(debt).gt(BN(maxRecv[N]))) return N - 1;
        }

        return this.maxBands;
    }

    private async _calcN1(_collateral: bigint, _debt: bigint, range: number): Promise<bigint> {
        this._checkRange(range);
        return await llamalend.contracts[this.addresses.controller].contract.calculate_debt_n1(_collateral, _debt, range, llamalend.constantOptions);
    }

    private async _calcN1AllRanges(_collateral: bigint, _debt: bigint, maxN: number): Promise<bigint[]> {
        const calls = [];
        for (let N = this.minBands; N <= maxN; N++) {
            calls.push(llamalend.contracts[this.addresses.controller].multicallContract.calculate_debt_n1(_collateral, _debt, N));
        }
        return await llamalend.multicallProvider.all(calls) as bigint[];
    }

    private async _getPrices(_n2: bigint, _n1: bigint): Promise<string[]> {
        const contract = llamalend.contracts[this.addresses.amm].multicallContract;
        return (await llamalend.multicallProvider.all([
            contract.p_oracle_down(_n2),
            contract.p_oracle_up(_n1),
        ]) as bigint[]).map((_p) => formatUnits(_p));
    }

    private async _calcPrices(_n2: bigint, _n1: bigint): Promise<[string, string]> {
        return [await this.calcTickPrice(Number(_n2) + 1), await this.calcTickPrice(Number(_n1))];
    }

    private async _createLoanBands(collateral: number | string, debt: number | string, range: number): Promise<[bigint, bigint]> {
        const _n1 = await this._calcN1(parseUnits(collateral, this.collateral_token.decimals), parseUnits(debt, this.borrowed_token.decimals), range);
        const _n2 = _n1 + BigInt(range - 1);

        return [_n2, _n1];
    }

    private async _createLoanBandsAllRanges(collateral: number | string, debt: number | string): Promise<{ [index: number]: [bigint, bigint] }> {
        const maxN = await this.getMaxRange(collateral, debt);
        const _n1_arr = await this._calcN1AllRanges(parseUnits(collateral, this.collateral_token.decimals), parseUnits(debt, this.borrowed_token.decimals), maxN);
        const _n2_arr: bigint[] = [];
        for (let N = this.minBands; N <= maxN; N++) {
            _n2_arr.push(_n1_arr[N - this.minBands] + BigInt(N - 1));
        }

        const res: { [index: number]: [bigint, bigint] } = {};
        for (let N = this.minBands; N <= maxN; N++) {
            res[N] = [_n2_arr[N - this.minBands], _n1_arr[N - this.minBands]];
        }

        return res;
    }

    public async createLoanBands(collateral: number | string, debt: number | string, range: number): Promise<[number, number]> {
        const [_n2, _n1] = await this._createLoanBands(collateral, debt, range);

        return [Number(_n2), Number(_n1)];
    }

    public async createLoanBandsAllRanges(collateral: number | string, debt: number | string): Promise<{ [index: number]: [number, number] | null }> {
        const _bandsAllRanges = await this._createLoanBandsAllRanges(collateral, debt);

        const bandsAllRanges: { [index: number]: [number, number] | null } = {};
        for (let N = this.minBands; N <= this.maxBands; N++) {
            if (_bandsAllRanges[N]) {
                bandsAllRanges[N] = _bandsAllRanges[N].map(Number) as [number, number];
            } else {
                bandsAllRanges[N] = null
            }
        }

        return bandsAllRanges;
    }

    public async createLoanPrices(collateral: number | string, debt: number | string, range: number): Promise<string[]> {
        const [_n2, _n1] = await this._createLoanBands(collateral, debt, range);

        return await this._getPrices(_n2, _n1);
    }

    public async createLoanPricesAllRanges(collateral: number | string, debt: number | string): Promise<{ [index: number]: [string, string] | null }> {
        const _bandsAllRanges = await this._createLoanBandsAllRanges(collateral, debt);

        const pricesAllRanges: { [index: number]: [string, string] | null } = {};
        for (let N = this.minBands; N <= this.maxBands; N++) {
            if (_bandsAllRanges[N]) {
                pricesAllRanges[N] = await this._calcPrices(..._bandsAllRanges[N]);
            } else {
                pricesAllRanges[N] = null
            }
        }

        return pricesAllRanges;
    }

    public async createLoanHealth(collateral: number | string, debt: number | string, range: number, full = true): Promise<string> {
        const _collateral = parseUnits(collateral, this.collateral_token.decimals);
        const _debt = parseUnits(debt, this.borrowed_token.decimals);

        const contract = llamalend.contracts[this.addresses.controller].contract;
        let _health = await contract.health_calculator(llamalend.constants.ZERO_ADDRESS, _collateral, _debt, full, range, llamalend.constantOptions) as bigint;
        _health = _health * BigInt(100);

        return formatUnits(_health);
    }

    public async createLoanIsApproved(collateral: number | string): Promise<boolean> {
        return await hasAllowance([this.collateral_token.address], [collateral], llamalend.signerAddress, this.addresses.controller);
    }

    private async createLoanApproveEstimateGas (collateral: number | string): Promise<TGas> {
        return await ensureAllowanceEstimateGas([this.collateral_token.address], [collateral], this.addresses.controller);
    }

    public async createLoanApprove(collateral: number | string): Promise<string[]> {
        return await ensureAllowance([this.collateral_token.address], [collateral], this.addresses.controller);
    }

    private async _createLoan(collateral: number | string, debt: number | string, range: number, estimateGas: boolean): Promise<string | TGas> {
        if (await this.userLoanExists()) throw Error("Loan already created");
        this._checkRange(range);

        const _collateral = parseUnits(collateral, this.collateral_token.decimals);
        const _debt = parseUnits(debt, this.borrowed_token.decimals);
        const contract = llamalend.contracts[this.addresses.controller].contract;
        const gas = await contract.create_loan.estimateGas(_collateral, _debt, range, { ...llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.create_loan(_collateral, _debt, range, { ...llamalend.options, gasLimit })).hash
    }

    public async createLoanEstimateGas(collateral: number | string, debt: number | string, range: number): Promise<TGas> {
        if (!(await this.createLoanIsApproved(collateral))) throw Error("Approval is needed for gas estimation");
        return await this._createLoan(collateral, debt,  range, true) as TGas;
    }

    public async createLoan(collateral: number | string, debt: number | string, range: number): Promise<string> {
        await this.createLoanApprove(collateral);
        return await this._createLoan(collateral, debt, range, false) as string;
    }

    // ---------------- BORROW MORE ----------------

    public async borrowMoreMaxRecv(collateralAmount: number | string): Promise<string> {
        const { _collateral: _currentCollateral, _debt: _currentDebt, _N } = await this._userState();
        const _collateral = _currentCollateral + parseUnits(collateralAmount, this.collateral_token.decimals);

        const contract = llamalend.contracts[this.addresses.controller].contract;
        const _debt: bigint = await contract.max_borrowable(_collateral, _N, _currentDebt, llamalend.constantOptions);

        return formatUnits(_debt - _currentDebt, this.borrowed_token.decimals);
    }

    private async _borrowMoreBands(collateral: number | string, debt: number | string): Promise<[bigint, bigint]> {
        const { _collateral: _currentCollateral, _debt: _currentDebt, _N } = await this._userState();
        if (_currentDebt === BigInt(0)) throw Error(`Loan for ${llamalend.signerAddress} does not exist`);

        const _collateral = _currentCollateral + parseUnits(collateral, this.collateral_token.decimals);
        const _debt = _currentDebt + parseUnits(debt, this.borrowed_token.decimals);

        const _n1 = await this._calcN1(_collateral, _debt, Number(_N));
        const _n2 = _n1 + _N - BigInt(1);

        return [_n2, _n1];
    }

    public async borrowMoreBands(collateral: number | string, debt: number | string): Promise<[number, number]> {
        const [_n2, _n1] = await this._borrowMoreBands(collateral, debt);

        return [Number(_n2), Number(_n1)];
    }

    public async borrowMorePrices(collateral: number | string, debt: number | string): Promise<string[]> {
        const [_n2, _n1] = await this._borrowMoreBands(collateral, debt);

        return await this._getPrices(_n2, _n1);
    }

    public async borrowMoreHealth(collateral: number | string, debt: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress(address);
        const _collateral = parseUnits(collateral, this.collateral_token.decimals);
        const _debt = parseUnits(debt, this.borrowed_token.decimals);

        const contract = llamalend.contracts[this.addresses.controller].contract;
        let _health = await contract.health_calculator(address, _collateral, _debt, full, 0, llamalend.constantOptions) as bigint;
        _health = _health * BigInt(100);

        return formatUnits(_health);
    }

    public async borrowMoreIsApproved(collateral: number | string): Promise<boolean> {
        return await hasAllowance([this.addresses.collateral_token], [collateral], llamalend.signerAddress, this.addresses.controller);
    }

    private async borrowMoreApproveEstimateGas (collateral: number | string): Promise<TGas> {
        return await ensureAllowanceEstimateGas([this.addresses.collateral_token], [collateral], this.addresses.controller);
    }

    public async borrowMoreApprove(collateral: number | string): Promise<string[]> {
        return await ensureAllowance([this.addresses.collateral_token], [collateral], this.addresses.controller);
    }

    private async _borrowMore(collateral: number | string, debt: number | string, estimateGas: boolean): Promise<string | TGas> {
        const { borrowed, debt: currentDebt } = await this.userState();
        if (Number(currentDebt) === 0) throw Error(`Loan for ${llamalend.signerAddress} does not exist`);
        if (Number(borrowed) > 0) throw Error(`User ${llamalend.signerAddress} is already in liquidation mode`);

        const _collateral = parseUnits(collateral, this.collateral_token.decimals);
        const _debt = parseUnits(debt, this.borrowed_token.decimals);
        const contract = llamalend.contracts[this.addresses.controller].contract;
        const gas = await contract.borrow_more.estimateGas(_collateral, _debt, { ...llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.borrow_more(_collateral, _debt, { ...llamalend.options, gasLimit })).hash
    }

    public async borrowMoreEstimateGas(collateral: number | string, debt: number | string): Promise<TGas> {
        if (!(await this.borrowMoreIsApproved(collateral))) throw Error("Approval is needed for gas estimation");
        return await this._borrowMore(collateral, debt, true) as TGas;
    }

    public async borrowMore(collateral: number | string, debt: number | string): Promise<string> {
        await this.borrowMoreApprove(collateral);
        return await this._borrowMore(collateral, debt, false) as string;
    }

    // ---------------- ADD COLLATERAL ----------------

    private async _addCollateralBands(collateral: number | string, address = ""): Promise<[bigint, bigint]> {
        address = _getAddress(address);
        const { _collateral: _currentCollateral, _debt: _currentDebt, _N } = await this._userState(address);
        if (_currentDebt === BigInt(0)) throw Error(`Loan for ${address} does not exist`);

        const _collateral = _currentCollateral + parseUnits(collateral, this.collateral_token.decimals);
        const _n1 = await this._calcN1(_collateral, _currentDebt, Number(_N));
        const _n2 = _n1 + _N - BigInt(1);

        return [_n2, _n1];
    }

    public async addCollateralBands(collateral: number | string, address = ""): Promise<[number, number]> {
        const [_n2, _n1] = await this._addCollateralBands(collateral, address);

        return [Number(_n2), Number(_n1)];
    }

    public async addCollateralPrices(collateral: number | string, address = ""): Promise<string[]> {
        const [_n2, _n1] = await this._addCollateralBands(collateral, address);

        return await this._getPrices(_n2, _n1);
    }

    public async addCollateralHealth(collateral: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress(address);
        const _collateral = parseUnits(collateral, this.collateral_token.decimals);

        const contract = llamalend.contracts[this.addresses.controller].contract;
        let _health = await contract.health_calculator(address, _collateral, 0, full, 0, llamalend.constantOptions) as bigint;
        _health = _health * BigInt(100);

        return formatUnits(_health);
    }

    public async addCollateralIsApproved(collateral: number | string): Promise<boolean> {
        return await hasAllowance([this.addresses.collateral_token], [collateral], llamalend.signerAddress, this.addresses.controller);
    }

    private async addCollateralApproveEstimateGas (collateral: number | string): Promise<TGas> {
        return await ensureAllowanceEstimateGas([this.addresses.collateral_token], [collateral], this.addresses.controller);
    }

    public async addCollateralApprove(collateral: number | string): Promise<string[]> {
        return await ensureAllowance([this.addresses.collateral_token], [collateral], this.addresses.controller);
    }

    private async _addCollateral(collateral: number | string, address: string, estimateGas: boolean): Promise<string | TGas> {
        const { borrowed, debt: currentDebt } = await this.userState(address);
        if (Number(currentDebt) === 0) throw Error(`Loan for ${address} does not exist`);
        if (Number(borrowed) > 0) throw Error(`User ${address} is already in liquidation mode`);

        const _collateral = parseUnits(collateral, this.collateral_token.decimals);
        const contract = llamalend.contracts[this.addresses.controller].contract;
        const gas = await contract.add_collateral.estimateGas(_collateral, address, { ...llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.add_collateral(_collateral, address, { ...llamalend.options, gasLimit })).hash
    }

    public async addCollateralEstimateGas(collateral: number | string, address = ""): Promise<TGas> {
        address = _getAddress(address);
        if (!(await this.addCollateralIsApproved(collateral))) throw Error("Approval is needed for gas estimation");
        return await this._addCollateral(collateral, address, true) as TGas;
    }

    public async addCollateral(collateral: number | string, address = ""): Promise<string> {
        address = _getAddress(address);
        await this.addCollateralApprove(collateral);
        return await this._addCollateral(collateral, address, false) as string;
    }

    // ---------------- REMOVE COLLATERAL ----------------

    public async maxRemovable(): Promise<string> {
        const { _collateral: _currentCollateral, _debt: _currentDebt, _N } = await this._userState();
        const _requiredCollateral = await llamalend.contracts[this.addresses.controller].contract.min_collateral(_currentDebt, _N, llamalend.constantOptions)

        return formatUnits(_currentCollateral - _requiredCollateral, this.collateral_token.decimals);
    }

    private async _removeCollateralBands(collateral: number | string): Promise<[bigint, bigint]> {
        const { _collateral: _currentCollateral, _debt: _currentDebt, _N } = await this._userState();
        if (_currentDebt === BigInt(0)) throw Error(`Loan for ${llamalend.signerAddress} does not exist`);

        const _collateral = _currentCollateral - parseUnits(collateral, this.collateral_token.decimals);
        const _n1 = await this._calcN1(_collateral, _currentDebt, Number(_N));
        const _n2 = _n1 + _N - BigInt(1);

        return [_n2, _n1];
    }

    public async removeCollateralBands(collateral: number | string): Promise<[number, number]> {
        const [_n2, _n1] = await this._removeCollateralBands(collateral);

        return [Number(_n2), Number(_n1)];
    }

    public async removeCollateralPrices(collateral: number | string): Promise<string[]> {
        const [_n2, _n1] = await this._removeCollateralBands(collateral);

        return await this._getPrices(_n2, _n1);
    }

    public async removeCollateralHealth(collateral: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress(address);
        const _collateral = parseUnits(collateral, this.collateral_token.decimals) * BigInt(-1);

        const contract = llamalend.contracts[this.addresses.controller].contract;
        let _health = await contract.health_calculator(address, _collateral, 0, full, 0, llamalend.constantOptions) as bigint;
        _health = _health * BigInt(100);

        return formatUnits(_health);
    }

    private async _removeCollateral(collateral: number | string, estimateGas: boolean): Promise<string | TGas> {
        const { borrowed, debt: currentDebt } = await this.userState();
        if (Number(currentDebt) === 0) throw Error(`Loan for ${llamalend.signerAddress} does not exist`);
        if (Number(borrowed) > 0) throw Error(`User ${llamalend.signerAddress} is already in liquidation mode`);

        const _collateral = parseUnits(collateral, this.collateral_token.decimals);
        const contract = llamalend.contracts[this.addresses.controller].contract;
        const gas = await contract.remove_collateral.estimateGas(_collateral, llamalend.constantOptions);
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.remove_collateral(_collateral, { ...llamalend.options, gasLimit })).hash
    }

    public async removeCollateralEstimateGas(collateral: number | string): Promise<TGas> {
        return await this._removeCollateral(collateral, true) as TGas;
    }

    public async removeCollateral(collateral: number | string): Promise<string> {
        return await this._removeCollateral(collateral, false) as string;
    }

    // ---------------- REPAY ----------------

    private async _repayBands(debt: number | string, address: string): Promise<[bigint, bigint]> {
        const { _collateral: _currentCollateral, _borrowed, _debt: _currentDebt, _N } = await this._userState(address);
        if (_currentDebt === BigInt(0)) throw Error(`Loan for ${address} does not exist`);
        if (_borrowed > BigInt(0)) return await this._userBands(address) as [bigint, bigint];

        const _debt = _currentDebt - parseUnits(debt, this.borrowed_token.decimals);
        const _n1 = await this._calcN1(_currentCollateral, _debt, Number(_N));
        const _n2 = _n1 + _N - BigInt(1);

        return [_n2, _n1];
    }

    public async repayBands(debt: number | string, address = ""): Promise<[number, number]> {
        const [_n2, _n1] = await this._repayBands(debt, address);

        return [Number(_n2), Number(_n1)];
    }

    public async repayPrices(debt: number | string, address = ""): Promise<string[]> {
        const [_n2, _n1] = await this._repayBands(debt, address);

        return await this._getPrices(_n2, _n1);
    }

    public async repayIsApproved(debt: number | string): Promise<boolean> {
        return await hasAllowance([this.borrowed_token.address], [debt], llamalend.signerAddress, this.addresses.controller);
    }

    private async repayApproveEstimateGas (debt: number | string): Promise<TGas> {
        return await ensureAllowanceEstimateGas([this.borrowed_token.address], [debt], this.addresses.controller);
    }

    public async repayApprove(debt: number | string): Promise<string[]> {
        return await ensureAllowance([this.borrowed_token.address], [debt], this.addresses.controller);
    }

    public async repayHealth(debt: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress(address);
        const _debt = parseUnits(debt) * BigInt(-1);

        const contract = llamalend.contracts[this.addresses.controller].contract;
        let _health = await contract.health_calculator(address, 0, _debt, full, 0, llamalend.constantOptions) as bigint;
        _health = _health * BigInt(100);

        return formatUnits(_health);
    }

    private async _repay(debt: number | string, address: string, estimateGas: boolean): Promise<string | TGas> {
        address = _getAddress(address);
        const { debt: currentDebt } = await this.userState(address);
        if (Number(currentDebt) === 0) throw Error(`Loan for ${address} does not exist`);

        const _debt = parseUnits(debt);
        const contract = llamalend.contracts[this.addresses.controller].contract;
        const [_, n1] = await this.userBands(address);
        const { borrowed } = await this.userState(address);
        const n = (BN(borrowed).gt(0)) ? MAX_ACTIVE_BAND : n1 - 1;  // In liquidation mode it doesn't matter if active band moves
        const gas = await contract.repay.estimateGas(_debt, address, n, llamalend.constantOptions);
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.repay(_debt, address, n, { ...llamalend.options, gasLimit })).hash
    }

    public async repayEstimateGas(debt: number | string, address = ""): Promise<TGas> {
        if (!(await this.repayIsApproved(debt))) throw Error("Approval is needed for gas estimation");
        return await this._repay(debt, address, true) as TGas;
    }

    public async repay(debt: number | string, address = ""): Promise<string> {
        await this.repayApprove(debt);
        return await this._repay(debt, address, false) as string;
    }

    // ---------------- FULL REPAY ----------------

    private async _fullRepayAmount(address = ""): Promise<string> {
        address = _getAddress(address);
        const { debt } = await this.userState(address);
        return BN(debt).times(1.0001).toString();
    }

    public async fullRepayIsApproved(address = ""): Promise<boolean> {
        address = _getAddress(address);
        const fullRepayAmount = await this._fullRepayAmount(address);
        return await this.repayIsApproved(fullRepayAmount);
    }

    private async fullRepayApproveEstimateGas (address = ""): Promise<TGas> {
        address = _getAddress(address);
        const fullRepayAmount = await this._fullRepayAmount(address);
        return await this.repayApproveEstimateGas(fullRepayAmount);
    }

    public async fullRepayApprove(address = ""): Promise<string[]> {
        address = _getAddress(address);
        const fullRepayAmount = await this._fullRepayAmount(address);
        return await this.repayApprove(fullRepayAmount);
    }

    public async fullRepayEstimateGas(address = ""): Promise<TGas> {
        address = _getAddress(address);
        const fullRepayAmount = await this._fullRepayAmount(address);
        if (!(await this.repayIsApproved(fullRepayAmount))) throw Error("Approval is needed for gas estimation");
        return await this._repay(fullRepayAmount, address, true) as TGas;
    }

    public async fullRepay(address = ""): Promise<string> {
        address = _getAddress(address);
        const fullRepayAmount = await this._fullRepayAmount(address);
        await this.repayApprove(fullRepayAmount);
        return await this._repay(fullRepayAmount, address, false) as string;
    }

    // ---------------- SWAP ----------------

    public async maxSwappable(i: number, j: number): Promise<string> {
        if (!(i === 0 && j === 1) && !(i === 1 && j === 0)) throw Error("Wrong index");
        const inDecimals = this.coinDecimals[i];
        const contract = llamalend.contracts[this.addresses.amm].contract;
        const [_inAmount, _outAmount] = await contract.get_dxdy(i, j, MAX_ALLOWANCE, llamalend.constantOptions) as bigint[];
        if (_outAmount === BigInt(0)) return "0";

        return formatUnits(_inAmount, inDecimals)
    }

    private async _swapExpected(i: number, j: number, _amount: bigint): Promise<bigint> {
        return await llamalend.contracts[this.addresses.amm].contract.get_dy(i, j, _amount, llamalend.constantOptions) as bigint;
    }

    public async swapExpected(i: number, j: number, amount: number | string): Promise<string> {
        if (!(i === 0 && j === 1) && !(i === 1 && j === 0)) throw Error("Wrong index");
        const [inDecimals, outDecimals] = this.coinDecimals;
        const _amount = parseUnits(amount, inDecimals);
        const _expected = await this._swapExpected(i, j, _amount);

        return formatUnits(_expected, outDecimals)
    }

    public async swapRequired(i: number, j: number, outAmount: number | string): Promise<string> {
        if (!(i === 0 && j === 1) && !(i === 1 && j === 0)) throw Error("Wrong index");
        const [inDecimals, outDecimals] = this.coinDecimals;
        const _amount = parseUnits(outAmount, outDecimals);
        const _expected = await llamalend.contracts[this.addresses.amm].contract.get_dx(i, j, _amount, llamalend.constantOptions) as bigint;

        return formatUnits(_expected, inDecimals)
    }

    public async swapPriceImpact(i: number, j: number, amount: number | string): Promise<string> {
        if (!(i === 0 && j === 1) && !(i === 1 && j === 0)) throw Error("Wrong index");
        const [inDecimals, outDecimals] = this.coinDecimals;
        const _amount = parseUnits(amount, inDecimals);
        const _output = await this._swapExpected(i, j, _amount);

        // Find k for which x * k = 10^15 or y * k = 10^15: k = max(10^15 / x, 10^15 / y)
        // For coins with d (decimals) <= 15: k = min(k, 0.2), and x0 = min(x * k, 10^d)
        // x0 = min(x * min(max(10^15 / x, 10^15 / y), 0.2), 10^d), if x0 == 0 then priceImpact = 0
        const target = BN(10 ** 15);
        const amountIntBN = BN(amount).times(10 ** inDecimals);
        const outputIntBN = toBN(_output, 0);
        const k = BigNumber.min(BigNumber.max(target.div(amountIntBN), target.div(outputIntBN)), 0.2);
        const smallAmountIntBN = BigNumber.min(amountIntBN.times(k), BN(10 ** inDecimals));
        if (smallAmountIntBN.toFixed(0) === '0') return '0';

        const _smallAmount = fromBN(smallAmountIntBN.div(10 ** inDecimals), inDecimals);
        const _smallOutput = await this._swapExpected(i, j, _smallAmount);

        const amountBN = BN(amount);
        const outputBN = toBN(_output, outDecimals);
        const smallAmountBN = toBN(_smallAmount, inDecimals);
        const smallOutputBN = toBN(_smallOutput, outDecimals);

        const rateBN = outputBN.div(amountBN);
        const smallRateBN = smallOutputBN.div(smallAmountBN);
        if (rateBN.gt(smallRateBN)) return "0";

        const slippageBN = BN(1).minus(rateBN.div(smallRateBN)).times(100);

        return _cutZeros(slippageBN.toFixed(6));
    }

    public async swapIsApproved(i: number, amount: number | string): Promise<boolean> {
        if (i !== 0 && i !== 1) throw Error("Wrong index");

        return await hasAllowance([this.coinAddresses[i]], [amount], llamalend.signerAddress, this.addresses.amm);
    }

    private async swapApproveEstimateGas (i: number, amount: number | string): Promise<TGas> {
        if (i !== 0 && i !== 1) throw Error("Wrong index");

        return await ensureAllowanceEstimateGas([this.coinAddresses[i]], [amount], this.addresses.amm);
    }

    public async swapApprove(i: number, amount: number | string): Promise<string[]> {
        if (i !== 0 && i !== 1) throw Error("Wrong index");

        return await ensureAllowance([this.coinAddresses[i]], [amount], this.addresses.amm);
    }

    private async _swap(i: number, j: number, amount: number | string, slippage: number, estimateGas: boolean): Promise<string | TGas> {
        if (!(i === 0 && j === 1) && !(i === 1 && j === 0)) throw Error("Wrong index");

        const [inDecimals, outDecimals] = [this.coinDecimals[i], this.coinDecimals[j]];
        const _amount = parseUnits(amount, inDecimals);
        const _expected = await this._swapExpected(i, j, _amount);
        const minRecvAmountBN: BigNumber = toBN(_expected, outDecimals).times(100 - slippage).div(100);
        const _minRecvAmount = fromBN(minRecvAmountBN, outDecimals);
        const contract = llamalend.contracts[this.addresses.amm].contract;
        const gas = await contract.exchange.estimateGas(i, j, _amount, _minRecvAmount, llamalend.constantOptions);
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.exchange(i, j, _amount, _minRecvAmount, { ...llamalend.options, gasLimit })).hash
    }

    public async swapEstimateGas(i: number, j: number, amount: number | string, slippage = 0.1): Promise<TGas> {
        if (!(await this.swapIsApproved(i, amount))) throw Error("Approval is needed for gas estimation");
        return await this._swap(i, j, amount, slippage, true) as TGas;
    }

    public async swap(i: number, j: number, amount: number | string, slippage = 0.1): Promise<string> {
        await this.swapApprove(i, amount);
        return await this._swap(i, j, amount, slippage, false) as string;
    }

    // ---------------- LIQUIDATE ----------------

    public async tokensToLiquidate(address = ""): Promise<string> {
        address = _getAddress(address);
        const _tokens = await llamalend.contracts[this.addresses.controller].contract.tokens_to_liquidate(address, llamalend.constantOptions) as bigint;

        return formatUnits(_tokens, this.borrowed_token.decimals)
    }

    public async liquidateIsApproved(address = ""): Promise<boolean> {
        const tokensToLiquidate = await this.tokensToLiquidate(address);
        return await hasAllowance([this.addresses.borrowed_token], [tokensToLiquidate], llamalend.signerAddress, this.addresses.controller);
    }

    private async liquidateApproveEstimateGas (address = ""): Promise<TGas> {
        const tokensToLiquidate = await this.tokensToLiquidate(address);
        return await ensureAllowanceEstimateGas([this.addresses.borrowed_token], [tokensToLiquidate], this.addresses.controller);
    }

    public async liquidateApprove(address = ""): Promise<string[]> {
        const tokensToLiquidate = await this.tokensToLiquidate(address);
        return await ensureAllowance([this.addresses.borrowed_token], [tokensToLiquidate], this.addresses.controller);
    }

    private async _liquidate(address: string, slippage: number, estimateGas: boolean): Promise<string | TGas> {
        const { borrowed, debt: currentDebt } = await this.userState(address);
        if (slippage <= 0) throw Error("Slippage must be > 0");
        if (slippage > 100) throw Error("Slippage must be <= 100");
        if (Number(currentDebt) === 0) throw Error(`Loan for ${address} does not exist`);
        if (Number(borrowed) === 0) throw Error(`User ${address} is not in liquidation mode`);

        const minAmountBN: BigNumber = BN(borrowed).times(100 - slippage).div(100);
        const _minAmount = fromBN(minAmountBN);
        const contract = llamalend.contracts[this.addresses.controller].contract;
        const gas = (await contract.liquidate.estimateGas(address, _minAmount, llamalend.constantOptions))
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.liquidate(address, _minAmount, { ...llamalend.options, gasLimit })).hash
    }

    public async liquidateEstimateGas(address: string, slippage = 0.1): Promise<TGas> {
        if (!(await this.liquidateIsApproved(address))) throw Error("Approval is needed for gas estimation");
        return await this._liquidate(address, slippage, true) as TGas;
    }

    public async liquidate(address: string, slippage = 0.1): Promise<string> {
        await this.liquidateApprove(address);
        return await this._liquidate(address, slippage, false) as string;
    }

    // ---------------- SELF-LIQUIDATE ----------------

    public async selfLiquidateIsApproved(): Promise<boolean> {
        return await this.liquidateIsApproved()
    }

    private async selfLiquidateApproveEstimateGas (): Promise<TGas> {
        return this.liquidateApproveEstimateGas()
    }

    public async selfLiquidateApprove(): Promise<string[]> {
        return await this.liquidateApprove()
    }

    public async selfLiquidateEstimateGas(slippage = 0.1): Promise<TGas> {
        if (!(await this.selfLiquidateIsApproved())) throw Error("Approval is needed for gas estimation");
        return await this._liquidate(llamalend.signerAddress, slippage, true) as TGas;
    }

    public async selfLiquidate(slippage = 0.1): Promise<string> {
        await this.selfLiquidateApprove();
        return await this._liquidate(llamalend.signerAddress, slippage, false) as string;
    }

    // ---------------- LEVERAGE CREATE LOAN ----------------

    private hasLeverage = (): boolean => {
        return llamalend.constants.ALIASES.leverage_zap !== llamalend.constants.ZERO_ADDRESS &&
            this._getMarketId() >= Number(llamalend.constants.ALIASES["leverage_markets_start_id"]);
    }

    private _checkLeverageZap(): void {
        if (!this.hasLeverage()) {
            throw Error("This market does not support leverage");
        }
    }

    private async _get_k_effective_BN(N: number): Promise<BigNumber> {
        // d_k_effective: uint256 = (1 - loan_discount) * sqrt((A-1)/A) / N
        // k_effective = d_k_effective * sum_{0..N-1}(((A-1) / A)**k)
        const { loan_discount, A } = await this.statsParameters();
        const A_BN = BN(A);
        const A_ratio_BN = A_BN.minus(1).div(A_BN);

        const d_k_effective_BN = BN(100).minus(loan_discount).div(100).times(A_ratio_BN.sqrt()).div(N);
        let S = BN(0);
        for (let n = 0; n < N; n++) {
            S = S.plus(A_ratio_BN.pow(n))
        }

        return d_k_effective_BN.times(S);
    }

    private async maxLeverage(N: number): Promise<string> {
        // max_leverage = 1 / (k_effective - 1)
        const k_effective_BN = await this._get_k_effective_BN(N);

        return BN(1).div(BN(1).minus(k_effective_BN)).toString()
    }

    private async leverageCreateLoanMaxRecv(userCollateral: TAmount, userBorrowed: TAmount, range: number):
        Promise<{
            maxDebt: string,
            maxTotalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromMaxDebt: string,
            maxLeverage: string,
            avgPrice: string,
        }> {
        // max_borrowable = userCollateral / (1 / (k_effective * max_p_base) - 1 / p_avg)
        this._checkLeverageZap();
        if (range > 0) this._checkRange(range);
        const _userCollateral = parseUnits(userCollateral, this.collateral_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.borrowed_token.decimals);

        const oraclePriceBand = await this.oraclePriceBand();
        let pAvgBN = BN(await this.calcTickPrice(oraclePriceBand)); // upper tick of oracle price band
        let maxBorrowablePrevBN = BN(0);
        let maxBorrowableBN = BN(0);
        let _userEffectiveCollateral = BigInt(0);
        let _maxLeverageCollateral = BigInt(0);

        const contract = llamalend.contracts[llamalend.constants.ALIASES.leverage_zap].contract;
        for (let i = 0; i < 5; i++) {
            maxBorrowablePrevBN = maxBorrowableBN;
            _userEffectiveCollateral = _userCollateral + fromBN(BN(userBorrowed).div(pAvgBN), this.collateral_token.decimals);
            let _maxBorrowable = await contract.max_borrowable(this.addresses.controller, _userEffectiveCollateral, _maxLeverageCollateral, range, fromBN(pAvgBN));
            _maxBorrowable = _maxBorrowable * BigInt(998) / BigInt(1000)
            if (_maxBorrowable === BigInt(0)) break;
            maxBorrowableBN = toBN(_maxBorrowable, this.borrowed_token.decimals);

            if (maxBorrowableBN.minus(maxBorrowablePrevBN).abs().div(maxBorrowablePrevBN).lt(0.0005)) {
                maxBorrowableBN = maxBorrowablePrevBN;
                break;
            }

            // additionalCollateral = (userBorrowed / p) + leverageCollateral
            const _maxAdditionalCollateral = BigInt(await _getExpectedOdos(
                this.addresses.borrowed_token, this.addresses.collateral_token, _maxBorrowable + _userBorrowed, this.addresses.amm));
            pAvgBN = maxBorrowableBN.plus(userBorrowed).div(toBN(_maxAdditionalCollateral, this.collateral_token.decimals));
            _maxLeverageCollateral = _maxAdditionalCollateral - fromBN(BN(userBorrowed).div(pAvgBN), this.collateral_token.decimals);
        }

        const userEffectiveCollateralBN = maxBorrowableBN.gt(0) ? toBN(_userEffectiveCollateral, this.collateral_token.decimals) : BN(0);
        const maxLeverageCollateralBN = toBN(_maxLeverageCollateral, this.collateral_token.decimals);

        return {
            maxDebt: formatNumber(maxBorrowableBN.toString(), this.borrowed_token.decimals),
            maxTotalCollateral: formatNumber(maxLeverageCollateralBN.plus(userEffectiveCollateralBN).toString(), this.collateral_token.decimals),
            userCollateral: formatNumber(userCollateral, this.collateral_token.decimals),
            collateralFromUserBorrowed: formatNumber(BN(userBorrowed).div(pAvgBN).toString(), this.collateral_token.decimals),
            collateralFromMaxDebt: formatNumber(maxLeverageCollateralBN.toString(), this.collateral_token.decimals),
            maxLeverage: maxLeverageCollateralBN.plus(userEffectiveCollateralBN).div(userEffectiveCollateralBN).toString(),
            avgPrice: pAvgBN.toString(),
        };
    }

    private leverageCreateLoanMaxRecvAllRanges = memoize(async (userCollateral: TAmount, userBorrowed: TAmount):
        Promise<IDict<{
            maxDebt: string,
            maxTotalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromMaxDebt: string,
            maxLeverage: string,
            avgPrice: string,
        }>> => {
        this._checkLeverageZap();
        const _userCollateral = parseUnits(userCollateral, this.collateral_token.decimals);
        const contract = llamalend.contracts[llamalend.constants.ALIASES.leverage_zap].multicallContract;

        const oraclePriceBand = await this.oraclePriceBand();
        const pAvgApproxBN = BN(await this.calcTickPrice(oraclePriceBand)); // upper tick of oracle price band
        let pAvgBN: BigNumber | null = null;
        const arrLength = this.maxBands - this.minBands + 1;
        let maxLeverageCollateralBN: BigNumber[] = new Array(arrLength).fill(BN(0));
        let _maxLeverageCollateral: bigint[] = new Array(arrLength).fill(BigInt(0));
        let maxBorrowablePrevBN: BigNumber[] = new Array(arrLength).fill(BN(0));
        let maxBorrowableBN: BigNumber[] = new Array(arrLength).fill(BN(0));
        let _maxBorrowable: bigint[] = new Array(arrLength).fill(BigInt(0));

        for (let i = 0; i < 5; i++) {
            const pBN = pAvgBN ?? pAvgApproxBN;
            maxBorrowablePrevBN = maxBorrowableBN;
            const _userEffectiveCollateral: bigint = _userCollateral + fromBN(BN(userBorrowed).div(pBN), this.collateral_token.decimals);
            const calls = [];
            for (let N = this.minBands; N <= this.maxBands; N++) {
                const j = N - this.minBands;
                calls.push(contract.max_borrowable(this.addresses.controller, _userEffectiveCollateral, _maxLeverageCollateral[j], N, fromBN(pBN)));
            }
            _maxBorrowable = (await llamalend.multicallProvider.all(calls) as bigint[]).map((_mb) => _mb * BigInt(998) / BigInt(1000));
            maxBorrowableBN = _maxBorrowable.map((_mb) => toBN(_mb, this.borrowed_token.decimals));

            const deltaBN = maxBorrowableBN.map((mb, l) => mb.minus(maxBorrowablePrevBN[l]).abs().div(mb));
            if (BigNumber.max(...deltaBN).lt(0.0005)) {
                maxBorrowableBN = maxBorrowablePrevBN;
                break;
            }

            if (pAvgBN === null){
                const _y = BigInt(await _getExpectedOdos(this.addresses.borrowed_token, this.addresses.collateral_token, _maxBorrowable[0], this.addresses.amm));
                const yBN = toBN(_y, this.collateral_token.decimals);
                pAvgBN = maxBorrowableBN[0].div(yBN);
            }

            maxLeverageCollateralBN = maxBorrowableBN.map((mb) => mb.div(pAvgBN as BigNumber));
            _maxLeverageCollateral = maxLeverageCollateralBN.map((mlc) => fromBN(mlc, this.collateral_token.decimals));
        }

        const userEffectiveCollateralBN = BN(userCollateral).plus(BN(userBorrowed).div(pAvgBN as BigNumber));

        const res: IDict<{
            maxDebt: string,
            maxTotalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromMaxDebt: string,
            maxLeverage: string,
            avgPrice: string,
        }> = {};
        for (let N = this.minBands; N <= this.maxBands; N++) {
            const j = N - this.minBands;
            res[N] = {
                maxDebt: formatNumber(maxBorrowableBN[j].toString(), this.borrowed_token.decimals),
                maxTotalCollateral: formatNumber(maxLeverageCollateralBN[j].plus(userEffectiveCollateralBN).toString(), this.collateral_token.decimals),
                userCollateral: formatNumber(userCollateral, this.collateral_token.decimals),
                collateralFromUserBorrowed: formatNumber(BN(userBorrowed).div(pAvgBN as BigNumber).toString(), this.collateral_token.decimals),
                collateralFromMaxDebt: formatNumber(maxLeverageCollateralBN[j].toString(), this.collateral_token.decimals),
                maxLeverage: maxLeverageCollateralBN[j].plus(userEffectiveCollateralBN).div(userEffectiveCollateralBN).toString(),
                avgPrice: (pAvgBN as BigNumber).toString(),
            };
        }

        return res;
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    private _setSwapDataToCache = async (inputCoinAddress: string, outputCoinAddress: string, _amount: bigint, slippage: number) => {
        let swapData = await _getQuoteOdos(inputCoinAddress, outputCoinAddress, _amount, this.addresses.amm, true, slippage);
        while (swapData.pathId == null) {
            swapData = await _getQuoteOdos(inputCoinAddress, outputCoinAddress, _amount, this.addresses.amm, true, slippage);
        }
        const key = `${inputCoinAddress}-${_amount}`;
        this.swapDataCache[key] = { ...swapData, slippage };
    }

    private _getSwapDataFromCache = (inputCoinAddress: string, _amount: bigint): IQuoteOdos => {
        const key = `${inputCoinAddress}-${_amount}`;
        if (!(key in this.swapDataCache)) throw Error(
            "You must call corresponding `expected` method first " +
            "(leverage.createLoanExpectedCollateral, leverage.borrowMoreExpectedCollateral or leverage.repayExpectedBorrowed)"
        );

        return this.swapDataCache[key]
    }

    private _leverageExpectedCollateral = async (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, user?: string):
        Promise<{ _futureStateCollateral: bigint, _totalCollateral: bigint, _userCollateral: bigint,
            _collateralFromUserBorrowed: bigint, _collateralFromDebt: bigint, avgPrice: string }> => {
        const _userCollateral = parseUnits(userCollateral, this.collateral_token.decimals);
        const _debt = parseUnits(debt, this.borrowed_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.borrowed_token.decimals);
        // additionalCollateral = (userBorrowed / p) + leverageCollateral
        const _additionalCollateral = BigInt(this._getSwapDataFromCache(this.addresses.borrowed_token, _debt + _userBorrowed).outAmounts[0]);
        const _collateralFromDebt = _debt * BigInt(10**18) / (_debt + _userBorrowed) * _additionalCollateral / BigInt(10**18);
        const _collateralFromUserBorrowed = _additionalCollateral - _collateralFromDebt;
        let _stateCollateral = BigInt(0);
        if (user) {
            const { _collateral, _borrowed } = await this._userState(user);
            if (_borrowed > BigInt(0)) throw Error(`User ${user} is already in liquidation mode`);
            _stateCollateral = _collateral;
        }
        const _totalCollateral = _userCollateral + _additionalCollateral;
        const _futureStateCollateral = _stateCollateral + _totalCollateral;
        const avgPrice = toBN(_debt + _userBorrowed, this.borrowed_token.decimals).div(toBN(_additionalCollateral, this.collateral_token.decimals)).toString();

        return { _futureStateCollateral, _totalCollateral, _userCollateral, _collateralFromUserBorrowed, _collateralFromDebt, avgPrice };
    };

    private async leverageCreateLoanExpectedCollateral(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, slippage = 0.1):
        Promise<{ totalCollateral: string, userCollateral: string, collateralFromUserBorrowed: string, collateralFromDebt: string, leverage: string, avgPrice: string }> {
        this._checkLeverageZap();
        const _debt = parseUnits(debt, this.borrowed_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.borrowed_token.decimals);
        await this._setSwapDataToCache(this.addresses.borrowed_token, this.addresses.collateral_token, _debt + _userBorrowed, slippage);
        const { _totalCollateral, _userCollateral, _collateralFromUserBorrowed, _collateralFromDebt, avgPrice } =
            await this._leverageExpectedCollateral(userCollateral, userBorrowed, debt);
        return {
            totalCollateral: formatUnits(_totalCollateral, this.collateral_token.decimals),
            userCollateral: formatUnits(_userCollateral, this.collateral_token.decimals),
            collateralFromUserBorrowed: formatUnits(_collateralFromUserBorrowed, this.collateral_token.decimals),
            collateralFromDebt: formatUnits(_collateralFromDebt, this.collateral_token.decimals),
            leverage: toBN(_collateralFromDebt + _userCollateral + _collateralFromUserBorrowed, this.collateral_token.decimals)
                .div(toBN(_userCollateral + _collateralFromUserBorrowed, this.collateral_token.decimals)).toString(),
            avgPrice,
        }
    }

    private async leverageCreateLoanPriceImpact(userBorrowed: TAmount, debt: TAmount): Promise<string> {
        this._checkLeverageZap();
        const _debt = parseUnits(debt, this.borrowed_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.borrowed_token.decimals);
        return this._getSwapDataFromCache(this.addresses.borrowed_token, _debt + _userBorrowed).priceImpact.toString();
    }

    private async leverageCreateLoanMaxRange(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount): Promise<number> {
        this._checkLeverageZap();
        const maxRecv = await this.leverageCreateLoanMaxRecvAllRanges(userCollateral, userBorrowed);
        for (let N = this.minBands; N <= this.maxBands; N++) {
            if (BN(debt).gt(maxRecv[N].maxDebt)) return N - 1;
        }

        return this.maxBands;
    }

    private _leverageCalcN1 = memoize(async (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, user?: string): Promise<bigint> => {
        if (range > 0) this._checkRange(range);
        let _stateDebt = BigInt(0);
        if (user) {
            const { _debt, _borrowed, _N } = await this._userState(user);
            if (_borrowed > BigInt(0)) throw Error(`User ${user} is already in liquidation mode`);
            _stateDebt = _debt;
            if (range < 0) range = Number(llamalend.formatUnits(_N, 0));
        }
        const { _futureStateCollateral } = await this._leverageExpectedCollateral(userCollateral, userBorrowed, debt, user);
        const _debt = _stateDebt + parseUnits(debt, this.borrowed_token.decimals);
        return await llamalend.contracts[this.addresses.controller].contract.calculate_debt_n1(_futureStateCollateral, _debt, range, llamalend.constantOptions);
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    private _leverageCalcN1AllRanges = memoize(async (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, maxN: number): Promise<bigint[]> => {
        const { _futureStateCollateral } = await this._leverageExpectedCollateral(userCollateral, userBorrowed, debt);
        const _debt = parseUnits(debt, this.borrowed_token.decimals);
        const calls = [];
        for (let N = this.minBands; N <= maxN; N++) {
            calls.push(llamalend.contracts[this.addresses.controller].multicallContract.calculate_debt_n1(_futureStateCollateral, _debt, N));
        }
        return await llamalend.multicallProvider.all(calls) as bigint[];
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    private async _leverageBands(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, user?: string): Promise<[bigint, bigint]> {
        const _n1 = await this._leverageCalcN1(userCollateral, userBorrowed, debt, range, user);
        if (range < 0) {
            const { N } = await this.userState(user);
            range = Number(N);
        }
        const _n2 = _n1 + BigInt(range - 1);

        return [_n2, _n1];
    }

    private async _leverageCreateLoanBandsAllRanges(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount): Promise<IDict<[bigint, bigint]>> {
        const maxN = await this.leverageCreateLoanMaxRange(userCollateral, userBorrowed, debt);
        const _n1_arr = await this._leverageCalcN1AllRanges(userCollateral, userBorrowed, debt, maxN);
        const _n2_arr: bigint[] = [];
        for (let N = this.minBands; N <= maxN; N++) {
            _n2_arr.push(_n1_arr[N - this.minBands] + BigInt(N - 1));
        }

        const _bands: IDict<[bigint, bigint]> = {};
        for (let N = this.minBands; N <= maxN; N++) {
            _bands[N] = [_n2_arr[N - this.minBands], _n1_arr[N - this.minBands]];
        }

        return _bands;
    }

    private async leverageCreateLoanBands(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number): Promise<[number, number]> {
        this._checkLeverageZap();
        const [_n2, _n1] = await this._leverageBands(userCollateral, userBorrowed, debt, range);

        return [Number(_n2), Number(_n1)];
    }

    private async leverageCreateLoanBandsAllRanges(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount): Promise<IDict<[number, number] | null>> {
        this._checkLeverageZap();
        const _bands = await this._leverageCreateLoanBandsAllRanges(userCollateral, userBorrowed, debt);

        const bands: { [index: number]: [number, number] | null } = {};
        for (let N = this.minBands; N <= this.maxBands; N++) {
            if (_bands[N]) {
                bands[N] = _bands[N].map(Number) as [number, number];
            } else {
                bands[N] = null
            }
        }

        return bands;
    }

    private async leverageCreateLoanPrices(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number): Promise<string[]> {
        this._checkLeverageZap();
        const [_n2, _n1] = await this._leverageBands(userCollateral, userBorrowed, debt, range);

        return await this._getPrices(_n2, _n1);
    }

    private async leverageCreateLoanPricesAllRanges(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount): Promise<IDict<[string, string] | null>> {
        this._checkLeverageZap();
        const _bands = await this._leverageCreateLoanBandsAllRanges(userCollateral, userBorrowed, debt);

        const prices: { [index: number]: [string, string] | null } = {};
        for (let N = this.minBands; N <= this.maxBands; N++) {
            if (_bands[N]) {
                prices[N] = await this._calcPrices(..._bands[N]);
            } else {
                prices[N] = null
            }
        }

        return prices;
    }

    private async _leverageHealth(
        userCollateral: TAmount,
        userBorrowed: TAmount,
        dDebt: TAmount,
        range: number,
        full: boolean,
        user = llamalend.constants.ZERO_ADDRESS
    ): Promise<string> {
        if (range > 0) this._checkRange(range);
        const { _totalCollateral } = await this._leverageExpectedCollateral(userCollateral, userBorrowed, dDebt, user);
        const { _borrowed, _N } = await this._userState(user);
        if (_borrowed > BigInt(0)) throw Error(`User ${user} is already in liquidation mode`);
        if (range < 0) range = Number(llamalend.formatUnits(_N, 0));
        const _dDebt = parseUnits(dDebt, this.borrowed_token.decimals);

        const contract = llamalend.contracts[this.addresses.controller].contract;
        let _health = await contract.health_calculator(user, _totalCollateral, _dDebt, full, range, llamalend.constantOptions) as bigint;
        _health = _health * BigInt(100);

        return formatUnits(_health);
    }

    private async leverageCreateLoanHealth(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, full = true): Promise<string> {
        this._checkLeverageZap();
        return await this._leverageHealth(userCollateral, userBorrowed, debt, range, full);
    }

    private async leverageCreateLoanIsApproved(userCollateral: TAmount, userBorrowed: TAmount): Promise<boolean> {
        this._checkLeverageZap();
        const collateralAllowance = await hasAllowance(
            [this.collateral_token.address], [userCollateral], llamalend.signerAddress, this.addresses.controller);
        const borrowedAllowance = await hasAllowance(
            [this.borrowed_token.address], [userBorrowed], llamalend.signerAddress, llamalend.constants.ALIASES.leverage_zap);

        return collateralAllowance && borrowedAllowance
    }

    private async leverageCreateLoanApproveEstimateGas (userCollateral: TAmount, userBorrowed: TAmount): Promise<TGas> {
        this._checkLeverageZap();
        const collateralGas = await ensureAllowanceEstimateGas(
            [this.collateral_token.address], [userCollateral], this.addresses.controller);
        const borrowedGas = await ensureAllowanceEstimateGas(
            [this.borrowed_token.address], [userBorrowed], llamalend.constants.ALIASES.leverage_zap);

        if(Array.isArray(collateralGas) && Array.isArray(borrowedGas)) {
            return [collateralGas[0] + borrowedGas[0], collateralGas[1] + borrowedGas[1]]
        } else {
            return (collateralGas as number) + (borrowedGas as number)
        }
    }

    private async leverageCreateLoanApprove(userCollateral: TAmount, userBorrowed: TAmount): Promise<string[]> {
        this._checkLeverageZap();
        const collateralApproveTx = await ensureAllowance(
            [this.collateral_token.address], [userCollateral], this.addresses.controller);
        const borrowedApproveTx = await ensureAllowance(
            [this.borrowed_token.address], [userBorrowed], llamalend.constants.ALIASES.leverage_zap);

        return [...collateralApproveTx, ...borrowedApproveTx]
    }

    private async leverageCreateLoanRouteImage(userBorrowed: TAmount, debt: TAmount): Promise<string> {
        this._checkLeverageZap();
        const _userBorrowed = parseUnits(userBorrowed, this.borrowed_token.decimals);
        const _debt = parseUnits(debt, this.borrowed_token.decimals);

        return this._getSwapDataFromCache(this.addresses.borrowed_token, _debt + _userBorrowed).pathVizImage;
    }

    private async _leverageCreateLoan(
        userCollateral: TAmount,
        userBorrowed: TAmount,
        debt: TAmount,
        range: number,
        slippage: number,
        estimateGas: boolean
    ): Promise<string | TGas>  {
        if (await this.userLoanExists()) throw Error("Loan already created");
        this._checkRange(range);

        const _userCollateral = parseUnits(userCollateral, this.collateral_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.borrowed_token.decimals);
        const _debt = parseUnits(debt, this.borrowed_token.decimals);
        const swapData = this._getSwapDataFromCache(this.addresses.borrowed_token, _debt + _userBorrowed);
        if (slippage !== swapData.slippage) throw Error(`You must call leverage.createLoanExpectedCollateral() with slippage=${slippage} first`);
        const calldata = await _assembleTxOdos(swapData.pathId as string);
        const contract = llamalend.contracts[this.addresses.controller].contract;
        const gas = await contract.create_loan_extended.estimateGas(
            _userCollateral,
            _debt,
            range,
            llamalend.constants.ALIASES.leverage_zap,
            [0, parseUnits(this._getMarketId(), 0), _userBorrowed],
            calldata,
            { ...llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.create_loan_extended(
            _userCollateral,
            _debt,
            range,
            llamalend.constants.ALIASES.leverage_zap,
            [0, parseUnits(this._getMarketId(), 0), _userBorrowed],
            calldata,
            { ...llamalend.options, gasLimit }
        )).hash
    }

    private async leverageCreateLoanEstimateGas(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, slippage = 0.1): Promise<number> {
        this._checkLeverageZap();
        if (!(await this.leverageCreateLoanIsApproved(userCollateral, userBorrowed))) throw Error("Approval is needed for gas estimation");
        return await this._leverageCreateLoan(userCollateral, userBorrowed, debt, range, slippage,  true) as number;
    }

    private async leverageCreateLoan(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, slippage = 0.1): Promise<string> {
        this._checkLeverageZap();
        await this.leverageCreateLoanApprove(userCollateral, userBorrowed);
        return await this._leverageCreateLoan(userCollateral, userBorrowed, debt, range, slippage, false) as string;
    }

    // ---------------- LEVERAGE BORROW MORE ----------------

    private async leverageBorrowMoreMaxRecv(userCollateral: TAmount, userBorrowed: TAmount, address = ""):
        Promise<{
            maxDebt: string,
            maxTotalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromMaxDebt: string,
            avgPrice: string,
        }> {
        // max_borrowable = userCollateral / (1 / (k_effective * max_p_base) - 1 / p_avg)
        this._checkLeverageZap();
        address = _getAddress(address);
        const { _collateral: _stateCollateral, _borrowed: _stateBorrowed, _debt: _stateDebt, _N } = await this._userState(address);
        if (_stateBorrowed > BigInt(0)) throw Error(`User ${address} is already in liquidation mode`);
        const _userCollateral = parseUnits(userCollateral, this.collateral_token.decimals);
        const controllerContract = llamalend.contracts[this.addresses.controller].contract;
        const _borrowedFromStateCollateral = await controllerContract.max_borrowable(_stateCollateral, _N, _stateDebt, llamalend.constantOptions) - _stateDebt;
        const _userBorrowed = _borrowedFromStateCollateral + parseUnits(userBorrowed, this.borrowed_token.decimals);
        userBorrowed = formatUnits(_userBorrowed, this.borrowed_token.decimals);

        const oraclePriceBand = await this.oraclePriceBand();
        let pAvgBN = BN(await this.calcTickPrice(oraclePriceBand)); // upper tick of oracle price band
        let maxBorrowablePrevBN = BN(0);
        let maxBorrowableBN = BN(0);
        let _userEffectiveCollateral = BigInt(0);
        let _maxLeverageCollateral = BigInt(0);

        const contract = llamalend.contracts[llamalend.constants.ALIASES.leverage_zap].contract;
        for (let i = 0; i < 5; i++) {
            maxBorrowablePrevBN = maxBorrowableBN;
            _userEffectiveCollateral = _userCollateral + fromBN(BN(userBorrowed).div(pAvgBN), this.collateral_token.decimals);
            let _maxBorrowable = await contract.max_borrowable(this.addresses.controller, _userEffectiveCollateral, _maxLeverageCollateral, _N, fromBN(pAvgBN));
            _maxBorrowable = _maxBorrowable * BigInt(998) / BigInt(1000);
            if (_maxBorrowable === BigInt(0)) break;
            maxBorrowableBN = toBN(_maxBorrowable, this.borrowed_token.decimals);

            if (maxBorrowableBN.minus(maxBorrowablePrevBN).abs().div(maxBorrowablePrevBN).lt(0.0005)) {
                maxBorrowableBN = maxBorrowablePrevBN;
                break;
            }

            // additionalCollateral = (userBorrowed / p) + leverageCollateral
            const _maxAdditionalCollateral = BigInt(await _getExpectedOdos(
                this.addresses.borrowed_token, this.addresses.collateral_token, _maxBorrowable + _userBorrowed, this.addresses.amm));
            pAvgBN = maxBorrowableBN.plus(userBorrowed).div(toBN(_maxAdditionalCollateral, this.collateral_token.decimals));
            _maxLeverageCollateral = _maxAdditionalCollateral - fromBN(BN(userBorrowed).div(pAvgBN), this.collateral_token.decimals);
        }

        if (maxBorrowableBN.eq(0)) _userEffectiveCollateral = BigInt(0);
        const _maxTotalCollateral = _userEffectiveCollateral + _maxLeverageCollateral
        let _maxBorrowable = await controllerContract.max_borrowable(_stateCollateral + _maxTotalCollateral, _N, _stateDebt, llamalend.constantOptions) - _stateDebt;
        _maxBorrowable = _maxBorrowable * BigInt(998) / BigInt(1000);

        return {
            maxDebt: formatUnits(_maxBorrowable, this.borrowed_token.decimals),
            maxTotalCollateral: formatUnits(_maxTotalCollateral, this.collateral_token.decimals),
            userCollateral: formatNumber(userCollateral, this.collateral_token.decimals),
            collateralFromUserBorrowed: formatNumber(BN(userBorrowed).div(pAvgBN).toString(), this.collateral_token.decimals),
            collateralFromMaxDebt: formatUnits(_maxLeverageCollateral, this.collateral_token.decimals),
            avgPrice: pAvgBN.toString(),
        };
    }

    private async leverageBorrowMoreExpectedCollateral(userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, slippage = 0.1, address = ""):
        Promise<{ totalCollateral: string, userCollateral: string, collateralFromUserBorrowed: string, collateralFromDebt: string, avgPrice: string }> {
        this._checkLeverageZap();
        address = _getAddress(address);
        const _dDebt = parseUnits(dDebt, this.borrowed_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.borrowed_token.decimals);
        await this._setSwapDataToCache(this.addresses.borrowed_token, this.addresses.collateral_token, _dDebt + _userBorrowed, slippage);
        const { _totalCollateral, _userCollateral, _collateralFromUserBorrowed, _collateralFromDebt, avgPrice } =
                await this._leverageExpectedCollateral(userCollateral, userBorrowed, dDebt, address);
        return {
            totalCollateral: formatUnits(_totalCollateral, this.collateral_token.decimals),
            userCollateral: formatUnits(_userCollateral, this.collateral_token.decimals),
            collateralFromUserBorrowed: formatUnits(_collateralFromUserBorrowed, this.collateral_token.decimals),
            collateralFromDebt: formatUnits(_collateralFromDebt, this.collateral_token.decimals),
            avgPrice,
        }
    }

    private async leverageBorrowMorePriceImpact(userBorrowed: TAmount, dDebt: TAmount): Promise<string> {
        this._checkLeverageZap();
        const _dDebt = parseUnits(dDebt, this.borrowed_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.borrowed_token.decimals);
        return this._getSwapDataFromCache(this.addresses.borrowed_token, _dDebt + _userBorrowed).priceImpact.toString();
    }

    private async leverageBorrowMoreBands(userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, address = ""): Promise<[number, number]> {
        address = _getAddress(address);
        this._checkLeverageZap();
        const [_n2, _n1] = await this._leverageBands(userCollateral, userBorrowed, dDebt, -1, address);

        return [Number(_n2), Number(_n1)];
    }

    private async leverageBorrowMorePrices(userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, address = ""): Promise<string[]> {
        address = _getAddress(address);
        this._checkLeverageZap();
        const [_n2, _n1] = await this._leverageBands(userCollateral, userBorrowed, dDebt, -1, address);

        return await this._getPrices(_n2, _n1);
    }

    private async leverageBorrowMoreHealth(userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, full = true, address = ""): Promise<string> {
        this._checkLeverageZap();
        address = _getAddress(address);
        return await this._leverageHealth(userCollateral, userBorrowed, dDebt, -1, full, address);
    }

    private async leverageBorrowMoreRouteImage(userBorrowed: TAmount, debt: TAmount): Promise<string> {
        this._checkLeverageZap();
        const _userBorrowed = parseUnits(userBorrowed, this.borrowed_token.decimals);
        const _debt = parseUnits(debt, this.borrowed_token.decimals);

        return this._getSwapDataFromCache(this.addresses.borrowed_token, _debt + _userBorrowed).pathVizImage;
    }

    private async _leverageBorrowMore(
        userCollateral: TAmount,
        userBorrowed: TAmount,
        debt: TAmount,
        slippage: number,
        estimateGas: boolean
    ): Promise<string | TGas>  {
        if (!(await this.userLoanExists())) throw Error("Loan does not exist");
        const _userCollateral = parseUnits(userCollateral, this.collateral_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.borrowed_token.decimals);
        const _debt = parseUnits(debt, this.borrowed_token.decimals);
        const swapData = this._getSwapDataFromCache(this.addresses.borrowed_token, _debt + _userBorrowed);
        if (slippage !== swapData.slippage) throw Error(`You must call leverage.borrowMoreExpectedCollateral() with slippage=${slippage} first`)
        const calldata = await _assembleTxOdos(swapData.pathId as string);
        const contract = llamalend.contracts[this.addresses.controller].contract;
        const gas = await contract.borrow_more_extended.estimateGas(
            _userCollateral,
            _debt,
            llamalend.constants.ALIASES.leverage_zap,
            [0, parseUnits(this._getMarketId(), 0), _userBorrowed],
            calldata,
            { ...llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));

        return (await contract.borrow_more_extended(
            _userCollateral,
            _debt,
            llamalend.constants.ALIASES.leverage_zap,
            [0, parseUnits(this._getMarketId(), 0), _userBorrowed],
            calldata,
            { ...llamalend.options, gasLimit }
        )).hash
    }

    private async leverageBorrowMoreEstimateGas(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, slippage = 0.1): Promise<number> {
        this._checkLeverageZap();
        if (!(await this.leverageCreateLoanIsApproved(userCollateral, userBorrowed))) throw Error("Approval is needed for gas estimation");
        return await this._leverageBorrowMore(userCollateral, userBorrowed, debt, slippage,  true) as number;
    }

    private async leverageBorrowMore(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, slippage = 0.1): Promise<string> {
        this._checkLeverageZap();
        await this.leverageCreateLoanApprove(userCollateral, userBorrowed);
        return await this._leverageBorrowMore(userCollateral, userBorrowed, debt, slippage, false) as string;
    }

    // ---------------- LEVERAGE REPAY ----------------

    private _leverageRepayExpectedBorrowed = (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount):
        { _totalBorrowed: bigint, _borrowedFromStateCollateral: bigint, _borrowedFromUserCollateral: bigint, avgPrice: string } => {
        this._checkLeverageZap();
        const _stateCollateral = parseUnits(stateCollateral, this.collateral_token.decimals);
        const _userCollateral = parseUnits(userCollateral, this.collateral_token.decimals);
        let _borrowedExpected = BigInt(0);
        let _borrowedFromStateCollateral = BigInt(0);
        let _borrowedFromUserCollateral = BigInt(0);
        if (_stateCollateral + _userCollateral > BigInt(0)) {
            _borrowedExpected = BigInt(this._getSwapDataFromCache(this.addresses.collateral_token, _stateCollateral + _userCollateral).outAmounts[0]);
            _borrowedFromStateCollateral = _stateCollateral * BigInt(10 ** 18) / (_stateCollateral + _userCollateral) * _borrowedExpected / BigInt(10 ** 18);
            _borrowedFromUserCollateral = _borrowedExpected - _borrowedFromStateCollateral;
        }
        const _totalBorrowed = _borrowedExpected + parseUnits(userBorrowed, this.borrowed_token.decimals);
        const avgPrice = toBN(_borrowedExpected, this.borrowed_token.decimals).div(toBN(_stateCollateral + _userCollateral, this.collateral_token.decimals)).toString();

        return { _totalBorrowed, _borrowedFromStateCollateral, _borrowedFromUserCollateral, avgPrice }
    };

    private leverageRepayExpectedBorrowed = async (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, slippage = 0.1):
        Promise<{ totalBorrowed: string, borrowedFromStateCollateral: string, borrowedFromUserCollateral: string, userBorrowed: string, avgPrice: string }> => {
        this._checkLeverageZap();
        const _stateCollateral = parseUnits(stateCollateral, this.collateral_token.decimals);
        const _userCollateral = parseUnits(userCollateral, this.collateral_token.decimals);
        if (_stateCollateral + _userCollateral > BigInt(0)) {
            await this._setSwapDataToCache(this.addresses.collateral_token, this.addresses.borrowed_token, _stateCollateral + _userCollateral, slippage);
        }
        const { _totalBorrowed, _borrowedFromStateCollateral, _borrowedFromUserCollateral, avgPrice } =
            this._leverageRepayExpectedBorrowed(stateCollateral, userCollateral, userBorrowed);

        return {
            totalBorrowed: formatUnits(_totalBorrowed, this.borrowed_token.decimals),
            borrowedFromStateCollateral: formatUnits(_borrowedFromStateCollateral, this.borrowed_token.decimals),
            borrowedFromUserCollateral: formatUnits(_borrowedFromUserCollateral, this.borrowed_token.decimals),
            userBorrowed: formatNumber(userBorrowed, this.borrowed_token.decimals),
            avgPrice,
        }
    };

    private async leverageRepayPriceImpact(stateCollateral: TAmount, userCollateral: TAmount): Promise<string> {
        this._checkLeverageZap();
        const _stateCollateral = parseUnits(stateCollateral, this.collateral_token.decimals);
        const _userCollateral = parseUnits(userCollateral, this.collateral_token.decimals);
        if (_stateCollateral + _userCollateral > BigInt(0)) {
            return this._getSwapDataFromCache(this.addresses.collateral_token, _stateCollateral + _userCollateral).priceImpact.toString();
        } else {
            return "0.0"
        }
    }

    private async leverageRepayIsFull(stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address = ""): Promise<boolean> {
        this._checkLeverageZap();
        address = _getAddress(address);
        const { _borrowed: _stateBorrowed, _debt } = await this._userState(address);
        const { _totalBorrowed } = this._leverageRepayExpectedBorrowed(stateCollateral, userCollateral, userBorrowed);

        return _stateBorrowed + _totalBorrowed > _debt;
    }

    private async leverageRepayIsAvailable(stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address = ""): Promise<boolean> {
        // 0. const { collateral, stablecoin, debt } = await this.userState(address);
        // 1. maxCollateral for deleverage is collateral from line above.
        // 2. If user is underwater (stablecoin > 0), only full repayment is available:
        //    await this.deleverageRepayStablecoins(deleverageCollateral) + stablecoin > debt
        this._checkLeverageZap();
        address = _getAddress(address);
        const { collateral, borrowed, debt } = await this.userState(address);
        // Loan does not exist
        if (BN(debt).eq(0)) return false;
        // Can't spend more than user has
        if (BN(stateCollateral).gt(collateral)) return false;
        // Only full repayment and closing the position is available if user is underwater+
        if (BN(borrowed).gt(0)) return await this.leverageRepayIsFull(stateCollateral, userCollateral, userBorrowed, address);

        return true;
    }

    private _leverageRepayBands = memoize( async (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address: string): Promise<[bigint, bigint]> => {
        address = _getAddress(address);
        if (!(await this.leverageRepayIsAvailable(stateCollateral, userCollateral, userBorrowed, address))) return [parseUnits(0, 0), parseUnits(0, 0)];

        const _stateRepayCollateral = parseUnits(stateCollateral, this.collateral_token.decimals);
        const { _collateral: _stateCollateral, _debt: _stateDebt, _N } = await this._userState(address);
        if (_stateDebt == BigInt(0)) throw Error(`Loan for ${address} does not exist`);
        if (_stateCollateral < _stateRepayCollateral) throw Error(`Can't use more collateral than user's position has (${_stateRepayCollateral}) > ${_stateCollateral})`);

        let _n1 = parseUnits(0, 0);
        let _n2 = parseUnits(0, 0);
        const { _totalBorrowed: _repayExpected } = this._leverageRepayExpectedBorrowed(stateCollateral, userCollateral, userBorrowed);
        try {
            _n1 = await llamalend.contracts[this.addresses.controller].contract.calculate_debt_n1(_stateCollateral - _stateRepayCollateral, _stateDebt - _repayExpected, _N);
            _n2 = _n1 + (_N - BigInt(1));
        } catch (e) {
            console.log("Full repayment");
        }

        return [_n2, _n1];
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    });

    private async leverageRepayBands(stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address = ""): Promise<[number, number]> {
        this._checkLeverageZap();
        const [_n2, _n1] = await this._leverageRepayBands(stateCollateral, userCollateral, userBorrowed, address);

        return [Number(_n2), Number(_n1)];
    }

    private async leverageRepayPrices(stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address = ""): Promise<string[]> {
        this._checkLeverageZap();
        const [_n2, _n1] = await this._leverageRepayBands(stateCollateral, userCollateral, userBorrowed, address);

        return await this._getPrices(_n2, _n1);
    }

    private async leverageRepayHealth(stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, full = true, address = ""): Promise<string> {
        this._checkLeverageZap();
        address = _getAddress(address);
        const { _borrowed: _stateBorrowed, _debt, _N } = await this._userState(address);
        if (_stateBorrowed > BigInt(0)) return "0.0";
        if (!(await this.leverageRepayIsAvailable(stateCollateral, userCollateral, userBorrowed, address))) return "0.0";

        const { _totalBorrowed } = this._leverageRepayExpectedBorrowed(stateCollateral, userCollateral, userBorrowed);
        const _dCollateral = parseUnits(stateCollateral, this.collateral_token.decimals) * BigInt(-1);
        const _dDebt = _totalBorrowed * BigInt(-1);

        if (_debt + _dDebt <= BigInt(0)) return "0.0";
        const contract = llamalend.contracts[this.addresses.controller].contract;
        let _health = await contract.health_calculator(address, _dCollateral, _dDebt, full, _N, llamalend.constantOptions) as bigint;
        _health = _health * BigInt(100);

        return llamalend.formatUnits(_health);
    }

    private async leverageRepayIsApproved(userCollateral: TAmount, userBorrowed: TAmount): Promise<boolean> {
        this._checkLeverageZap();
        return await hasAllowance(
            [this.collateral_token.address, this.borrowed_token.address],
            [userCollateral, userBorrowed],
            llamalend.signerAddress,
            llamalend.constants.ALIASES.leverage_zap
        );
    }

    private async leverageRepayApproveEstimateGas (userCollateral: TAmount, userBorrowed: TAmount): Promise<TGas> {
        this._checkLeverageZap();
        return await ensureAllowanceEstimateGas(
            [this.collateral_token.address, this.borrowed_token.address],
            [userCollateral, userBorrowed],
            llamalend.constants.ALIASES.leverage_zap
        );
    }

    private async leverageRepayApprove(userCollateral: TAmount, userBorrowed: TAmount): Promise<string[]> {
        this._checkLeverageZap();
        return await ensureAllowance(
            [this.collateral_token.address, this.borrowed_token.address],
            [userCollateral, userBorrowed],
            llamalend.constants.ALIASES.leverage_zap
        );
    }

    private async leverageRepayRouteImage(stateCollateral: TAmount, userCollateral: TAmount): Promise<string> {
        this._checkLeverageZap();
        const _stateCollateral = parseUnits(stateCollateral, this.collateral_token.decimals);
        const _userCollateral = parseUnits(userCollateral, this.collateral_token.decimals);

        return this._getSwapDataFromCache(this.addresses.collateral_token, _stateCollateral + _userCollateral).pathVizImage;
    }

    private async _leverageRepay(
        stateCollateral: TAmount,
        userCollateral: TAmount,
        userBorrowed: TAmount,
        slippage: number,
        estimateGas: boolean
    ): Promise<string | TGas>  {
        if (!(await this.userLoanExists())) throw Error("Loan does not exist");
        const _stateCollateral = parseUnits(stateCollateral, this.collateral_token.decimals);
        const _userCollateral = parseUnits(userCollateral, this.collateral_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.borrowed_token.decimals);
        let calldata = "0x";
        if (_stateCollateral + _userCollateral > BigInt(0)) {
            const swapData = this._getSwapDataFromCache(this.addresses.collateral_token, _stateCollateral + _userCollateral);
            if (slippage !== swapData.slippage) throw Error(`You must call leverage.repayExpectedBorrowed() with slippage=${slippage} first`)
            calldata = await _assembleTxOdos(swapData.pathId as string);
        }

        console.log('params', [0, parseUnits(this._getMarketId(), 0), _userCollateral, _userBorrowed], calldata)
        const contract = llamalend.contracts[this.addresses.controller].contract;
        const gas = await contract.repay_extended.estimateGas(
            llamalend.constants.ALIASES.leverage_zap,
            [0, parseUnits(this._getMarketId(), 0), _userCollateral, _userBorrowed],
            calldata
        );
        if (estimateGas) return smartNumber(gas);

        await llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));

        return (await contract.repay_extended(
            llamalend.constants.ALIASES.leverage_zap,
            [0, parseUnits(this._getMarketId(), 0), _userCollateral, _userBorrowed],
            calldata,
            { ...llamalend.options, gasLimit }
        )).hash
    }

    private async leverageRepayEstimateGas(stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, slippage = 0.1): Promise<number> {
        this._checkLeverageZap();
        if (!(await this.leverageRepayIsApproved(userCollateral, userBorrowed))) throw Error("Approval is needed for gas estimation");
        return await this._leverageRepay(stateCollateral, userCollateral, userBorrowed, slippage,  true) as number;
    }

    private async leverageRepay(stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, slippage = 0.1): Promise<string> {
        this._checkLeverageZap();
        await this.leverageRepayApprove(userCollateral, userBorrowed);
        return await this._leverageRepay(stateCollateral, userCollateral, userBorrowed, slippage, false) as string;
    }

    public async currentLeverage(userAddress = ''): Promise<string> {
        userAddress = _getAddress(userAddress);
        const [userCollateral, _current_collateral_estimation] = await Promise.all([
            _getUserCollateral(llamalend.constants.NETWORK_NAME, this.addresses.controller, userAddress),
            llamalend.contracts[this.addresses.amm].contract.get_y_up(userAddress),
        ]);

        const total_deposit_from_user = userCollateral.total_deposit_from_user;
        const current_collateral_estimation = llamalend.formatUnits(_current_collateral_estimation, this.collateral_token.decimals);


        return BN(current_collateral_estimation).div(total_deposit_from_user).toString();
    }

    public async currentPnL(userAddress = ''): Promise<Record<string, string>> {
        userAddress = _getAddress(userAddress);

        const calls = [
            llamalend.contracts[this.addresses.amm].multicallContract.get_y_up(userAddress),
            llamalend.contracts[this.addresses.controller].multicallContract.user_state(userAddress, llamalend.constantOptions),
            llamalend.contracts[this.addresses.amm].multicallContract.price_oracle(userAddress),
        ];

        const [currentCollateralEstimation, userState, oraclePrice] = await llamalend.multicallProvider.all(calls) as  [bigint, bigint[],bigint];

        if(!(currentCollateralEstimation || userState || oraclePrice)) {
            throw new Error('Multicall error')
        }

        const debt = userState[2];

        const userCollateral = await _getUserCollateral(llamalend.constants.NETWORK_NAME, this.addresses.controller, userAddress);
        const totalDepositUsdValue = userCollateral.total_deposit_usd_value;

        const currentCollateralEstimationFormatted = llamalend.formatUnits(currentCollateralEstimation, this.collateral_token.decimals);
        const oraclePriceFormatted = llamalend.formatUnits(oraclePrice, 18);
        const debtFormatted = llamalend.formatUnits(debt, 18);

        const currentPosition = BN(currentCollateralEstimationFormatted)
            .times(oraclePriceFormatted)
            .minus(debtFormatted)
            .toFixed(this.collateral_token.decimals)

        const percentage = BN(currentPosition)
            .div(totalDepositUsdValue)
            .minus(1)
            .times(100)
            .toString();

        return {
            currentPosition: currentPosition,
            deposited: totalDepositUsdValue.toString(),
            percentage: percentage,
        };
    }
}
