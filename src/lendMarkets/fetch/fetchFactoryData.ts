import { Call } from "@curvefi/ethcall";
import { createCall, handleMultiCallResponse } from "../../utils.js";
import { IMarketDataAPI } from "../../interfaces.js";
import { _getMarketsData } from "../../external-api.js";
import type { Llamalend } from "../../llamalend.js";

export const getFactoryMarketDataV1 = async (llamalend: Llamalend) => {
    const factoryAlias = 'one_way_factory';

    if (!llamalend.constants.ALIASES[factoryAlias] || llamalend.constants.ALIASES[factoryAlias] === llamalend.constants.ZERO_ADDRESS) {
        throw new Error(`Factory v1 is not available for network ${llamalend.constants.NETWORK_NAME}`);
    }

    const factoryAddress = llamalend.constants.ALIASES[factoryAlias];
    const factory = llamalend.contracts[factoryAddress];
    const factoryContract = factory.contract;
    const markets_count = await factoryContract.market_count();
    const callsMap = ['names', 'amms', 'controllers', 'borrowed_tokens', 'collateral_tokens', 'monetary_policies', 'vaults', 'gauges']

    const calls: Call[] = [];
    for (let i = 0; i < markets_count; i++) {
        callsMap.forEach((item) => {
            calls.push(createCall(factory, item, [i]))
        })
    }
    const res = (await llamalend.multicallProvider.all(calls) as string[]).map((addr) => addr.toLowerCase());

    const factoryData = handleMultiCallResponse(callsMap, res);

    const oldGaugeEndIndex = Number(llamalend.constants.ALIASES.old_gauge_end_index ?? -1);
    if (oldGaugeEndIndex >= 0) {
        const oldGaugeFactory = llamalend.contracts[llamalend.constants.ALIASES.gauge_factory_old];
        const vaults = factoryData.vaults.slice(0, oldGaugeEndIndex + 1);
        const gauges = (await llamalend.multicallProvider.all(
            vaults.map((vault: string) => createCall(oldGaugeFactory, "get_gauge_from_lp_token", [vault]))
        ) as string[]).map((address) => address.toLowerCase());
        gauges.forEach((gauge, i) => { factoryData.gauges[i] = gauge; });
    }

    return factoryData;
};

export const getFactoryMarketDataByAPI = async (llamalend: Llamalend) => {
    const apiData = (await _getMarketsData(llamalend.constants.NETWORK_NAME)).lendingVaultData;

    const result: Record<string, string[]> = {
        names: [],
        amms: [],
        controllers: [],
        borrowed_tokens: [],
        collateral_tokens: [],
        monetary_policies: [],
        vaults: [],
        gauges: [],
    };

    apiData.forEach((market: IMarketDataAPI) => {
        result.names.push(market.name);
        result.amms.push(market.ammAddress.toLowerCase());
        result.controllers.push(market.controllerAddress.toLowerCase());
        result.borrowed_tokens.push(market.assets.borrowed.address.toLowerCase());
        result.collateral_tokens.push(market.assets.collateral.address.toLowerCase());
        result.monetary_policies.push(market.monetaryPolicyAddress.toLowerCase());
        result.vaults.push(market.address.toLowerCase());
        result.gauges.push(market.gaugeAddress?.toLowerCase() || llamalend.constants.ZERO_ADDRESS);
    });

    return result;
};

export const getFactoryMarketDataV2 = async (llamalend: Llamalend) => {
    const factoryAlias = 'one_way_factory_v2';

    if (!llamalend.constants.ALIASES[factoryAlias] || llamalend.constants.ALIASES[factoryAlias] === llamalend.constants.ZERO_ADDRESS) {
        throw new Error(`Factory v2 is not available for network ${llamalend.constants.NETWORK_NAME}`);
    }

    const factoryAddress = llamalend.constants.ALIASES[factoryAlias];
    const factory = llamalend.contracts[factoryAddress];
    const factoryContract = factory.contract;
    const markets_count = await factoryContract.market_count();

    const calls: Call[] = [];

    for (let i = 0; i < markets_count; i++) {
        calls.push(createCall(factory, 'markets', [i]));
    }

    const res = await llamalend.multicallProvider.all(calls);

    const names: string[] = [];
    const vaults: string[] = [];
    const controllers: string[] = [];
    const amms: string[] = [];
    const collateral_tokens: string[] = [];
    const borrowed_tokens: string[] = [];
    const monetary_policies: string[] = [];
    const gauges: string[] = [];

    for (let i = 0; i < markets_count; i++) {
        const marketData = res[i] as any;

        vaults.push(marketData[0].toLowerCase());
        controllers.push(marketData[1].toLowerCase());
        amms.push(marketData[2].toLowerCase());
        collateral_tokens.push(marketData[3].toLowerCase());
        borrowed_tokens.push(marketData[4].toLowerCase());
        monetary_policies.push(marketData[6].toLowerCase());
        names.push(''); // new factory does not give names, it's generated at the market creation level
        gauges.push(llamalend.constants.ZERO_ADDRESS);
    }

    return {
        names,
        amms,
        controllers,
        borrowed_tokens,
        collateral_tokens,
        monetary_policies,
        vaults,
        gauges,
    };
};
