import {ethers} from "ethers";
import memoize from "memoizee";
import {llamalend} from "./llamalend.js";
import {
    IDict,
    IExtendedPoolDataFromApi,
    IMarketData,
    INetworkName,
    IPoolFactory,
    IQuoteOdos,
    IResponseApi,
} from "./interfaces";


const _getPoolsFromApi = memoize(
    async (network: INetworkName, poolFactory: IPoolFactory ): Promise<IExtendedPoolDataFromApi> => {
        const response = await fetch(`https://d3dl9x5bpp6us7.cloudfront.net/api/getPools/${network}/${poolFactory}`);
        const { data } = await response.json() as { data?: IExtendedPoolDataFromApi, success: boolean };
        return data ?? { poolData: [], tvl: 0, tvlAll: 0 };
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
    const network = llamalend.constants.NETWORK_NAME;
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

type UserCollateral = { total_deposit_precise: string, total_deposit_from_user: number, total_deposit_usd_value: number }
export const _getUserCollateral = memoize(
    async (network: INetworkName, controller: string, user: string): Promise<UserCollateral> => {
        const url = `https://prices.curve.finance/v1/lending/collateral_events/${network}/${controller}/${user}`;
        const response = await fetch(url);
        const data = await response.json() as UserCollateral;
        return {
            total_deposit_precise: data.total_deposit_precise,
            total_deposit_from_user: data.total_deposit_from_user,
            total_deposit_usd_value: data.total_deposit_usd_value,
        }
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    }
)

export const _getUserCollateralCrvUsd = memoize(
    async (network: INetworkName, controller: string, user: string): Promise<string> => {
        const url = `https://prices.curve.finance/v1/crvusd/collateral_events/${network}/${controller}/${user}`;
        const response = await fetch(url);
        const { total_deposit } = await response.json() as { total_deposit: string };
        return total_deposit;
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    }
)

export const _getMarketsData = memoize(
    async (network: INetworkName): Promise<IMarketData> => {
        const url = `https://d3dl9x5bpp6us7.cloudfront.net/api/getLendingVaults/${network}/oneway`;
        const response = await fetch(url, { headers: {"accept": "application/json"} });
        if (response.status !== 200) {
            throw Error(`Fetch error: ${response.status} ${response.statusText}`);
        }

        return (await response.json() as IResponseApi).data as IMarketData;
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

    const url = `https://prices.curve.finance/odos/quote?chain_id=${llamalend.chainId}&from_address=${ethers.getAddress(fromToken)}` +
        `&to_address=${ethers.getAddress(toToken)}&amount=${_amount.toString()}&slippage=${slippage}&pathVizImage=${pathVizImage}` +
        `&caller_address=${ethers.getAddress(llamalend.constants.ALIASES.leverage_zap)}&blacklist=${ethers.getAddress(blacklist)}`;

    const response = await fetch(url, {  headers: {"accept": "application/json"} });
    if (response.status !== 200) {
        throw Error(`Odos quote error - ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as Omit<IQuoteOdos, 'slippage'>;
    return { ...data, slippage };
}

export const _getExpectedOdos = async (fromToken: string, toToken: string, _amount: bigint, blacklist: string) => {
    return (await _getQuoteOdos(fromToken, toToken, _amount, blacklist, false)).outAmounts[0]
}

export const _assembleTxOdos = memoize(
    async (pathId: string): Promise<string> => {
        const url = `https://prices.curve.finance/odos/assemble?user=${ethers.getAddress(llamalend.constants.ALIASES.leverage_zap)}&path_id=${pathId}`;

        const response = await fetch(url, { headers: {'Content-Type': 'application/json'} });
        if (response.status !== 200) {
            throw Error(`Odos assemble error - ${response.status} ${response.statusText}`);
        }
        const { transaction } = await response.json() as { transaction: { data: string } };
        return transaction.data;
    },
    {
        promise: true,
        maxAge: 10 * 1000, // 10s
    }
)
