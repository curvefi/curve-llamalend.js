import MonetaryPolicyABI from "../constants/abis/crvUSD/MonetaryPolicy.json" with { type: "json" };
import MonetaryPolicy2ABI from "../constants/abis/crvUSD/MonetaryPolicy2.json" with { type: "json" };

const LEGACY_MONETARY_POLICIES: ReadonlySet<string> = new Set([
    "0xc684432fd6322c6d58b6bc5d28b18569aa0ad0a1",
]);

export const resolveMonetaryPolicyAbi = (monetaryPolicyAddress: string): any => {
    return LEGACY_MONETARY_POLICIES.has(monetaryPolicyAddress.toLowerCase())
        ? MonetaryPolicyABI
        : MonetaryPolicy2ABI;
};
