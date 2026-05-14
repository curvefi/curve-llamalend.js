import type { Llamalend } from "../llamalend.js";
import type { IOneWayMarket } from "../interfaces.js";

import LlammaABI from '../constants/abis/Llamma.json' with {type: 'json'};
import ControllerABI from '../constants/abis/Controller.json' with {type: 'json'};
import ControllerV2ABI from '../constants/abis/ControllerV2.json' with {type: 'json'};
import MonetaryPolicyABI from '../constants/abis/MonetaryPolicy.json' with {type: 'json'};
import VaultABI from '../constants/abis/Vault.json' with {type: 'json'};
import GaugeABI from '../constants/abis/GaugeV5.json' with {type: 'json'};
import SidechainGaugeABI from '../constants/abis/SidechainGauge.json' with {type: 'json'};
import ERC20ABI from '../constants/abis/ERC20.json' with {type: 'json'};

const controllerAbiMap = {
    v1: ControllerABI,
    v2: ControllerV2ABI,
};

const VAULT_DECIMALS = 18;
const GAUGE_DECIMALS = 18;

export const setupLendMarketContracts = (llamalend: Llamalend, marketData: IOneWayMarket): void => {
    const { addresses, borrowed_token, collateral_token, version } = marketData;

    llamalend.setContract(addresses.amm, LlammaABI);
    llamalend.setContract(addresses.controller, controllerAbiMap[version]);
    llamalend.setContract(addresses.monetary_policy, MonetaryPolicyABI);
    llamalend.setContract(addresses.vault, VaultABI);
    llamalend.setContract(addresses.gauge, llamalend.chainId === 1 ? GaugeABI : SidechainGaugeABI);

    llamalend.setContract(borrowed_token.address, ERC20ABI);
    llamalend.setContract(collateral_token.address, ERC20ABI);

    llamalend.constants.DECIMALS[borrowed_token.address] = borrowed_token.decimals;
    llamalend.constants.DECIMALS[collateral_token.address] = collateral_token.decimals;
    llamalend.constants.DECIMALS[addresses.vault] = VAULT_DECIMALS;
    if (addresses.gauge && addresses.gauge !== llamalend.constants.ZERO_ADDRESS) {
        llamalend.constants.DECIMALS[addresses.gauge] = GAUGE_DECIMALS;
    }
};
