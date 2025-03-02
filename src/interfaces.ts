import { Contract, ethers } from "ethers";
import { Contract as MulticallContract, Provider as MulticallProvider } from "@curvefi/ethcall";

export interface IDict<T> {
    [index: string]: T,
}

export type INetworkName = "ethereum" | "optimism" | "bsc" | "xdai" | "polygon" | "x-layer" | "fantom" | "fraxtal" | "zksync" | "moonbeam" | "kava" | "mantle" | "base" | "arbitrum" | "celo" | "avalanche" | "aurora";
export type IChainId = 1 | 10 | 56 | 100 | 137 | 196 | 250 | 252 | 324 | 1284 | 2222 | 5000 | 8453 | 42161 | 42220 | 43114 | 1313161554;
export type IPoolFactory = "main" | "crypto" | "factory" | "factory-crvusd" | "factory-crypto" | "factory-twocrypto" | "factory-tricrypto" | "factory-stable-ng";
export interface ICurveContract {
    contract: Contract,
    multicallContract: MulticallContract,
    abi: any,
    address: string
}

export type TAmount = number | string
export type TGas = number | number[]

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
    monetary_policy_abi: any
}

export interface ICoin {
    address: string,
    name: string,
    symbol: string,
    decimals: number,
}

export interface IOneWayMarket {
    name: string,
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

export interface ICoinFromPoolDataApi {
    address: string,
    symbol: string,
    decimals: string,
    usdPrice: number | string,
}

export interface IReward {
    gaugeAddress: string,
    tokenAddress: string,
    tokenPrice?: number,
    name?: string,
    symbol: string,
    decimals?: number,
    apy: number
}

export interface IPoolDataFromApi {
    id: string,
    name: string,
    symbol: string,
    assetTypeName: string,
    address: string,
    lpTokenAddress?: string,
    gaugeAddress?: string,
    implementation: string,
    implementationAddress: string,
    coins: ICoinFromPoolDataApi[],
    gaugeRewards?: IReward[],
    usdTotal: number,
    totalSupply: number,
    amplificationCoefficient: string,
}

export interface IExtendedPoolDataFromApi {
    poolData: IPoolDataFromApi[],
    tvl?: number,
    tvlAll: number,
}

export interface IReward {
    gaugeAddress: string,
    tokenAddress: string,
    symbol: string,
    apy: number
}

export type T1inchRouteStep = {
    name: string,
    part: number,
    fromTokenAddress: string,
    toTokenAddress: string,
}[]

export interface I1inchRoute {
    part: number,
    hops: T1inchRouteStep[],
}

export interface I1inchSwapData {
    tx: { data: string },
    dstAmount: string,
    protocols: I1inchRoute[],
    slippage: number,
}

interface Rates {
    borrowApr: number;
    borrowApy: number;
    borrowApyPcent: number;
    lendApr: number;
    lendApy: number;
    lendApyPcent: number;
}

interface AssetDetail {
    symbol: string;
    decimals: number;
    address: string;
    blockchainId: string;
    usdPrice: number;
}

interface Assets {
    borrowed: AssetDetail;
    collateral: AssetDetail;
}

interface VaultShares {
    pricePerShare: number;
    totalShares: number;
}

interface Total {
    total: number;
    usdTotal: number;
}

interface LendingVaultUrls {
    deposit: string;
    withdraw: string;
}

interface AmmBalances {
    ammBalanceBorrowed: number;
    ammBalanceBorrowedUsd: number;
    ammBalanceCollateral: number;
    ammBalanceCollateralUsd: number;
}

export interface IMarketDataAPI {
    id: string;
    name: string;
    address: string;
    controllerAddress: string;
    ammAddress: string;
    monetaryPolicyAddress: string;
    rates: Rates;
    gaugeAddress: string;
    gaugeRewards: any[];
    assets: Assets;
    vaultShares: VaultShares;
    totalSupplied: Total;
    borrowed: Total;
    availableToBorrow: Total;
    lendingVaultUrls: LendingVaultUrls;
    usdTotal: number;
    ammBalances: AmmBalances;
}

export interface IMarketData {
    lendingVaultData: IMarketDataAPI[]
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
    monetary_policy_abi: any
}
