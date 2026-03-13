# Integration & Support Recommendations for lendMarket v2

---

## Fetching Lend Markets (v2 Update)

### Fetching Markets

Previously, lend markets were fetched using:

```ts
await llamalend.lendMarkets.fetchMarkets()
```

Starting from v2, the method accepts a named parameters object. The market version must be explicitly specified:

```ts
// Fetch legacy (v1) markets
await llamalend.lendMarkets.fetchMarkets({ useApi: false, version: 'v1' })

// Fetch new (v2) markets
await llamalend.lendMarkets.fetchMarkets({ useApi: false, version: 'v2' })
```

At the moment there is no backend implementation for v2. All methods operate fully on-chain. Therefore, `useApi` must temporarily be set to `false`. API mode should not be enabled until backend support is introduced.

---

### Backward Compatibility

```ts
await llamalend.lendMarkets.fetchMarkets()
```

Currently behaves the same as:

```ts
await llamalend.lendMarkets.fetchMarkets({ useApi: true, version: 'v1' })
```

However, it is strongly recommended to explicitly specify the market version (`'v1'` or `'v2'`) to avoid ambiguity and future issues.

For new integrations targeting v2 markets, use:

```ts
await llamalend.lendMarkets.fetchMarkets({ useApi: false, version: 'v2' })
```

---

### Market IDs

The list of all available market IDs can be obtained via:

```ts
llamalend.lendMarkets.getMarketList()
```

---

### Getting Market Instance

Getting a market instance works the same as before:

```ts
llamalend.getLendMarket(marketId)
```

Key change: the market instance now includes a `version` property:

```ts
market.version // 'v1' | 'v2'
```

This allows frontend applications to explicitly determine which market version they are interacting with.

## v2 Integration Recommendations

### ✅ Backward Compatibility

The majority of methods and metrics remain unchanged in v2.  
For frontend integration, **no significant changes are required**.

All tables below include every method exposed by `lendMarket`.  
In most cases, the following aspects remain identical:

- Business logic (from an external perspective)
- Input parameters
- Return values / return types

This means existing frontend integrations should continue working without modification.

---

### ⚙️ Internal Changes (Handled by the Library)

Some methods have internal changes in v2:

- Updated calculation formulas
- Modified contract calls
- Adjusted internal method parameters
- Refactored modular structure

**Important:**  
These changes are fully encapsulated within the library.

From the frontend perspective:

- Method signatures are unchanged
- Returned data structure is unchanged
- Behavioral expectations remain consistent

There is **no need** for frontend developers to adjust logic based on internal refactoring.

---

### 🚧 Temporary Limitations

- Leverage functionality is temporarily unavailable in v2.
- Upcoming updates will introduce adjustments related to `repay` methods due to the new `shrink` mechanism.
- Full leverage support will be restored in future releases.

# Methods supporting matrix

---
This document tracks feature support across market versions.

- ✅ Supported
- ❌ Not supported

## Stats Module (`market.stats`)

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| parameters() | ✅ | ✅ | ✅ | ✅ | ✅ |
| rates() | ✅ | ✅ | ✅ | ✅ | ✅ |
| futureRates() | ✅ | ✅ | ✅ | ✅ | ✅ |
| balances() | ✅ | ✅ | ✅ | ✅ | ✅ |
| bandsInfo() | ✅ | ✅ | ✅ | ✅ | ✅ |
| bandBalances() | ✅ | ✅ | ✅ | ✅ | ✅ |
| bandsBalances() | ✅ | ✅ | ✅ | ✅ | ✅ |
| totalDebt() | ✅ | ✅ | ✅ | ✅ | ✅ |
| ammBalances() | ✅ | ✅ | ✅ | ✅ | ✅ |
| capAndAvailable() | ✅ | ✅ | ❌ | ✅ | ❌ |

### Update for `capAndAvailable` method

Previously the `capAndAvailable` method returned:

```ts
{
  cap: string
  available: string
}
```

Now it returns:

```ts
{
  totalAssets: string
  borrowCap: string
  available: string
  availableForBorrow: string
}
```

#### Important clarification

Previously the value called **`cap`** was incorrectly named.

On the frontend, the value that we now return as **`totalAssets`** corresponds to what was previously treated as **`cap`**.

#### Summary

- `totalAssets` → total assets deposited in the vault (what was previously used as `cap` on the frontend)
- `borrowCap` → maximum total debt allowed by the controller (LLv2 only; `Infinity` for LLv1)
- `available` → balance of borrowed token available in the controller
- `availableForBorrow` → effective amount available to borrow: `min(available, borrowCap - totalDebt)`


## Stats Module (`market.stats`) new methods
| Method | v1 | v2 | Same logic | Same params | Same type |
|--------|----|----|-----------------|----------------------|-----------------------|
| adminPercentage() | ✅ | ✅ | ✅ | ✅ | ✅ |


---

## Wallet Module (`market.wallet`)

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| balances() | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Vault Module (`market.vault`)

---

### Deposit Operations

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| maxDeposit() | ✅ | ✅ | ✅ | ✅ | ✅ |
| previewDeposit() | ✅ | ✅ | ✅ | ✅ | ✅ |
| depositIsApproved() | ✅ | ✅ | ✅ | ✅ | ✅ |
| depositApprove() | ✅ | ✅ | ✅ | ✅ | ✅ |
| deposit() | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### Mint Operations

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| maxMint() | ✅ | ✅ | ✅ | ✅ | ✅ |
| previewMint() | ✅ | ✅ | ✅ | ✅ | ✅ |
| mintIsApproved() | ✅ | ✅ | ✅ | ✅ | ✅ |
| mintApprove() | ✅ | ✅ | ✅ | ✅ | ✅ |
| mint() | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### Withdraw Operations

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| maxWithdraw() | ✅ | ✅ | ✅ | ✅ | ✅ |
| previewWithdraw() | ✅ | ✅ | ✅ | ✅ | ✅ |
| withdraw() | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### Redeem Operations

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| maxRedeem() | ✅ | ✅ | ✅ | ✅ | ✅ |
| previewRedeem() | ✅ | ✅ | ✅ | ✅ | ✅ |
| redeem() | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### Conversion & Utilities

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| convertToShares() | ✅ | ✅ | ✅ | ✅ | ✅ |
| convertToAssets() | ✅ | ✅ | ✅ | ✅ | ✅ |
| totalLiquidity() | ✅ | ✅ | ✅ | ✅ | ✅ |
| rewardsOnly() | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### Staking Operations

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| stakeIsApproved() | ✅ | ✅ | ✅ | ✅ | ✅ |
| stakeApprove() | ✅ | ✅ | ✅ | ✅ | ✅ |
| stake() | ✅ | ✅ | ✅ | ✅ | ✅ |
| unstake() | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### Rewards Operations

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| crvApr() | ✅ | ✅ | ✅ | ✅ | ✅ |
| claimableCrv() | ✅ | ✅ | ✅ | ✅ | ✅ |
| claimCrv() | ✅ | ✅ | ✅ | ✅ | ✅ |
| rewardTokens() | ✅ | ✅ | ✅ | ✅ | ✅ |
| rewardsApr() | ✅ | ✅ | ✅ | ✅ | ✅ |
| claimableRewards() | ✅ | ✅ | ✅ | ✅ | ✅ |
| claimRewards() | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Prices Module (`market.prices`)

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| A() | ✅ | ✅ | ✅ | ✅ | ✅ |
| basePrice() | ✅ | ✅ | ✅ | ✅ | ✅ |
| oraclePrice() | ✅ | ✅ | ✅ | ✅ | ✅ |
| oraclePriceBand() | ✅ | ✅ | ✅ | ✅ | ✅ |
| price() | ✅ | ✅ | ✅ | ✅ | ✅ |
| calcTickPrice() | ✅ | ✅ | ✅ | ✅ | ✅ |
| calcBandPrices() | ✅ | ✅ | ✅ | ✅ | ✅ |
| calcRangePct() | ✅ | ✅ | ✅ | ✅ | ✅ |
| getPrices() | ✅ | ✅ | ✅ | ✅ | ✅ |
| calcPrices() | ✅ | ✅ | ✅ | ✅ | ✅ |
| checkRange() | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## AMM Module (`market.amm`)

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| maxSwappable() | ✅ | ✅ | ✅ | ✅ | ✅ |
| swapExpected() | ✅ | ✅ | ✅ | ✅ | ✅ |
| swapRequired() | ✅ | ✅ | ✅ | ✅ | ✅ |
| swapPriceImpact() | ✅ | ✅ | ✅ | ✅ | ✅ |
| swapIsApproved() | ✅ | ✅ | ✅ | ✅ | ✅ |
| swapApprove() | ✅ | ✅ | ✅ | ✅ | ✅ |
| swap() | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Loan Module (`market.loan`)

### Create Loan

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| createLoanMaxRecv() | ✅ | ✅ | ✅ | ✅ | ✅ |
| createLoanMaxRecvAllRanges() | ✅ | ✅ | ✅ | ✅ | ✅ |
| getMaxRange() | ✅ | ✅ | ✅ | ✅ | ✅ |
| createLoanBands() | ✅ | ✅ | ✅ | ✅ | ✅ |
| createLoanBandsAllRanges() | ✅ | ✅ | ✅ | ✅ | ✅ |
| createLoanPrices() | ✅ | ✅ | ✅ | ✅ | ✅ |
| createLoanPricesAllRanges() | ✅ | ✅ | ✅ | ✅ | ✅ |
| createLoanHealth() | ✅ | ✅ | ✅ | ✅ | ✅ |
| createLoanIsApproved() | ✅ | ✅ | ✅ | ✅ | ✅ |
| createLoanApprove() | ✅ | ✅ | ✅ | ✅ | ✅ |
| createLoan() | ✅ | ✅ | ✅ | ✅ | ✅ | 

### Borrow More

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| borrowMoreMaxRecv() | ✅ | ✅ | ✅ | ✅ | ✅ |
| borrowMoreBands() | ✅ | ✅ | ✅ | ✅ | ✅ |
| borrowMorePrices() | ✅ | ✅ | ✅ | ✅ | ✅ |
| borrowMoreHealth() | ✅ | ✅ | ✅ | ✅ | ✅ |
| borrowMoreIsApproved() | ✅ | ✅ | ✅ | ✅ | ✅ |
| borrowMoreApprove() | ✅ | ✅ | ✅ | ✅ | ✅ |
| borrowMore() | ✅ | ✅ | ✅ | ✅ | ✅ |
| borrowMoreFutureLeverage() | ✅ | ✅ | ✅ | ✅ | ✅ |

### Add Collateral

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| addCollateralBands() | ✅ | ✅ | ✅ | ✅ | ✅ |
| addCollateralPrices() | ✅ | ✅ | ✅ | ✅ | ✅ |
| addCollateralHealth() | ✅ | ✅ | ✅ | ✅ | ✅ |
| addCollateralIsApproved() | ✅ | ✅ | ✅ | ✅ | ✅ |
| addCollateralApprove() | ✅ | ✅ | ✅ | ✅ | ✅ |
| addCollateral() | ✅ | ✅ | ✅ | ✅ | ✅ |
| addCollateralFutureLeverage() | ✅ | ✅ | ✅ | ✅ | ✅ |

### Remove Collateral

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| maxRemovable() | ✅ | ✅ | ✅ | ✅ | ✅ |
| removeCollateralBands() | ✅ | ✅ | ✅ | ✅ | ✅ |
| removeCollateralPrices() | ✅ | ✅ | ✅ | ✅ | ✅ |
| removeCollateralHealth() | ✅ | ✅ | ✅ | ✅ | ✅ |
| removeCollateral() | ✅ | ✅ | ✅ | ✅ | ✅ |
| removeCollateralFutureLeverage() | ✅ | ✅ | ✅ | ✅ | ✅ |

### Repay (Partial)

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| repayBands() | ✅ | ✅ | ✅ | ✅ | ✅ |
| repayPrices() | ✅ | ✅ | ✅ | ✅ | ✅ |
| repayIsApproved() | ✅ | ✅ | ✅ | ✅ | ✅ |
| repayApprove() | ✅ | ✅ | ✅ | ✅ | ✅ |
| repayHealth() | ✅ | ✅ | ✅ | ✅ | ✅ |
| repay() | ✅ | ✅ | ❌ | ❌ | ❌ |
| repayFutureLeverage() | ✅ | ✅ | ✅ | ✅ | ✅ |

### Repay (Full)

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| fullRepayIsApproved() | ✅ | ✅ | ✅ | ✅ | ✅ |
| fullRepayApprove() | ✅ | ✅ | ✅ | ✅ | ✅ |
| fullRepay() | ✅ | ✅ | ✅ | ✅ | ✅ |

### Liquidation (Other User)

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| tokensToLiquidate() | ✅ | ✅ | ✅ | ✅ | ✅ |
| liquidateIsApproved() | ✅ | ✅ | ✅ | ✅ | ✅ |
| liquidateApprove() | ✅ | ✅ | ✅ | ✅ | ✅ |
| liquidate() | ✅ | ✅ | ✅ | ✅ | ✅ |

### Self Liquidation (Full)

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| selfLiquidateIsApproved() | ✅ | ✅ | ✅ | ✅ | ✅ |
| selfLiquidateApprove() | ✅ | ✅ | ✅ | ✅ | ✅ |
| selfLiquidate() | ✅ | ✅ | ✅ | ✅ | ✅ |

### Self Liquidation (Partial)

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| calcPartialFrac() | ✅ | ✅ | ✅ | ✅ | ✅ |
| partialSelfLiquidateIsApproved() | ✅ | ✅ | ✅ | ✅ | ✅ |
| partialSelfLiquidateApprove() | ✅ | ✅ | ✅ | ✅ | ✅ |
| partialSelfLiquidate() | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## User Position Module (`market.userPosition`)

| Method | v1 | v2 | Logic Unchanged | Parameters Unchanged | Return Type Unchanged |
|--------|----|----|-----------------|----------------------|-----------------------|
| userLoanExists() | ✅ | ✅ | ✅ | ✅ | ✅ |
| userState() | ✅ | ✅ | ✅ | ✅ | ✅ |
| userStateBigInt() | ✅ | ✅ | ✅ | ✅ | ✅ |
| userHealth() | ✅ | ✅ | ✅ | ✅ | ✅ |
| userBands() | ✅ | ✅ | ✅ | ✅ | ✅ |
| userBandsBigInt() | ✅ | ✅ | ✅ | ✅ | ✅ |
| userRange() | ✅ | ✅ | ✅ | ✅ | ✅ |
| userPrices() | ✅ | ✅ | ✅ | ✅ | ✅ |
| userLoss() | ✅ | ✅ | ✅ | ✅ | ✅ |
| userBandsBalances() | ✅ | ✅ | ✅ | ✅ | ✅ |
| currentLeverage() | ✅ | ✅ | ✅ | ✅ | ✅ |
| currentPnL() | ✅ | ✅ | ✅ | ✅ | ✅ |
| userBoost() | ✅ | ✅ | ✅ | ✅ | ✅ |
| forceUpdateUserState() | ✅ | ✅ | ✅ | ✅ | ✅ |
| getCurrentLeverageParams() | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Leverage Module (`market.leverage`)

| Method | v1 | v2 |
|--------|----|----|
| leverage() | ✅ | ❌ |
| leverageZapV2() | ✅ | ❌ |

> ⚠️ **Temporary Status**
>
> Leverage functionality is temporarily unavailable in v2.
>
> It is expected that upcoming changes will primarily affect `repay`-related methods due to the introduction of the `shrink` mechanism.
>
> Full leverage support will be restored in upcoming versions.