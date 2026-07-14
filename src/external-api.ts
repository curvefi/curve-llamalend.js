import {ethers} from "ethers";
import memoize from "memoizee";
import type { Llamalend } from "./llamalend.js";
import {
    ILendMarketsFromPricesAPI,
    IMarketData,
    INetworkName,
    IQuoteOdos,
} from "./interfaces.js";
import { adaptLendMarketFromPricesApi } from "./lendMarkets/utils.js";

export const _getTokenUsdPrice = memoize(
    async (network: INetworkName, address: string): Promise<number> => {
        const url = `https://prices.curve.finance/v1/usd_price/${network}/${address}`;
        const response = await fetch(url, { headers: { accept: "application/json" } });
        if (response.status !== 200) throw Error(`Fetch error: ${response.status} ${response.statusText}`);
        const { data } = await response.json() as { data: { usd_price: number } };
        return data?.usd_price ?? 0;
    },
    {
        promise: true,
        maxAge: 10 * 60 * 1000, // 10m
    }
)

type UserCollateral = { total_deposit_precise: string, total_deposit_from_user: number, total_deposit_usd_value: number , total_borrowed: number, total_deposit_from_user_precise: number, total_deposit_from_user_usd_value: number}
export const _getUserCollateral = memoize(
    async (network: INetworkName, controller: string, user: string): Promise<UserCollateral> => {
        const url = `https://prices.curve.finance/v1/lending/collateral_events/${network}/${controller}/${user}`;
        const response = await fetch(url);
        const data = await response.json() as UserCollateral;
        return {
            total_borrowed: data.total_borrowed,
            total_deposit_from_user_precise: data.total_deposit_from_user_precise, // Total deposit
            total_deposit_precise: data.total_deposit_precise,
            total_deposit_from_user: data.total_deposit_from_user,
            total_deposit_usd_value: data.total_deposit_usd_value,
            total_deposit_from_user_usd_value: data.total_deposit_from_user_usd_value,
        }
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    }
)

export const _getUserCollateralForce = async (
    network: INetworkName,
    controller: string,
    user: string,
    newTx: string
): Promise<void> => {
    await fetch(`https://prices.curve.finance/v1/lending/collateral_events/${network}/${controller}/${user}?new_tx=${newTx}`);

    _getUserCollateral.delete(network, controller, user);
}

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

export const _getUserCollateralCrvUsdFull = memoize(
    async (network: INetworkName, controller: string, user: string): Promise<UserCollateral> => {
        const url = `https://prices.curve.finance/v1/crvusd/collateral_events/${network}/${controller}/${user}`;
        const response = await fetch(url);
        return await response.json() as UserCollateral;
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    }
)

export const _getMarketsData = memoize(
    async (network: INetworkName): Promise<IMarketData> => {
        const url = `https://prices.curve.finance/v1/lending/markets/${network}`;
        const response = await fetch(url, { headers: {"accept": "application/json"} });
        if (response.status !== 200) {
            throw Error(`Fetch error: ${response.status} ${response.statusText}`);
        }

        const { data } = await response.json() as ILendMarketsFromPricesAPI;
        return { lendingVaultData: data.map(adaptLendMarketFromPricesApi) };
    },
    {
        promise: true,
        maxAge: 10 * 1000, // 10s
    }
)

export interface ICrvUsdMarketAPI {
    address: string;
    llamma: string;
    amm_a: number;
    monetary_policy_address: string;
    collateral_token: {
        symbol: string;
        address: string;
        decimals: number;
    };
}

export const _getCrvUsdMarketsData = memoize(
    async (): Promise<ICrvUsdMarketAPI[]> => {
        const url = 'https://prices.curve.finance/v1/crvusd/markets/ethereum';
        const response = await fetch(url, { headers: { "accept": "application/json" } });
        if (response.status !== 200) {
            throw Error(`Fetch error: ${response.status} ${response.statusText}`);
        }
        const { data } = await response.json() as { data: ICrvUsdMarketAPI[] };
        return data;
    },
    {
        promise: true,
        maxAge: 10 * 1000, // 10s
    }
)

// --- ODOS ---

export async function _getQuoteOdos(this: Llamalend, fromToken: string, toToken: string, _amount: bigint, blacklist: string, pathVizImage: boolean, slippage = 0.5): Promise<IQuoteOdos> {
    if (_amount === BigInt(0)) return { outAmounts: ["0"], pathId: '', pathVizImage: '', priceImpact: 0, slippage };

    if (ethers.getAddress(fromToken) == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") fromToken = "0x0000000000000000000000000000000000000000";
    if (ethers.getAddress(toToken) == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") toToken = "0x0000000000000000000000000000000000000000";

    const url = `https://prices.curve.finance/odos/v3/quote?chain_id=${this.chainId}&from_address=${ethers.getAddress(fromToken)}` +
        `&to_address=${ethers.getAddress(toToken)}&amount=${_amount.toString()}&slippage=${slippage}&pathVizImage=${pathVizImage}` +
        `&caller_address=${ethers.getAddress(this.constants.ALIASES.leverage_zap_deprecated)}&blacklist=${ethers.getAddress(blacklist)}`;

    const response = await fetch(url, {  headers: {"accept": "application/json"} });
    if (response.status !== 200) {
        throw Error(`Odos quote error - ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as Omit<IQuoteOdos, 'slippage'>;
    return { ...data, slippage };
}

export async function _getExpectedOdos(this: Llamalend, fromToken: string, toToken: string, _amount: bigint, blacklist: string) {
    return (await _getQuoteOdos.call(this, fromToken, toToken, _amount, blacklist, false)).outAmounts[0]
}

const _assembleTxOdosMemoized = memoize(
    async function (leverageZapAddress: string, pathId: string): Promise<string> {
        const url = `https://prices.curve.finance/odos/assemble?user=${ethers.getAddress(leverageZapAddress)}&path_id=${pathId}`;

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
);

export async function _assembleTxOdos(this: Llamalend, pathId: string): Promise<string> {
    return _assembleTxOdosMemoized(this.constants.ALIASES.leverage_zap_deprecated, pathId);
}
