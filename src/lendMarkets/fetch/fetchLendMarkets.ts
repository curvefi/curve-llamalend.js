import type {Llamalend} from "../../llamalend.js";
import {ICoin, IDict} from "../../interfaces.js";
import {getFactoryMarketDataByAPI, getFactoryMarketDataV1, getFactoryMarketDataV2} from "./fetchFactoryData.js";

import LlammaABI from '../../constants/abis/Llamma.json' with {type: 'json'};
import ControllerABI from '../../constants/abis/Controller.json' with {type: 'json'};
import ControllerV2ABI from '../../constants/abis/ControllerV2.json' with {type: 'json'};
import MonetaryPolicyABI from '../../constants/abis/MonetaryPolicy.json' with {type: 'json'};
import VaultABI from '../../constants/abis/Vault.json' with {type: 'json'};
import GaugeABI from '../../constants/abis/GaugeV5.json' with {type: 'json'};
import SidechainGaugeABI from '../../constants/abis/SidechainGauge.json' with {type: 'json'};

const controllerAbiMap = {
    'v1' : ControllerABI,
    'v2' : ControllerV2ABI,
}

type FactoryData = {
    names: string[],
    amms: string[],
    controllers: string[],
    borrowed_tokens: string[],
    collateral_tokens: string[],
    monetary_policies: string[],
    vaults: string[],
    gauges: string[],
};

const registerMarkets = (
    llamalend: Llamalend,
    { names, amms, controllers, borrowed_tokens, collateral_tokens, monetary_policies, vaults, gauges }: FactoryData,
    COIN_DATA: IDict<ICoin>,
    version: 'v1' | 'v2',
    hiddenMarkets: string[]
) => {
    const hidden = new Set(hiddenMarkets);
    for (const c in COIN_DATA) {
        llamalend.constants.DECIMALS[c] = COIN_DATA[c].decimals;
    }

    amms.forEach((_, index) => {
        llamalend.setContract(amms[index], LlammaABI);
        llamalend.setContract(controllers[index], controllerAbiMap[version]);
        llamalend.setContract(monetary_policies[index], MonetaryPolicyABI);
        llamalend.setContract(vaults[index], VaultABI);
        if (gauges[index]) {
            llamalend.setContract(gauges[index], llamalend.chainId === 1 ? GaugeABI : SidechainGaugeABI);
        }
        COIN_DATA[vaults[index]] = {
            address: vaults[index],
            decimals: 18,
            name: "Curve Vault for " + COIN_DATA[borrowed_tokens[index]].name,
            symbol: "cv" + COIN_DATA[borrowed_tokens[index]].symbol,
        };
        COIN_DATA[gauges[index]] = {
            address: gauges[index],
            decimals: 18,
            name: "curve.finance " + COIN_DATA[borrowed_tokens[index]].name + " Gauge Deposit",
            symbol: "cv" + COIN_DATA[borrowed_tokens[index]].symbol + "-gauge",
        };
        llamalend.constants.DECIMALS[vaults[index]] = 18;
        llamalend.constants.DECIMALS[gauges[index]] = 18;
        const marketId = { v1: `one-way-market-${index}`, v2: `one-way-market-v2-${index}` }[version];
        if (hidden.has(marketId)) return;

        const marketData = {
            name: names[index] || `${COIN_DATA[collateral_tokens[index]].symbol}/${COIN_DATA[borrowed_tokens[index]].symbol}`,
            version: version,
            addresses: {
                amm: amms[index],
                controller: controllers[index],
                borrowed_token: borrowed_tokens[index],
                collateral_token: collateral_tokens[index],
                monetary_policy: monetary_policies[index],
                vault: vaults[index],
                gauge: gauges[index],
            },
            borrowed_token: COIN_DATA[borrowed_tokens[index]],
            collateral_token: COIN_DATA[collateral_tokens[index]],
        };

        const constant = { v1: 'ONE_WAY_MARKETS' as const, v2: 'ONE_WAY_MARKETS_V2' as const }[version];
        llamalend.constants[constant][marketId] = marketData;
    });
};

export const fetchOneWayMarketsByBlockchain = async (llamalend: Llamalend, version: 'v1' | 'v2' = 'v1') => {
    const hiddenMarketsPromise = llamalend._getHiddenMarkets();
    const factoryData = (await (version === 'v2' ? getFactoryMarketDataV2 :  getFactoryMarketDataV1)(llamalend)) as FactoryData

    const { amms, vaults, controllers, borrowed_tokens, collateral_tokens } = factoryData;
    const [coins, hiddenMarkets] = await Promise.all([
        llamalend.getCoins(collateral_tokens, borrowed_tokens),
        hiddenMarketsPromise,
    ])

    registerMarkets(llamalend, factoryData, coins, version, hiddenMarkets);

    await llamalend.fetchStats(amms, controllers, vaults, borrowed_tokens, collateral_tokens, version);
};

export const fetchOneWayMarketsByAPI = async (llamalend: Llamalend, version: 'v1' | 'v2' = 'v1') => {
    const hiddenMarketsPromise = llamalend._getHiddenMarkets();
    const factoryData = (await getFactoryMarketDataByAPI(llamalend)) as FactoryData;
    const [coins, hiddenMarkets] = await Promise.all([
        llamalend.getCoins(factoryData.collateral_tokens, factoryData.borrowed_tokens, true),
        hiddenMarketsPromise,
    ]);
    registerMarkets(llamalend, factoryData, coins, version, hiddenMarkets);
};
