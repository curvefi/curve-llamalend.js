# Market Data Comparison Test (API vs Blockchain)

Test file: [`test/marketsApiVsChain.test.ts`](../test/marketsApiVsChain.test.ts)
Run with: `npm test`

This test fetches the same markets twice — once via the Curve API (`useApi: true`)
and once directly from the blockchain (`useApi: false`) — using two independent
`createLlamalend()` instances, and asserts that both sources describe the exact
same markets. It covers:

| Suite                                     | Network      | Market type            | Comparison             |
|--------------------------------------------|--------------|-------------------------|-------------------------|
| Mainnet lend markets (v1)                  | Ethereum (1) | LlamaLend one-way (v1)  | API vs blockchain       |
| Mainnet mint markets (crvUSD)               | Ethereum (1) | crvUSD LLAMMA           | API vs blockchain       |
| Optimism lend markets (v1)                  | Optimism (10)| LlamaLend one-way (v1)  | API vs blockchain       |
| Optimism lend markets (v2, LlamaLend v2)    | Optimism (10)| LlamaLend one-way (v2)  | on-chain sanity only (no API for v2 yet) |

---

## 1. Lend markets (v1) — fields compared

Source data types: `IMarketDataAPI` (API) vs on-chain factory calls (`getFactoryMarketDataV1`) → both normalized into `IOneWayMarket` / `LendMarketTemplate`.

| Field                          | Compared? | Notes |
|--------------------------------|:---------:|-------|
| `addresses.vault`              | ✅ | Used as the comparison key (lowercased) |
| `addresses.amm`                | ✅ | |
| `addresses.controller`         | ✅ | |
| `addresses.borrowed_token`     | ✅ | |
| `addresses.collateral_token`   | ✅ | |
| `addresses.monetary_policy`    | ✅ | |
| `addresses.gauge`              | ✅ | Zero address if no gauge, on both sides |
| `version`                      | ✅ | `'v1'` |
| `borrowed_token.address`       | ✅ | |
| `borrowed_token.symbol`        | ✅ | |
| `borrowed_token.decimals`      | ✅ | |
| `collateral_token.address`     | ✅ | |
| `collateral_token.symbol`      | ✅ | |
| `collateral_token.decimals`    | ✅ | |
| `name`                         | ⚠️ non-empty only | API returns a display name (`"Borrow crvUSD (wstETH collateral)"`), on-chain factory returns an internal slug (`"wsteth-long"`) — different, both valid, conventions. Checked for non-emptiness on both sides instead of equality. |
| `borrowed_token.name` / `collateral_token.name` | ❌ | API fetch fills this with the token **symbol**; on-chain fetch reads the real ERC20 `name()`. Always different by design — comparing would always fail. |
| `id` (e.g. `one-way-market-3`) | ✅ (separately) | Not part of the data snapshot itself (it's a derived, source-local identifier — see below), but explicitly asserted equal for the same market (matched by `vault` address) via a dedicated test. |

## 2. Mint markets (crvUSD) — fields compared

Source data type: `ILlamma` (from `ICrvUsdMarketAPI` via API, or Factory contract calls on-chain) → `MintMarketTemplate`.

| Field                 | Compared? | Notes |
|-----------------------|:---------:|-------|
| `controller`          | ✅ | Used as the comparison key (lowercased) |
| `address` (amm)       | ✅ | |
| `monetaryPolicy`      | ✅ | |
| `collateral`          | ✅ | |
| `collateralSymbol`    | ✅ | Caught a real bug here: the on-chain fetcher used to lowercase **all** multicall string results, including the ERC-20 `symbol()` (e.g. `LBTC` → `lbtc`). Fixed in `fetchMintMarketsByBlockchain` — only addresses are lowercased now. |
| `collateralDecimals`  | ✅ | |
| `A`                   | ✅ | LLAMMA amplification coefficient |
| `leverageZap`, `deleverageZap`, `isDeleverageSupported`, `minBands`, `maxBands`, `defaultBands`, `index` | ❌ | Both the API and on-chain fetchers hardcode identical constants for these (see `fetchMintMarketsByAPI`/`fetchMintMarketsByBlockchain`) — neither source actually reads them from anywhere, so there's nothing meaningful to diff. |
| `healthCalculator`    | ❌ | Not set by either fetcher (`undefined` on both sides) |
| `id` (e.g. `wsteth`, or `lbtc2` on a symbol collision) | ✅ (separately) | Derived from the collateral symbol, not list position, so it's more stable than lend market ids by construction — but still explicitly asserted equal for the same market (matched by `controller` address) via a dedicated test, for the same reason as lend markets below. |

## 3. LlamaLend v2 (Optimism) — on-chain sanity checks

There is no API for v2 markets yet (`fetchMarkets({ useApi: true, version: 'v2' })` throws), so instead of a diff we assert basic data integrity for every market returned on-chain:

| Check | Assertion |
|-------|-----------|
| At least one v2 market found | `snapshots.size > 0` |
| `version` | equals `'v2'` |
| `addresses.{amm, controller, borrowed_token, collateral_token, monetary_policy, vault}` | not the zero address |
| `borrowed_token` / `collateral_token` `.symbol` | non-empty |
| `borrowed_token` / `collateral_token` `.decimals` | `> 0` |

`addresses.gauge` is **not** asserted non-zero for v2, since gauges legitimately don't exist for every market.

---

## 4. Market `id` consistency

`LendMarketTemplate.id` / `MintMarketTemplate.id` (e.g. `"one-way-market-3"`, `"wsteth"`) are **not**
fetched data — they're assigned locally, based on how each fetcher populates the
market registry (`constants.ONE_WAY_MARKETS[id]` / `constants.LLAMMAS[id]`):

- **Lend markets**: `id = one-way-market-${index}`, where `index` is the position
  in whatever array the fetch returned (API response order, or on-chain factory
  index order — see `registerMarkets` in `fetchLendMarkets.ts`). This makes the
  id **order-dependent**: if the API ever returned markets in a different order
  than the on-chain factory (e.g. sorted by TVL instead of creation order),
  `getLendMarket('one-way-market-3')` would resolve to a *different* market
  depending on which fetch method populated the registry — silently.
- **Mint markets**: `id` is derived from the collateral symbol (`wsteth`, `lbtc`,
  with a numeric suffix on symbol collisions — see `fetchMintMarkets.ts`), so
  it's content-derived rather than position-derived, and inherently more stable.

Because of this, `id` is deliberately **not** part of the field-by-field data
snapshot (`LendMarketSnapshot`/`MintMarketSnapshot`) — comparing it there would
conflate "the data field values match" with "the two fetches happened to
enumerate markets in the same order". Instead, every API-vs-blockchain suite has
a dedicated test — `assigns the same id to the same market regardless of fetch
source` — that looks up each market by its stable key (`vault`/`controller`
address) and asserts the API fetch and the blockchain fetch assigned it the
same `id`. As of the last run this holds for all 48 mainnet + 5 Optimism lend
markets and all 9 mint markets, but it's now an explicit, regression-protected
assertion rather than an implicit assumption.

---

## 5. What is intentionally *not* covered, and why

| Gap | Why it's out of scope | Mitigation |
|-----|------------------------|------------|
| Live stats: `rates` (APR/APY), `totalSupplied`, `borrowed`, `availableToBorrow`, `borrowCap`, `vaultShares`, `usdTotal`, `ammBalances`, `gaugeRewards` (all part of `IMarketDataAPI`) | These are point-in-time market **statistics**, not market **identity/registration** data. They aren't part of `IOneWayMarket`/`LendMarketTemplate` at all — the library never stores them in `constants.ONE_WAY_MARKETS`. There's no fixed on-chain "snapshot" to diff them against at fetch time (they constantly change block-to-block). | Out of scope for this test by design. Could be covered by a separate, tolerance-based test if needed. |
| Coverage direction: only **API ⊆ blockchain** is asserted (a market known to the API must exist and match on-chain) | The reverse (**blockchain ⊆ API**) is *expected* to sometimes be false — a brand-new market created on-chain takes time to appear in the API index. Failing the suite on this would produce false negatives unrelated to a real bug. | The `before()` hook of every API-vs-chain suite logs (non-fatally) any on-chain markets missing from the API via `warnAboutChainOnlyMarkets`, so an indexing lag is visible in the test output instead of silently ignored. |
| Mint markets on L2s (Optimism, Arbitrum, etc.) | crvUSD mint markets only exist on Ethereum mainnet (`fetchMintMarkets*` both early-return for `chainId !== 1`) | N/A — nothing to test |
| LlamaLend v2 on networks other than Optimism | `one_way_factory_v2` alias is currently only configured for Optimism (see `src/constants/aliases.ts`) | N/A — nothing to test yet; extend the v2 suite once v2 launches elsewhere |

## 6. How many markets are actually checked

Every suite iterates the **full** market list returned by each fetch (`getMarketList()`), with no sampling/slicing. Counts are printed:
- per suite, right after fetching (`-> [label: API=N, on-chain=N]`);
- in the passing test's title (`... (N markets compared)`);
- in an aggregate summary block at the end of the run (`Markets checked summary`).

Example output (mainnet + Optimism, July 2026):

```
Markets checked summary:
  - mainnet lend v1: API=48, on-chain=48
  - mainnet mint markets: API=9, on-chain=9
  - optimism lend v1: API=5, on-chain=5
  - optimism lend v2: on-chain=3 (no API for this data set)
```
