import { BN, toBN } from "../utils";
import { INetworkName, IMarketData, IMarketDataAPI } from "../interfaces";

export type RatesResult = {
    borrowApr: string;
    lendApr: string;
    borrowApy: string;
    lendApy: string;
};

const PRECISION = BigInt("1000000000000000000"); // 1e18

/**
 * Computes borrow/lend APR and APY from a raw per-second rate and current debt/cap.
 * borrowApy = e^(rate * 365 * 86400) - 1
 * lendApy   = (debt * e^(rate * 365 * 86400) - debt) / cap
 */
export const computeRatesFromRate = (
    _rate: bigint,
    debt: string | number,
    cap: string | number,
    adminPercentage: bigint
): RatesResult => {
    const annualFactorBorrow = toBN(_rate).times(365).times(86400);
    const annualFactorLend = toBN(_rate * (PRECISION - adminPercentage) / PRECISION).times(365).times(86400);
    const expFactorBorrow = Math.E ** annualFactorBorrow.toNumber();
    const expFactorLend = Math.E ** annualFactorLend.toNumber();

    const borrowApr = annualFactorBorrow.times(100).toString();
    const borrowApy = String((expFactorBorrow - 1) * 100);

    const lendAprRaw = annualFactorLend.times(debt).div(cap).times(100);
    const lendApr = lendAprRaw.isNaN() ? "0" : lendAprRaw.toString();
    const lendApyRaw = BN(debt).times(expFactorLend).minus(debt).div(cap).times(100);
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
