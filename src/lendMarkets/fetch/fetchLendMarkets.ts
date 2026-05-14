import type { Llamalend } from "../../llamalend.js";
import type { ICoin, IDict } from "../../interfaces.js";
import { getFactoryMarketDataV1, getFactoryMarketDataV2, getFactoryMarketDataByAPI } from "./fetchFactoryData.js";
import { setupLendMarketContracts } from "../setupContracts.js";

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

        setupLendMarketContracts(llamalend, marketData);

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
};

export const fetchOneWayMarketsByAPI = async (llamalend: Llamalend, version: 'v1' | 'v2' = 'v1') => {
    const { names, amms, controllers, borrowed_tokens, collateral_tokens, monetary_policies, vaults, gauges } = await getFactoryMarketDataByAPI(llamalend);
    const COIN_DATA = await llamalend.getCoins(collateral_tokens, borrowed_tokens, true);
    for (const c in COIN_DATA) {
        llamalend.constants.DECIMALS[c] = COIN_DATA[c].decimals;
    }

    registerMarkets(llamalend, names, amms, controllers, borrowed_tokens, collateral_tokens, monetary_policies, vaults, gauges, COIN_DATA, version);
};
