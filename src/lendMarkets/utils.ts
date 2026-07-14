import { BN, toBN } from "../utils";
import { ILendMarketFromPricesAPI, INetworkName, IMarketData, IMarketDataAPI } from "../interfaces";

export type RatesResult = {
    borrowApr: string;
    lendApr: string;
    borrowApy: string;
    lendApy: string;
};

/**
 * Computes borrow/lend APR and APY from a raw per-second rate and current debt/cap.
 * borrowApy = e^(rate * 365 * 86400) - 1
 * lendApy   = (debt * e^(rate * 365 * 86400) - debt) / cap
 */
export const computeRatesFromRate = (
    _rate: bigint,
    debt: string | number,
    cap: string | number
): RatesResult => {
    const annualFactor = toBN(_rate).times(365).times(86400);
    const expFactor = Math.E ** annualFactor.toNumber();

    const borrowApr = annualFactor.times(100).toString();
    const borrowApy = String((expFactor - 1) * 100);

    const lendAprRaw = annualFactor.times(debt).div(cap).times(100);
    const lendApr = lendAprRaw.isNaN() ? "0" : lendAprRaw.toString();
    const lendApyRaw = BN(debt).times(expFactor).minus(debt).div(cap).times(100);
    const lendApy = lendApyRaw.isNaN() ? "0" : lendApyRaw.toString();

    return { borrowApr, lendApr, borrowApy, lendApy };
}

export const fetchMarketDataByVault = async (
    networkName: INetworkName,
    vaultAddress: string,
    getData: (network: INetworkName) => Promise<IMarketData>
): Promise<IMarketDataAPI> => {
    const response = await getData(networkName);
    const market = response.lendingVaultData.find(
        (item) => item.address.toLowerCase() === vaultAddress.toLowerCase()
    );
    if (!market) throw new Error("Market not found in API");
    return market;
}

export const adaptLendMarketFromPricesApi = (market: ILendMarketFromPricesAPI): IMarketDataAPI => {
    const availableToBorrow = market.total_assets - market.total_debt;

    return {
        name: market.name,
        version: market.version === 2 ? 'v2' : 'v1',
        address: market.vault.toLowerCase(),
        controllerAddress: market.controller.toLowerCase(),
        ammAddress: market.llamma.toLowerCase(),
        monetaryPolicyAddress: market.policy.toLowerCase(),
        gaugeAddress: market.gauge_address?.toLowerCase() ?? '',
        gaugeRewards: [],
        rates: {
            borrowApr: market.borrow_apr / 100,
            borrowApy: market.borrow_apy / 100,
            lendApr: market.lend_apr / 100,
            lendApy: market.lend_apy / 100,
        },
        assets: {
            borrowed: { ...market.borrowed_token, address: market.borrowed_token.address.toLowerCase() },
            collateral: { ...market.collateral_token, address: market.collateral_token.address.toLowerCase() },
        },
        totalSupplied: { total: market.total_assets },
        borrowed: { total: market.total_debt },
        availableToBorrow: { total: availableToBorrow },
        borrowCap: { total: market.total_assets },
        ammBalances: {
            ammBalanceBorrowed: market.borrowed_balance,
            ammBalanceCollateral: market.collateral_balance,
        },
    };
}
