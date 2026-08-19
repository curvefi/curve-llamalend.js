import { Contract, ethers } from "ethers";
import { Contract as MulticallContract, Provider as MulticallProvider } from "@curvefi/ethcall";

export interface IDict<T> {
    [index: string]: T,
}

export type INetworkName = "ethereum" | "optimism" | 'sonic' | "fraxtal" | "arbitrum";
export type IChainId = 1 | 10 | 146 | 252 | 42161;

export interface ICurveContract {
    contract: Contract,
    multicallContract: MulticallContract,
    abi: any,
    address: string
}

export type TAmount = number | string
export type TGas = number | number[]

export interface IPartialFrac {
    frac: string;
    fracDecimal: string;
    amount: string;
}

export interface ILlamma {
    amm_address: string,
    controller_address: string,
    monetary_policy_address: string,
    collateral_address: string,
    leverage_zap: string,
    deleverage_zap: string,
    health_calculator_zap?: string,
    collateral_symbol: string,
    collateral_decimals: number,
    min_bands: number,
    max_bands: number,
    default_bands: number,
    A: number,
    is_deleverage_supported?: boolean
    index?: number
}

export interface ICoin {
    address: string,
    name: string,
    symbol: string,
    decimals: number,
}

export interface IOneWayMarket {
    name: string,
    version: 'v1' | 'v2',
    addresses: {
        amm: string,
        controller: string,
        borrowed_token: string,
        collateral_token: string,
        monetary_policy: string,
        vault: string,
        gauge: string,
    },
    borrowed_token: ICoin,
    collateral_token: ICoin,
}

export interface ILlamalend {
    provider: ethers.BrowserProvider | ethers.JsonRpcProvider,
    multicallProvider: MulticallProvider,
    signer: ethers.Signer | null,
    signerAddress: string,
    contracts: { [index: string]: { contract: Contract, multicallContract: MulticallContract } },
    feeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number },
    constantOptions: { gasLimit: number },
    options: { gasPrice?: number | bigint, maxFeePerGas?: number | bigint, maxPriorityFeePerGas?: number | bigint },
    constants: {
        ONE_WAY_MARKETS: IDict<IOneWayMarket>,
        DECIMALS: IDict<number>;
        NETWORK_NAME: INetworkName;
        ALIASES: Record<string, string>;
        COINS: Record<string, string>;
        ZERO_ADDRESS: string,
    };
}

export interface IReward {
    gaugeAddress: string,
    tokenAddress: string,
    symbol: string,
    apy: number
}

interface Rates {
    borrowApr: number;
    borrowApy: number;
    lendApr: number;
    lendApy: number;
}

interface AssetDetail {
    symbol: string;
    decimals: number;
    address: string;
}

interface Assets {
    borrowed: AssetDetail;
    collateral: AssetDetail;
}

interface Total {
    total: number;
}

interface AmmBalances {
    ammBalanceBorrowed: number;
    ammBalanceCollateral: number;
}

export interface IMarketDataAPI {
    name: string;
    version: 'v1' | 'v2';
    address: string;
    controllerAddress: string;
    ammAddress: string;
    monetaryPolicyAddress: string;
    rates: Rates;
    gaugeAddress: string;
    gaugeRewards: IReward[];
    assets: Assets;
    totalSupplied: Total;
    borrowed: Total;
    availableToBorrow: Total;
    borrowCap: Total;
    ammBalances: AmmBalances;
}

export interface IMarketData {
    lendingVaultData: IMarketDataAPI[]
}

export interface ILendMarketFromPricesAPI {
    name: string;
    version: number;
    controller: string;
    vault: string;
    llamma: string;
    policy: string;
    borrow_apy: number;
    borrow_apr: number;
    lend_apy: number;
    lend_apr: number;
    total_debt: number;
    total_assets: number;
    collateral_balance: number;
    borrowed_balance: number;
    collateral_token: {
        symbol: string;
        address: string;
        decimals: number;
    };
    borrowed_token: {
        symbol: string;
        address: string;
        decimals: number;
    };
    gauge_address: string | null;
}

export interface ILendMarketsFromPricesAPI {
    data: ILendMarketFromPricesAPI[];
}

export interface IQuoteOdos {
    outAmounts: string[],
    priceImpact: number,
    pathId: string | null,
    pathVizImage: string,
    slippage: number,
}


export interface ILlamma {
    amm_address: string,
    controller_address: string,
    monetary_policy_address: string,
    collateral_address: string,
    leverage_zap: string,
    deleverage_zap: string,
    health_calculator_zap?: string,
    collateral_symbol: string,
    collateral_decimals: number,
    min_bands: number,
    max_bands: number,
    default_bands: number,
    A: number,
}

export interface IQuote {
    outAmount: string,
    priceImpact: number | null
}

export interface ILeverageMetrics {
    priceImpact: number | null,
    bands: [number, number],
    prices: string[],
    health: string,
}

export type GetExpectedFn = (
    fromToken: string,
    toToken: string,
    amountIn: bigint,
    blacklist: string | string[],
) => Promise<IQuote>;

export interface IRates {
    borrowApr: string;
    lendApr: string;
    borrowApy: string;
    lendApy: string;
}