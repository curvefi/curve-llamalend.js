import MonetaryPolicyABI from '../constants/abis/MonetaryPolicy.json' with {type: 'json'};
import MonetaryPolicyV2ABI from '../constants/abis/MonetaryPolicyLendMainnetV2.json' with {type: 'json'};

const LEGACY_SIGNATURE_CONTROLLERS: ReadonlySet<string> = new Set([
    '0x745422bf49f3f6e4a8e12e4abd19339e7910f8c9',
]);

export const resolveLendMonetaryPolicyAbi = (version: 'v1' | 'v2', controllerAddress: string): any => {
    if (version === 'v1') return MonetaryPolicyABI;
    return LEGACY_SIGNATURE_CONTROLLERS.has(controllerAddress.toLowerCase())
        ? MonetaryPolicyABI
        : MonetaryPolicyV2ABI;
};
