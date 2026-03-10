import type { Llamalend } from "../../llamalend.js";
import type { ICoin, IDict } from "../../interfaces.js";
import { getFactoryMarketDataV1, getFactoryMarketDataV2, getFactoryMarketDataByAPI } from "./fetchFactoryData.js";

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

const registerMarkets = (
    llamalend: Llamalend,
    names: string[],
    amms: string[],
    controllers: string[],
    borrowed_tokens: string[],
    collateral_tokens: string[],
    monetary_policies: string[],
    vaults: string[],
    gauges: string[],
    COIN_DATA: IDict<ICoin>,
    version: 'v1' | 'v2'
) => {
    amms.forEach((amm: string, index: number) => {
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

        const marketData = {
            name: names[index],
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

        if (version === 'v2') {
            llamalend.constants.ONE_WAY_MARKETS_V2[`one-way-market-v2-${index}`] = marketData;
        } else {
            llamalend.constants.ONE_WAY_MARKETS[`one-way-market-${index}`] = marketData;
        }
    });
};

export const fetchOneWayMarketsByBlockchain = async (llamalend: Llamalend, version: 'v1' | 'v2' = 'v1') => {
    const factoryData = version === 'v2'
        ? await getFactoryMarketDataV2(llamalend)
        : await getFactoryMarketDataV1(llamalend);

    const { names, amms, controllers, borrowed_tokens, collateral_tokens, monetary_policies, vaults, gauges } = factoryData;
    const COIN_DATA = await llamalend.getCoins(collateral_tokens, borrowed_tokens);
    for (const c in COIN_DATA) {
        llamalend.constants.DECIMALS[c] = COIN_DATA[c].decimals;
    }

    registerMarkets(llamalend, names, amms, controllers, borrowed_tokens, collateral_tokens, monetary_policies, vaults, gauges, COIN_DATA, version);

    if (version === 'v2') {
        llamalend.constants.ONE_WAY_MARKETS_V2 = await llamalend._filterHiddenMarkets(llamalend.constants.ONE_WAY_MARKETS_V2);
    } else {
        llamalend.constants.ONE_WAY_MARKETS = await llamalend._filterHiddenMarkets(llamalend.constants.ONE_WAY_MARKETS);
    }

    await llamalend.fetchStats(amms, controllers, vaults, borrowed_tokens, collateral_tokens, version);
};

export const fetchOneWayMarketsByAPI = async (llamalend: Llamalend, version: 'v1' | 'v2' = 'v1') => {
    const { names, amms, controllers, borrowed_tokens, collateral_tokens, monetary_policies, vaults, gauges } = await getFactoryMarketDataByAPI(llamalend);
    const COIN_DATA = await llamalend.getCoins(collateral_tokens, borrowed_tokens, true);
    for (const c in COIN_DATA) {
        llamalend.constants.DECIMALS[c] = COIN_DATA[c].decimals;
    }

    registerMarkets(llamalend, names, amms, controllers, borrowed_tokens, collateral_tokens, monetary_policies, vaults, gauges, COIN_DATA, version);

    if (version === 'v2') {
        llamalend.constants.ONE_WAY_MARKETS_V2 = await llamalend._filterHiddenMarkets(llamalend.constants.ONE_WAY_MARKETS_V2);
    } else {
        llamalend.constants.ONE_WAY_MARKETS = await llamalend._filterHiddenMarkets(llamalend.constants.ONE_WAY_MARKETS);
    }
};
