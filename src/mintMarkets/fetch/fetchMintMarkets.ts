import type { Llamalend } from "../../llamalend.js";
import { _getCrvUsdMarketsData } from "../../external-api.js";
import ERC20ABI from '../../constants/abis/ERC20.json' with {type: 'json'};
import llammaABI from "../../constants/abis/crvUSD/llamma.json" with {type: 'json'};
import controllerABI from "../../constants/abis/crvUSD/controller.json" with {type: 'json'};
import controllerV2ABI from "../../constants/abis/crvUSD/controller_v2.json" with {type: 'json'};
import FactoryABI from "../../constants/abis/crvUSD/Factory.json" with {type: 'json'};
import {extractDecimals} from "../../constants/utils.js";
import {handleMultiCallResponse} from "../../utils.js";
import {resolveMonetaryPolicyAbi} from "../monetaryPolicyAbi.js";

export const fetchMintMarketsByAPI = async (llamalend: Llamalend): Promise<void> => {
    if (llamalend.chainId !== 1) return;

    const data = await _getCrvUsdMarketsData();

    const existingControllers = new Set(
        Object.values(llamalend.constants.LLAMMAS).map((l) => l.controller_address)
    );
    const newMarkets = data.filter((m) => !existingControllers.has(m.address.toLowerCase()));

    if (newMarkets.length === 0) return;

    const N1 = Object.keys(llamalend.constants.LLAMMAS).length;
    const controllers = newMarkets.map((m) => m.address.toLowerCase());
    const amms = newMarkets.map((m) => m.llamma.toLowerCase());
    const collaterals = newMarkets.map((m) => m.collateral_token.address.toLowerCase());

    for (const collateral of collaterals) llamalend.setContract(collateral, ERC20ABI);
    for (const amm of amms) llamalend.setContract(amm, llammaABI);
    for (const controller of controllers) llamalend.setContract(controller, controllerABI);

    for (let i = 0; i < newMarkets.length; i++) {
        const market = newMarkets[i];
        const collateral_address = collaterals[i];
        const is_eth = collateral_address === llamalend.constants.WETH;
        const collateral_symbol = market.collateral_token.symbol;
        const monetary_policy_address = market.monetary_policy_address.toLowerCase();

        llamalend.setContract(monetary_policy_address, resolveMonetaryPolicyAbi(monetary_policy_address));

        const _llammaId = is_eth ? "eth" : collateral_symbol.toLowerCase();
        let llammaId = _llammaId;
        let j = 2;
        while (llammaId in llamalend.constants.LLAMMAS) llammaId = _llammaId + j++;

        llamalend.constants.LLAMMAS[llammaId] = {
            amm_address: amms[i],
            controller_address: controllers[i],
            monetary_policy_address,
            collateral_address: is_eth ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" : collateral_address,
            leverage_zap: llamalend.constants.ALIASES.leverage_zap_deprecated,
            deleverage_zap: "0x0000000000000000000000000000000000000000",
            collateral_symbol: is_eth ? "ETH" : collateral_symbol,
            collateral_decimals: market.collateral_token.decimals,
            min_bands: 4,
            max_bands: 50,
            default_bands: 10,
            A: market.amm_a,
            is_deleverage_supported: true,
            index: N1 + i,
        };
    }

    llamalend.constants.DECIMALS = {...llamalend.constants.DECIMALS, ...extractDecimals(llamalend.constants.LLAMMAS)}
};

export const fetchMintMarketsByBlockchain = async (llamalend: Llamalend): Promise<void> => {
    if (llamalend.chainId !== 1) return;

    llamalend.setContract(llamalend.constants.FACTORY, FactoryABI);
    const factoryContract = llamalend.contracts[llamalend.constants.FACTORY].contract;
    const factoryMulticallContract = llamalend.contracts[llamalend.constants.FACTORY].multicallContract;

    const N1 = Object.keys(llamalend.constants.LLAMMAS).length;
    const N2 = await factoryContract.n_collaterals(llamalend.constantOptions);

    const coreCallsMap = ['collaterals', 'amms', 'controllers'];
    let calls = [];
    for (let i = N1; i < N2; i++) {
        calls.push(
            factoryMulticallContract.collaterals(i),
            factoryMulticallContract.amms(i),
            factoryMulticallContract.controllers(i)
        );
    }

    const coreAddresses = (await llamalend.multicallProvider.all(calls) as string[]).map((c) => c.toLowerCase());
    const { collaterals, amms, controllers } = handleMultiCallResponse(coreCallsMap, coreAddresses) as {
        collaterals: string[]; amms: string[]; controllers: string[];
    };

    if (collaterals.length === 0) return;

    const N = collaterals.length;

    for (const collateral of collaterals) llamalend.setContract(collateral, ERC20ABI);
    for (const amm of amms) llamalend.setContract(amm, llammaABI);
    for (let i = 0; i < N; i++) {
        llamalend.setContract(controllers[i], i >= N - 3 ? controllerV2ABI : controllerABI);
    }

    const detailsCallsMap = ['symbols', 'decimals', 'amm_a', 'monetary_policies'];
    calls = [];
    for (let i = 0; i < N; i++) {
        calls.push(
            llamalend.contracts[collaterals[i]].multicallContract.symbol(),
            llamalend.contracts[collaterals[i]].multicallContract.decimals(),
            llamalend.contracts[amms[i]].multicallContract.A(),
            llamalend.contracts[controllers[i]].multicallContract.monetary_policy()
        );
    }

    const flat = (await llamalend.multicallProvider.all(calls)).map((x) =>
        typeof x === "string" ? x.toLowerCase() : x
    );
    const { symbols, decimals, amm_a, monetary_policies } = handleMultiCallResponse(detailsCallsMap, flat) as {
        symbols: string[]; decimals: unknown[]; amm_a: unknown[]; monetary_policies: string[];
    };

    for (const mp of monetary_policies) llamalend.setContract(mp, resolveMonetaryPolicyAbi(mp));

    for (let i = 0; i < N; i++) {
        const is_eth = collaterals[i] === llamalend.constants.WETH;
        const collateral_symbol = symbols[i];
        const collateral_decimals = Number(decimals[i]);
        const monetary_policy_address = monetary_policies[i];

        const _llammaId: string = is_eth ? "eth" : collateral_symbol.toLowerCase();
        let llammaId = _llammaId;
        let j = 2;
        while (llammaId in llamalend.constants.LLAMMAS) llammaId = _llammaId + j++;

        llamalend.constants.LLAMMAS[llammaId] = {
            amm_address: amms[i],
            controller_address: controllers[i],
            monetary_policy_address,
            collateral_address: is_eth ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" : collaterals[i],
            leverage_zap: llamalend.constants.ALIASES.,
            deleverage_zap: "0x0000000000000000000000000000000000000000",
            collateral_symbol: is_eth ? "ETH" : collateral_symbol,
            collateral_decimals,
            min_bands: 4,
            max_bands: 50,
            default_bands: 10,
            A: Number(amm_a[i]),
            is_deleverage_supported: true,
            index: N1 + i,
        };
    }

    llamalend.constants.DECIMALS = {...llamalend.constants.DECIMALS, ...extractDecimals(llamalend.constants.LLAMMAS)}
};
