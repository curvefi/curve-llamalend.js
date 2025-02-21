import axios from "axios";
import { ethers } from "ethers";
import memoize from "memoizee";
import BigNumber from 'bignumber.js';
import { lending } from "./lending.js";
import {
    IExtendedPoolDataFromApi,
    INetworkName,
    IPoolFactory,
    I1inchSwapData,
    IDict,
    IMarketData,
    IQuoteOdos,
} from "./interfaces";


const _getPoolsFromApi = memoize(
    async (network: INetworkName, poolFactory: IPoolFactory ): Promise<IExtendedPoolDataFromApi> => {
        const url = `https://api.curve.fi/api/getPools/${network}/${poolFactory}`;
        const response = await axios.get(url, { validateStatus: () => true });
        return response.data.data ?? { poolData: [], tvl: 0, tvlAll: 0 };
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

const _getAllPoolsFromApi = async (network: INetworkName): Promise<IExtendedPoolDataFromApi[]> => {
    return await Promise.all([
        _getPoolsFromApi(network, "main"),
        _getPoolsFromApi(network, "crypto"),
        _getPoolsFromApi(network, "factory"),
        _getPoolsFromApi(network, "factory-crvusd"),
        _getPoolsFromApi(network, "factory-crypto"),
        _getPoolsFromApi(network, "factory-twocrypto"),
        _getPoolsFromApi(network, "factory-tricrypto"),
        _getPoolsFromApi(network, "factory-stable-ng"),
    ]);
}

export const _getUsdPricesFromApi = async (): Promise<IDict<number>> => {
    const network = lending.constants.NETWORK_NAME;
    const allTypesExtendedPoolData = await _getAllPoolsFromApi(network);
    const priceDict: IDict<Record<string, number>[]> = {};
    const priceDictByMaxTvl: IDict<number> = {};

    for (const extendedPoolData of allTypesExtendedPoolData) {
        for (const pool of extendedPoolData.poolData) {
            const lpTokenAddress = pool.lpTokenAddress ?? pool.address;
            const totalSupply = pool.totalSupply / (10 ** 18);
            if(lpTokenAddress.toLowerCase() in priceDict) {
                priceDict[lpTokenAddress.toLowerCase()].push({
                    price: pool.usdTotal && totalSupply ? pool.usdTotal / totalSupply : 0,
                    tvl: pool.usdTotal,
                })
            } else {
                priceDict[lpTokenAddress.toLowerCase()] = []
                priceDict[lpTokenAddress.toLowerCase()].push({
                    price: pool.usdTotal && totalSupply ? pool.usdTotal / totalSupply : 0,
                    tvl: pool.usdTotal,
                })
            }

            for (const coin of pool.coins) {
                if (typeof coin.usdPrice === "number") {
                    if(coin.address.toLowerCase() in priceDict) {
                        priceDict[coin.address.toLowerCase()].push({
                            price: coin.usdPrice,
                            tvl: pool.usdTotal,
                        })
                    } else {
                        priceDict[coin.address.toLowerCase()] = []
                        priceDict[coin.address.toLowerCase()].push({
                            price: coin.usdPrice,
                            tvl: pool.usdTotal,
                        })
                    }
                }
            }

            for (const coin of pool.gaugeRewards ?? []) {
                if (typeof coin.tokenPrice === "number") {
                    if(coin.tokenAddress.toLowerCase() in priceDict) {
                        priceDict[coin.tokenAddress.toLowerCase()].push({
                            price: coin.tokenPrice,
                            tvl: pool.usdTotal,
                        });
                    } else {
                        priceDict[coin.tokenAddress.toLowerCase()] = []
                        priceDict[coin.tokenAddress.toLowerCase()].push({
                            price: coin.tokenPrice,
                            tvl: pool.usdTotal,
                        });
                    }
                }
            }
        }
    }

    for(const address in priceDict) {
        if(priceDict[address].length > 0) {
            const maxTvlItem = priceDict[address].reduce((prev, current) => {
                if (+current.tvl > +prev.tvl) {
                    return current;
                } else {
                    return prev;
                }
            });
            priceDictByMaxTvl[address] = maxTvlItem.price
        } else {
            priceDictByMaxTvl[address] = 0
        }

    }

    return priceDictByMaxTvl
}

export const _getUserCollateral = memoize(
    async (network: INetworkName, controller: string, user: string): Promise<Record<string, any>> => {
        const url = `https://prices.curve.fi/v1/lending/collateral_events/${network}/${controller}/${user}`;
        const response = await axios.get(url, { validateStatus: () => true });
        return {
            total_deposit_precise: response.data.total_deposit_precise,
            total_deposit_from_user: response.data.total_deposit_from_user,
            total_deposit_usd_value: response.data.total_deposit_usd_value,
        }
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    }
)

export const _getUserCollateralCrvUsd = memoize(
    async (network: INetworkName, controller: string, user: string): Promise<string> => {
        const url = `https://prices.curve.fi/v1/crvusd/collateral_events/${network}/${controller}/${user}`;
        const response = await axios.get(url, { validateStatus: () => true });
        return response.data.total_deposit;
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    }
)

export const _getMarketsData = memoize(
    async (network: INetworkName): Promise<IMarketData> => {
        const url = `https://api.curve.fi/api/getLendingVaults/${network}/oneway`;
        const response = await axios.get(
            url,
            {
                headers: {"accept": "application/json"},
                validateStatus: () => true,
            });
        if (response.status !== 200) {
            throw Error(`Fetch error: ${response.status} ${response.statusText}`);
        }
        return response.data.data;
    },
    {
        promise: true,
        maxAge: 10 * 1000, // 10s
    }
)

// --- ODOS ---

export const _getQuoteOdos = async (fromToken: string, toToken: string, _amount: bigint, blacklist: string, pathVizImage: boolean, slippage = 0.5): Promise<IQuoteOdos> => {
    if (_amount === BigInt(0)) return { outAmounts: ["0.0"], pathId: '', pathVizImage: '', priceImpact: 0, slippage };

    if (ethers.getAddress(fromToken) == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") fromToken = "0x0000000000000000000000000000000000000000";
    if (ethers.getAddress(toToken) == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") toToken = "0x0000000000000000000000000000000000000000";

    const url = `https://prices.curve.fi/odos/quote?chain_id=${lending.chainId}&from_address=${ethers.getAddress(fromToken)}` +
        `&to_address=${ethers.getAddress(toToken)}&amount=${_amount.toString()}&slippage=${slippage}&pathVizImage=${pathVizImage}` +
        `&caller_address=${ethers.getAddress(lending.constants.ALIASES.leverage_zap)}&blacklist=${ethers.getAddress(blacklist)}`;

    const response = await axios.get(
        url,
        {
            headers: {"accept": "application/json"},
            validateStatus: () => true,
        });
    if (response.status !== 200) {
        throw Error(`Odos quote error - ${response.status} ${response.statusText}`);
    }

    return { ...response.data, slippage };
}

export const _getExpectedOdos = async (fromToken: string, toToken: string, _amount: bigint, blacklist: string) => {
    return (await _getQuoteOdos(fromToken, toToken, _amount, blacklist, false)).outAmounts[0]
}

export const _assembleTxOdos = memoize(
    async (pathId: string): Promise<string> => {
        const url = `https://prices.curve.fi/odos/assemble?user=${ethers.getAddress(lending.constants.ALIASES.leverage_zap)}&path_id=${pathId}`;

        const response = await axios.get(
            url,
            {
                headers: {'Content-Type': 'application/json'},
                validateStatus: () => true,
            });
        if (response.status !== 200) {
            throw Error(`Odos assemble error - ${response.status} ${response.statusText}`);
        }

        return response.data['transaction']['data'];
    },
    {
        promise: true,
        maxAge: 10 * 1000, // 10s
    }
)

export const _getSpotPriceOdos = memoize(
    async (fromToken: string, toToken: string): Promise<string | undefined> => {
        fromToken = ethers.getAddress(fromToken);
        toToken = ethers.getAddress(toToken);
        const url = `https://prices.curve.fi/odos/prices?chain_id=${lending.chainId}&tokens=${fromToken},${toToken}`;
        const response = await axios.get(
            url,
            {
                headers: {"accept": "application/json"},
                validateStatus: () => true,
            });
        if (response.status !== 200) {
            throw Error(`Odos spot prices error - ${response.status} ${response.statusText}`);
        }

        const pricesFromOdos = response.data.tokenPrices;
        const pricesFromApi: IDict<string> = {};
        for (const coin of [fromToken, toToken]) {
            if (pricesFromOdos[coin] !== 0) continue;
            const _pricesFromApi = await _getUsdPricesFromApi();
            pricesFromApi[coin] = String(_pricesFromApi[coin] || 0);
        }
        const prices = { ...pricesFromOdos, ...pricesFromApi };
        if (BigNumber(prices[fromToken]).eq(0) || BigNumber(prices[toToken]).eq( 0)) return undefined;

        return (new BigNumber(prices[toToken])).div(prices[fromToken]).toString()
    },
    {
        promise: true,
        maxAge: 10 * 1000, // 10s
    }
)

// --- 1INCH ---

export const _getExpected1inch = memoize(
    async (fromToken: string, toToken: string, _amount: bigint): Promise<string> => {
        if (_amount === BigInt(0)) return "0.0";
        const url = `https://prices.curve.fi/1inch/swap/v6.0/${lending.chainId}/quote?src=${fromToken}&dst=${toToken}&amount=${_amount}&excludedProtocols=${lending.constants.EXCLUDED_PROTOCOLS_1INCH}&includeTokensInfo=true&includeProtocols=true`;
        const response = await axios.get(
            url,
            {
                headers: {"accept": "application/json"},
                validateStatus: () => true,
            });
        if (response.status !== 200) {
            throw Error(`1inch error: ${response.status} ${response.statusText}`);
        }
        return response.data.dstAmount;

    },
    {
        promise: true,
        maxAge: 10 * 1000, // 10s
    }
)

export const _getSwapData1inch = memoize(
    async (fromToken: string, toToken: string, _amount: bigint, slippage: number): Promise<I1inchSwapData> => {
        if (_amount === BigInt(0)) throw Error("Amount must be > 0");
        const url = `https://prices.curve.fi/1inch/swap/v6.0/${lending.chainId}/swap?src=${fromToken}&dst=${toToken}&amount=${_amount}&from_=${lending.constants.ALIASES.leverage_zap}&slippage=${slippage}&excludedProtocols=${lending.constants.EXCLUDED_PROTOCOLS_1INCH}&includeTokensInfo=true&includeProtocols=true&disableEstimate=true`;
        const response = await axios.get(
            url,
            {
                headers: {"accept": "application/json"},
                validateStatus: () => true,
            });
        if (response.status !== 200) {
            throw Error(`1inch error: ${response.status} ${response.statusText}`);
        }
        return response.data;

    },
    {
        promise: true,
        maxAge: 10 * 1000, // 10s
    }
)

export const _getSpotPrice1inch = memoize(
    async (fromToken: string, toToken: string): Promise<string | undefined> => {
        const url = `https://prices.curve.fi/1inch/price/v1.1/${lending.chainId}?tokens=${fromToken},${toToken}&currency=USD`;
        const response = await axios.get(
            url,
            {
                headers: {"accept": "application/json"},
                validateStatus: () => true,
            });
        if (response.status !== 200) {
            throw Error(`1inch error: ${response.status} ${response.statusText}`);
        }
        const pricesFromApi: IDict<string> = {};
        for (const coin in response.data) {
            if (response.data[coin] !== "0") continue;
            const _pricesFromApi = await _getUsdPricesFromApi();
            pricesFromApi[coin] = String(_pricesFromApi[coin] || 0);
        }
        const prices = { ...response.data, ...pricesFromApi };
        if (prices[fromToken] === '0' || prices[toToken] === '0') return undefined;

        return (new BigNumber(prices[toToken])).div(prices[fromToken]).toString()
    },
    {
        promise: true,
        maxAge: 10 * 1000, // 10s
    }
)
