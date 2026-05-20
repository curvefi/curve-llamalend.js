import type { Llamalend } from "../llamalend.js";
import type { ILlamma } from "../interfaces.js";

import ERC20ABI from "../constants/abis/ERC20.json" with { type: "json" };
import llammaABI from "../constants/abis/crvUSD/llamma.json" with { type: "json" };
import controllerABI from "../constants/abis/crvUSD/controller.json" with { type: "json" };
import controllerV2ABI from "../constants/abis/crvUSD/controller_v2.json" with { type: "json" };
import LeverageZapCrvUSDABI from "../constants/abis/crvUSD/LeverageZap.json" with { type: "json" };
import DeleverageZapABI from "../constants/abis/crvUSD/DeleverageZap.json" with { type: "json" };
import HealthCalculatorZapABI from "../constants/abis/crvUSD/HealthCalculatorZap.json" with { type: "json" };
import LeverageZapABI from "../constants/abis/LeverageZap.json" with { type: "json" };
import { resolveMonetaryPolicyAbi } from "./monetaryPolicyAbi.js";

const NATIVE_ETH_PLACEHOLDER = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export const setupMintMarketContracts = (llamalend: Llamalend, llammaData: ILlamma): void => {
    const isNewMarket = llammaData.is_deleverage_supported === true;

    llamalend.setContract(llammaData.amm_address, llammaABI);
    llamalend.setContract(llammaData.controller_address, isNewMarket ? controllerV2ABI : controllerABI);
    llamalend.setContract(llammaData.monetary_policy_address, resolveMonetaryPolicyAbi(llammaData.monetary_policy_address));

    if (llammaData.collateral_address === NATIVE_ETH_PLACEHOLDER) {
        llamalend.setContract(llamalend.constants.WETH, ERC20ABI);
    } else {
        llamalend.setContract(llammaData.collateral_address, ERC20ABI);
    }

    llamalend.setContract(llammaData.leverage_zap, isNewMarket ?  LeverageZapABI : LeverageZapCrvUSDABI);
    llamalend.setContract(llammaData.deleverage_zap, DeleverageZapABI);
    if (llammaData.health_calculator_zap && llammaData.health_calculator_zap !== llamalend.constants.ZERO_ADDRESS) {
        llamalend.setContract(llammaData.health_calculator_zap, HealthCalculatorZapABI);
    }

    llamalend.constants.DECIMALS[llammaData.collateral_address] = llammaData.collateral_decimals;
};
