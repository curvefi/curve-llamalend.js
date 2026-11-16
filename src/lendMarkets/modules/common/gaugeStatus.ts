import { isError } from "ethers";
import type { Llamalend } from "../../../llamalend";
import { getGaugesOverview } from "../../../external-api";

export async function _isGaugeKilled(llamalend: Llamalend, gaugeAddress: string): Promise<boolean | null> {
    if (!gaugeAddress || gaugeAddress === llamalend.constants.ZERO_ADDRESS) return null;
    const target = gaugeAddress.toLowerCase();

    try {
        const gauges = await getGaugesOverview();
        const gauge = gauges.find((g) => g.address.toLowerCase() === target);
        if (gauge) return gauge.is_killed;
    } catch (e) {
        if (llamalend.chainId !== 1) throw e;
    }

    if (llamalend.chainId === 1) return _isGaugeKilledOnchain(llamalend, gaugeAddress);
    throw new Error(`Cannot determine killed status of gauge ${gaugeAddress}: not indexed by the prices API and on-chain reads require Ethereum`);
}

export async function _isGaugeRegistered(llamalend: Llamalend, gaugeAddress: string): Promise<boolean | null> {
    if (!gaugeAddress || gaugeAddress === llamalend.constants.ZERO_ADDRESS) return null;
    const target = gaugeAddress.toLowerCase();

    try {
        const gauges = await getGaugesOverview();
        const gauge = gauges.find((g) => g.address.toLowerCase() === target);
        if (gauge) return gauge.is_approved;
    } catch (e) {
        if (llamalend.chainId !== 1) throw e;
    }

    if (llamalend.chainId === 1) return _isGaugeRegisteredOnchain(llamalend, gaugeAddress);
    throw new Error(`Cannot determine registration of gauge ${gaugeAddress}: not indexed by the prices API and on-chain reads require Ethereum`);
}

async function _isGaugeKilledOnchain(llamalend: Llamalend, gaugeAddress: string): Promise<boolean> {
    const gaugeContract = llamalend.contracts[gaugeAddress]?.contract;
    if (!gaugeContract || !('is_killed()' in gaugeContract)) {
        throw new Error(`Gauge ${gaugeAddress} has no is_killed() method`);
    }
    return await gaugeContract.is_killed(llamalend.constantOptions);
}

async function _isGaugeRegisteredOnchain(llamalend: Llamalend, gaugeAddress: string): Promise<boolean> {
    const gaugeController = llamalend.contracts[llamalend.constants.ALIASES.gauge_controller]?.contract;
    if (!gaugeController) throw new Error("GaugeController contract is not available");
    try {
        await gaugeController.gauge_types(gaugeAddress, llamalend.constantOptions);
        return true;
    } catch (e) {
        if (isError(e, "CALL_EXCEPTION") || isError(e, "BAD_DATA")) return false;
        throw e;
    }
}
