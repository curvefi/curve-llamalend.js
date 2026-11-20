import MonetaryPolicyABI from '../constants/abis/MonetaryPolicy.json' with {type: 'json'};
import MonetaryPolicyV2ABI from '../constants/abis/MonetaryPolicyLendMainnetV2.json' with {type: 'json'};

export const resolveLendMonetaryPolicyAbi = (version: 'v1' | 'v2'): any =>
    version === 'v1' ? MonetaryPolicyABI : MonetaryPolicyV2ABI;
