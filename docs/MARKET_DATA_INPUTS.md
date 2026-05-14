# Market Data Inputs

Data shapes required by the "by-data" constructors:

| Function                | Input type      |
|-------------------------|-----------------|
| `getMintMarketByData`   | `ILlamma`       |
| `getLendMarketByData`   | `IOneWayMarket` |

---

## `ILlamma` — for `getMintMarketByData`

```ts
interface ILlamma {
    amm_address:              string;   // LLAMMA AMM address
    controller_address:       string;   // Controller address
    monetary_policy_address:  string;   // Monetary policy address
    collateral_address:       string;   // Collateral ERC-20 (use 0xeee...eee for native ETH)
    leverage_zap:             string;   // Leverage zap (ZERO_ADDRESS if unsupported)
    deleverage_zap:           string;   // Deleverage zap (ZERO_ADDRESS if unsupported)
    health_calculator_zap?:   string;   // Optional health-calc helper
    collateral_symbol:        string;   // e.g. "ETH", "wstETH"
    collateral_decimals:      number;   // Collateral decimals
    min_bands:                number;   // Min bands (prod: 4)
    max_bands:                number;   // Max bands (prod: 50)
    default_bands:            number;   // Default bands (prod: 10)
    A:                        number;   // LLAMMA amplification (prod: 100)
    is_deleverage_supported?: boolean;  // Defaults to false
    index?:                   number;   // Sequential factory index
}
```

---

## `IOneWayMarket` — for `getLendMarketByData`

```ts
interface IOneWayMarket {
    name:    string;              // Empty → auto: "<collateral>/<borrowed>"
    version: "v1" | "v2";         // Selects controller ABI & module set
    addresses: {
        amm:              string;
        controller:       string;
        borrowed_token:   string;
        collateral_token: string;
        monetary_policy:  string;
        vault:            string;
        gauge:            string; // ZERO_ADDRESS if none
    };
    borrowed_token: {
        address:  string;         // Must match addresses.borrowed_token
        name:     string;         // e.g. "Curve.Fi USD Stablecoin"
        symbol:   string;         // e.g. "crvUSD"
        decimals: number;         // Token decimals
    };
    collateral_token: {
        address:  string;         // Must match addresses.collateral_token
        name:     string;         // e.g. "Wrapped Ether"
        symbol:   string;         // e.g. "WETH"
        decimals: number;         // Token decimals
    };
}
```
