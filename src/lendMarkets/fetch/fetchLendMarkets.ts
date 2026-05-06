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
import ERC20ABI from '../../constants/abis/ERC20.json' with {type: 'json'};

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

const registerContracts = (
    llamalend: Llamalend,
    { amms, controllers, borrowed_tokens, collateral_tokens, monetary_policies, vaults, gauges }: FactoryData,
    version: 'v1' | 'v2'
) => {
    amms.forEach((_, index) => {
        llamalend.setContract(amms[index], LlammaABI);
        llamalend.setContract(controllers[index], controllerAbiMap[version]);
        llamalend.setContract(monetary_policies[index], MonetaryPolicyABI);
        llamalend.setContract(vaults[index], VaultABI);
        llamalend.setContract(borrowed_tokens[index], ERC20ABI);
        llamalend.setContract(collateral_tokens[index], ERC20ABI);
        const gauge = gauges[index];
        if (gauge && gauge !== llamalend.constants.ZERO_ADDRESS) {
            llamalend.setContract(gauge, llamalend.chainId === 1 ? GaugeABI : SidechainGaugeABI);
        }
    });
};


const registerMarkets = (
    llamalend: Llamalend,
    { names, amms, controllers, borrowed_tokens, collateral_tokens, monetary_policies, vaults, gauges }: FactoryData,
    COIN_DATA: IDict<ICoin>,
    version: 'v1' | 'v2'
) => {
    for (const c in COIN_DATA) {
        llamalend.constants.DECIMALS[c] = COIN_DATA[c].decimals;
    }

    amms.forEach((_, index) => {
        const gauge = gauges[index];
        if (gauge && gauge !== llamalend.constants.ZERO_ADDRESS) {
            llamalend.constants.DECIMALS[gauge] = 18;
        }
        const vault = vaults[index];
        const borrowed_token = borrowed_tokens[index];
        const collateral_token = collateral_tokens[index];
        llamalend.constants.DECIMALS[vault] = 18;

        const marketId = { v1: `one-way-market-${index}`, v2: `one-way-market-v2-${index}` }[version];
        const marketData = {
            name: names[index] || `${COIN_DATA[collateral_token].symbol}/${COIN_DATA[borrowed_token].symbol}`,
            version: version,
            addresses: {
                amm: amms[index],
                controller: controllers[index],
                borrowed_token,
                collateral_token,
                monetary_policy: monetary_policies[index],
                vault,
                gauge,
            },
            borrowed_token: COIN_DATA[borrowed_token],
            collateral_token: COIN_DATA[collateral_token],
        };

        const constant = { v1: 'ONE_WAY_MARKETS' as const, v2: 'ONE_WAY_MARKETS_V2' as const }[version];
        llamalend.constants[constant][marketId] = marketData;
    });
};

export const fetchOneWayMarketsByBlockchain = async (llamalend: Llamalend, version: 'v1' | 'v2' = 'v1') => {
    const factoryData = (await { v1: getFactoryMarketDataV1, v2: getFactoryMarketDataV2 }[version](llamalend)) as FactoryData
    registerContracts(llamalend, factoryData, version)

    const { amms, vaults, controllers, borrowed_tokens, collateral_tokens } = factoryData;
    const [coins] = await Promise.all([
        llamalend.getCoins(collateral_tokens, borrowed_tokens),
        llamalend.fetchStats(amms, controllers, vaults, borrowed_tokens, collateral_tokens, version),
    ])

    registerMarkets(llamalend, factoryData, coins, version);
};

export const fetchOneWayMarketsByAPI = async (llamalend: Llamalend, version: 'v1' | 'v2' = 'v1') => {
    const factoryData = (await getFactoryMarketDataByAPI(llamalend)) as FactoryData;
    registerContracts(llamalend, factoryData, version)
    const coins = await llamalend.getCoins(factoryData.collateral_tokens, factoryData.borrowed_tokens, true);
    registerMarkets(llamalend, factoryData, coins, version);
};
