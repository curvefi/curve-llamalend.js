import { BN, toBN } from "../utils";
import { INetworkName, IMarketData, IMarketDataAPI } from "../interfaces";

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

    const lendApr = annualFactor.times(debt).div(cap).times(100).toString();
    const lendApy = BN(debt).times(expFactor).minus(debt).div(cap).times(100).toString();

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
