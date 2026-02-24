# Migration Guide: Refactoring to Modular Structure

## Overview

Methods that were previously defined directly inside the `LendMarketTemplate` class have now been reorganized into separate modules to improve code structure, readability, and maintainability.

This guide is required for developers migrating from **version 1.X.X → 2.X.X**.

> ℹ️ **Important:**  
> Method signatures, arguments, return types, and internal logic were **not modified**.  
> This release only reorganizes methods into dedicated namespaces for modularization purposes.

## Module Structure

| Module                   | Responsibility                                         | Has Changes |
|--------------------------|--------------------------------------------------------|-------------|
| `market.prices`          | Prices and calculations                                | Yes ⚠️      |
| `market.amm`             | AMM swap operations                                    | Yes ⚠️      |
| `market.loan`            | Loan operations (create, borrow, repay, liquidate)    | Yes ⚠️      |
| `market.userPosition`    | User position information                              | Yes ⚠️      |
| `market.stats`           | Market statistics                                      | No          |
| `market.wallet`          | Wallet balances                                        | No          |
| `market.vault`           | Vault operations (deposit, withdraw, stake, rewards) | No          |
| `market.leverage`        | Leverage operations                                    | No          |
| `market.leverageZapV2`   | Advanced leverage (Zap V2) operations                  | No          |

---

## Legend — Change Types

| Icon | Meaning |
|------|---------|
| ⚠️ | Method changed namespace and requires refactoring |
| 🚨 | Method changed namespace **and** method name |
| 🆕 | New method (no migration required) |

## Stats Module (`market.stats`)

| Old method                      | New method                      | Has Changes |
|---------------------------------|---------------------------------|-------------|
| `market.stats.parameters()`     | `market.stats.parameters()`     | No          |
| `market.stats.rates()`          | `market.stats.rates()`          | No          |
| `market.stats.futureRates()`    | `market.stats.futureRates()`    | No          |
| `market.stats.balances()`       | `market.stats.balances()`       | No          |
| `market.stats.bandsInfo()`      | `market.stats.bandsInfo()`      | No          |
| `market.stats.bandBalances()`   | `market.stats.bandBalances()`   | No          |
| `market.stats.bandsBalances()`  | `market.stats.bandsBalances()`  | No          |
| `market.stats.totalDebt()`      | `market.stats.totalDebt()`      | No          |
| `market.stats.ammBalances()`    | `market.stats.ammBalances()`    | No          |
| `market.stats.capAndAvailable()`| `market.stats.capAndAvailable()`| No          |

---

## Wallet Module (`market.wallet`)

| Old Method                 | New Method                 | Has Changes |
|----------------------------|----------------------------|-------------|
| `market.wallet.balances()` | `market.wallet.balances()` | No          |

---

## Vault Module (`market.vault`)

### Deposit Operations

| Old Method                           | New Method                         | Has Changes |
|--------------------------------------|------------------------------------|-------------|
| `market.vault.maxDeposit()`          | `market.vault.maxDeposit()`        | No          |
| `market.vault.previewDeposit()`      | `market.vault.previewDeposit()`    | No          |
| `market.vault.depositIsApproved()`   | `market.vault.depositIsApproved()` | No        |
| `market.vault.depositApprove()`      | `market.vault.depositApprove()`    | No          |
| `market.vault.deposit()`             | `market.vault.deposit()`           | No          |
| `market.vault.estimateGas.deposit()` | `market.vault.estimateGas.deposit()`          | No          |
| `market.vault.estimateGas.depositApprove()` | `market.vault.estimateGas.depositApprove()`          | No          |

### Mint Operations

| Old Method                        | New Method                        | Has Changes |
|-----------------------------------|-----------------------------------|-------------|
| `market.vault.maxMint()`          | `market.vault.maxMint()`          | No          |
| `market.vault.previewMint()`      | `market.vault.previewMint()`      | No          |
| `market.vault.mintIsApproved()`   | `market.vault.mintIsApproved()`   | No          |
| `market.vault.mintApprove()`      | `market.vault.mintApprove()`      | No          |
| `market.vault.mint()`             | `market.vault.mint()`             | No          |
| `market.vault.estimateGas.mint()` | `market.vault.estimateGas.mint()` | No          |
| `market.vault.estimateGas.mintApprove()` | `market.vault.estimateGas.mintApprove()` | No          |

### Withdraw Operations

| Old Method                            | New Method                            | Has Changes |
|---------------------------------------|---------------------------------------|-------------|
| `market.vault.maxWithdraw()`          | `market.vault.maxWithdraw()`          | No          |
| `market.vault.previewWithdraw()`      | `market.vault.previewWithdraw()`      | No          |
| `market.vault.withdraw()`             | `market.vault.withdraw()`             | No          |
| `market.vault.estimateGas.withdraw()` | `market.vault.estimateGas.withdraw()` | No          |

### Redeem Operations

| Old Method                     | New Method                          | Has Changes |
|--------------------------------|-------------------------------------|-------------|
| `market.vault.maxRedeem()`     | `market.vault.maxRedeem()`          | No          |
| `market.vault.previewRedeem()` | `market.vault.previewRedeem()`      | No          |
| `market.vault.redeem()`        | `market.vault.redeem()`             | No          |
| `market.vault.estimateGas.redeem()`       | `market.vault.estimateGas.redeem()` | No          |

### Conversion & Utilities

| Old Method                          | New Method                          | Has Changes |
|-------------------------------------|-------------------------------------|-------------|
| `market.vault.convertToShares()`    | `market.vault.convertToShares()`    | No          |
| `market.vault.convertToAssets()`    | `market.vault.convertToAssets()`    | No          |
| `market.vault.totalLiquidity()`     | `market.vault.totalLiquidity()`     | No          |
| `market.vault.rewardsOnly()`        | `market.vault.rewardsOnly()`        | No          |

### Staking Operations

| Old Method                                | New Method                                | Has Changes |
|-------------------------------------------|-------------------------------------------|-------------|
| `market.vault.stakeIsApproved()`          | `market.vault.stakeIsApproved()`          | No          |
| `market.vault.stakeApprove()`             | `market.vault.stakeApprove()`             | No          |
| `market.vault.stake()`                    | `market.vault.stake()`                    | No          |
| `market.vault.unstake()`                  | `market.vault.unstake()`                  | No          |
| `market.vault.estimateGas.stakeApprove()` | `market.vault.estimateGas.stakeApprove()` | No          |
| `market.vault.estimateGas.stake()`        | `market.vault.estimateGas.stake()`        | No          |
| `market.vault.estimateGas.unstake()`      | `market.vault.estimateGas.unstake()`                 | No          |

### Rewards Operations

| Old Method                            | New Method                                | Has Changes |
|---------------------------------------|-------------------------------------------|-------------|
| `market.vault.crvApr()`               | `market.vault.crvApr()`                   | No          |
| `market.vault.claimableCrv()`         | `market.vault.claimableCrv()`             | No          |
| `market.vault.claimCrv()`             | `market.vault.claimCrv()`                 | No          |
| `market.vault.rewardTokens()`         | `market.vault.rewardTokens()`             | No          |
| `market.vault.rewardsApr()`           | `market.vault.rewardsApr()`               | No          |
| `market.vault.claimableRewards()`     | `market.vault.claimableRewards()`         | No          |
| `market.vault.claimRewards()`         | `market.vault.claimRewards()`             | No          |
| `market.vault.estimateGas.claimCrv()` | `market.vault.estimateGas.claimCrv()`     | No          |
| `market.vault.estimateGas.claimRewards()`        | `market.vault.estimateGas.claimRewards()` | No          |

---

## Prices Module (`market.prices`)

### Prices Module

| Old Method                  | New Method                        | Has Changes |
|----------------------------|-----------------------------------|-------------|
| `market.A()`               | `market.prices.A()`               | Yes ⚠️      |
| `market.basePrice()`       | `market.prices.basePrice()`       | Yes ⚠️      |
| `market.oraclePrice()`     | `market.prices.oraclePrice()`     | Yes ⚠️      |
| `market.oraclePriceBand()` | `market.prices.oraclePriceBand()` | Yes ⚠️      |
| `market.price()`           | `market.prices.price()`           | Yes ⚠️      |
| `market.calcTickPrice()`   | `market.prices.calcTickPrice()`   | Yes ⚠️      |
| `market.calcBandPrices()`  | `market.prices.calcBandPrices()`  | Yes ⚠️      |
| `market.calcRangePct()`    | `market.prices.calcRangePct()`    | Yes ⚠️      |
| `market._getPrices()`       | `market.prices.getPrices()`       | Yes 🚨      |
| `market._calcPrices()`      | `market.prices.calcPrices()`      | Yes 🚨      |
| `market._checkRange()`      | `market.prices.checkRange()`      | Yes 🚨      |

---

## AMM Module (`market.amm`)

| Old Method                         | New Method                             | Has Changes |
|------------------------------------|----------------------------------------|-------------|
| `market.maxSwappable()`            | `market.amm.maxSwappable()`            | Yes ⚠️      |
| `market.swapExpected()`            | `market.amm.swapExpected()`            | Yes ⚠️      |
| `market.swapRequired()`            | `market.amm.swapRequired()`            | Yes ⚠️      |
| `market.swapPriceImpact()`         | `market.amm.swapPriceImpact()`         | Yes ⚠️      |
| `market.swapIsApproved()`          | `market.amm.swapIsApproved()`          | Yes ⚠️      |
| `market.swapApprove()`             | `market.amm.swapApprove()`             | Yes ⚠️      |
| `market.swap()`                    | `market.amm.swap()`                    | Yes ⚠️      |
| `market.estimateGas.swapApprove()` | `market.amm.estimateGas.swapApprove()` | Yes ⚠️      |
| `market.estimateGas.swap()`        | `market.amm.estimateGas.swap()`        | Yes ⚠️      |
---

## Loan Module (`market.loan`)

### Create Loan

| Old Method                               | New Method                                    | Has Changes |
|------------------------------------------|-----------------------------------------------|-------------|
| `market.createLoanMaxRecv()`             | `market.loan.createLoanMaxRecv()`             | Yes ⚠️      |
| `market.createLoanMaxRecvAllRanges()`    | `market.loan.createLoanMaxRecvAllRanges()`    | Yes ⚠️   |
| `market.getMaxRange()`                   | `market.loan.getMaxRange()`                   | Yes ⚠️      |
| `market.createLoanBands()`               | `market.loan.createLoanBands()`               | Yes ⚠️      |
| `market.createLoanBandsAllRanges()`      | `market.loan.createLoanBandsAllRanges()`      | Yes ⚠️      |
| `market.createLoanPrices()`              | `market.loan.createLoanPrices()`              | Yes ⚠️      |
| `market.createLoanPricesAllRanges()`     | `market.loan.createLoanPricesAllRanges()`     | Yes ⚠️      |
| `market.createLoanHealth()`              | `market.loan.createLoanHealth()`              | Yes ⚠️      |
| `market.createLoanIsApproved()`          | `market.loan.createLoanIsApproved()`          | Yes ⚠️      |
| `market.createLoanApprove()`             | `market.loan.createLoanApprove()`             | Yes ⚠️      |
| `market.createLoan()`                    | `market.loan.createLoan()`                    | Yes ⚠️      |
| `market.estimateGas.createLoanApprove()` | `market.loan.estimateGas.createLoanApprove()` | Yes ⚠️      |
| `market.estimateGas.createLoan()`        | `market.loan.estimateGas.createLoan()`        | Yes ⚠️      |

### Borrow More

| Old Method                               | New Method                                    | Has Changes |
|------------------------------------------|-----------------------------------------------|-------------|
| `market.borrowMoreMaxRecv()`             | `market.loan.borrowMoreMaxRecv()`             | Yes ⚠️      |
| `market.borrowMoreBands()`               | `market.loan.borrowMoreBands()`               | Yes ⚠️      |
| `market.borrowMorePrices()`              | `market.loan.borrowMorePrices()`              | Yes ⚠️      |
| `market.borrowMoreHealth()`              | `market.loan.borrowMoreHealth()`              | Yes ⚠️      |
| `market.borrowMoreIsApproved()`          | `market.loan.borrowMoreIsApproved()`          | Yes ⚠️      |
| `market.borrowMoreApprove()`             | `market.loan.borrowMoreApprove()`             | Yes ⚠️      |
| `market.borrowMore()`                    | `market.loan.borrowMore()`                    | Yes ⚠️      |
| `market.borrowMoreFutureLeverage()`      | `market.loan.borrowMoreFutureLeverage()`      | NEED TO ADD |
| `market.estimateGas.borrowMoreApprove()` | `market.loan.estimateGas.borrowMoreApprove()` | Yes ⚠️      |
| `market.estimateGas.borrowMore()`        | `market.loan.estimateGas.borrowMore()`        | Yes ⚠️      |

### Add Collateral

| Old Method                                  | New Method                                       | Has Changes |
|---------------------------------------------|--------------------------------------------------|-------------|
| `market.addCollateralBands()`               | `market.loan.addCollateralBands()`               | Yes ⚠️      |
| `market.addCollateralPrices()`              | `market.loan.addCollateralPrices()`              | Yes ⚠️      |
| `market.addCollateralHealth()`              | `market.loan.addCollateralHealth()`              | Yes ⚠️      |
| `market.addCollateralIsApproved()`          | `market.loan.addCollateralIsApproved()`          | Yes ⚠️      |
| `market.addCollateralApprove()`             | `market.loan.addCollateralApprove()`             | Yes ⚠️      |
| `market.addCollateral()`                    | `market.loan.addCollateral()`                    | Yes ⚠️      |
| `market.addCollateralFutureLeverage()`      | `market.loan.addCollateralFutureLeverage()`      | Yes ⚠️      |
| `market.estimateGas.addCollateralApprove()` | `market.loan.estimateGas.addCollateralApprove()` | Yes ⚠️      |
| `market.estimateGas.addCollateral()`        | `market.loan.estimateGas.addCollateral()`        | Yes ⚠️      |

### Remove Collateral

| Old Method                                | New Method                                     | Has Changes |
|-------------------------------------------|------------------------------------------------|-------------|
| `market.maxRemovable()`                   | `market.loan.maxRemovable()`                   | Yes ⚠️      |
| `market.removeCollateralBands()`          | `market.loan.removeCollateralBands()`          | Yes ⚠️      |
| `market.removeCollateralPrices()`         | `market.loan.removeCollateralPrices()`         | Yes ⚠️      |
| `market.removeCollateralHealth()`         | `market.loan.removeCollateralHealth()`         | Yes ⚠️      |
| `market.removeCollateral()`               | `market.loan.removeCollateral()`               | Yes ⚠️      |
| `market.removeCollateralFutureLeverage()` | `market.loan.removeCollateralFutureLeverage()` | Yes ⚠️      |
| `market.estimateGas.removeCollateral()`   | `market.loan.estimateGas.removeCollateral()`   | Yes ⚠️      |

### Repay

| Old Method                          | New Method                        | Has Changes |
|-------------------------------------|-----------------------------------|-------------|
| `market.repayBands()`               | `market.loan.repayBands()`        | Yes ⚠️      |
| `market.repayPrices()`              | `market.loan.repayPrices()`       | Yes ⚠️      |
| `market.repayIsApproved()`          | `market.loan.repayIsApproved()`   | Yes ⚠️      |
| `market.repayApprove()`             | `market.loan.repayApprove()`      | Yes ⚠️      |
| `market.repayHealth()`              | `market.loan.repayHealth()`       | Yes ⚠️      |
| `market.repay()`                    | `market.loan.repay()`             | Yes ⚠️      |
| `market.estimateGas.repayApprove()` | `market.loan.estimateGas.repayApprove()`     | Yes ⚠️      |
| `market.estimateGas.repay()`        | `market.loan.estimateGas.repay()` | Yes ⚠️      |

### Full Repay

| Old Method                              | New Method                                   | Has Changes |
|-----------------------------------------|----------------------------------------------|-------------|
| `market.fullRepayIsApproved()`          | `market.loan.fullRepayIsApproved()`          | Yes ⚠️      |
| `market.fullRepayApprove()`             | `market.loan.fullRepayApprove()`             | Yes ⚠️      |
| `market.fullRepay()`                    | `market.loan.fullRepay()`                    | Yes ⚠️      |
| `market.estimateGas.fullRepayApprove()` | `market.loan.estimateGas.fullRepayApprove()` | Yes ⚠️      |
| `market.estimateGas.fullRepay()`        | `market.loan.estimateGas.fullRepay()`        | Yes ⚠️      |


### Liquidation

| Old Method                              | New Method                                   | Has Changes |
|-----------------------------------------|----------------------------------------------|-------------|
| `market.tokensToLiquidate()`            | `market.loan.tokensToLiquidate()`            | Yes ⚠️      |
| `market.liquidateIsApproved()`          | `market.loan.liquidateIsApproved()`          | Yes ⚠️      |
| `market.liquidateApprove()`             | `market.loan.liquidateApprove()`             | Yes ⚠️      |
| `market.liquidate()`                    | `market.loan.liquidate()`                    | Yes ⚠️      |
| `market.estimateGas.liquidateApprove()` | `market.loan.estimateGas.liquidateApprove()` | Yes ⚠️      |
| `market.estimateGas.liquidate()`        | `market.loan.estimateGas.liquidate()`        | Yes ⚠️      |

### Self Liquidation

| Old Method                                  | New Method                                       | Has Changes |
|---------------------------------------------|--------------------------------------------------|-------------|
| `market.selfLiquidateIsApproved()`          | `market.loan.selfLiquidateIsApproved()`          | Yes ⚠️      |
| `market.selfLiquidateApprove()`             | `market.loan.selfLiquidateApprove()`             | Yes ⚠️      |
| `market.selfLiquidate()`                    | `market.loan.selfLiquidate()`                    | Yes ⚠️      |
| `market.estimateGas.selfLiquidateApprove()` | `market.loan.estimateGas.selfLiquidateApprove()` | Yes ⚠️      |
| `market.estimateGas.selfLiquidate()`        | `market.loan.estimateGas.selfLiquidate()`        | Yes ⚠️      |

### Partial Self Liquidation

| Old Method                                         | New Method                                              | Has Changes |
|----------------------------------------------------|---------------------------------------------------------|-------------|
| `market.calcPartialFrac()`                         | `market.loan.calcPartialFrac()`                         | Yes ⚠️      |
| `market.partialSelfLiquidateIsApproved()`          | `market.loan.partialSelfLiquidateIsApproved()`          | Yes ⚠️      |
| `market.partialSelfLiquidateApprove()`             | `market.loan.partialSelfLiquidateApprove()`             | Yes ⚠️      |
| `market.partialSelfLiquidate()`                    | `market.loan.partialSelfLiquidate()`                    | Yes ⚠️      |
| `market.estimateGas.partialSelfLiquidateApprove()` | `market.loan.estimateGas.partialSelfLiquidateApprove()` | Yes ⚠️      |
| `market.estimateGas.partialSelfLiquidate()`        | `market.loan.estimateGas.partialSelfLiquidate()`        | Yes ⚠️      |

---

## User Position Module (`market.userPosition`)

| Old Method                         | New Method                                  | Has Changes |
|------------------------------------|----------------------------------------------|-------------|
| `market.userLoanExists()`          | `market.userPosition.userLoanExists()`       | Yes ⚠️      |
| `market.userState()`               | `market.userPosition.userState()`            | Yes ⚠️      |
| —                                  | `market.userPosition.userStateBigInt()`      | Yes 🆕      |
| `market.userHealth()`              | `market.userPosition.userHealth()`           | Yes ⚠️      |
| `market.userBands()`               | `market.userPosition.userBands()`            | Yes ⚠️      |
| —                                  | `market.userPosition.userBandsBigInt()`      | Yes 🆕      |
| `market.userRange()`               | `market.userPosition.userRange()`            | Yes ⚠️      |
| `market.userPrices()`              | `market.userPosition.userPrices()`           | Yes ⚠️      |
| `market.userLoss()`                | `market.userPosition.userLoss()`             | Yes ⚠️      |
| `market.userBandsBalances()`       | `market.userPosition.userBandsBalances()`    | Yes ⚠️      |
| `market.currentLeverage()`         | `market.userPosition.currentLeverage()`      | Yes ⚠️      |
| `market.currentPnL()`              | `market.userPosition.currentPnL()`           | Yes ⚠️      |
| `market.userBoost()`               | `market.userPosition.userBoost()`            | Yes ⚠️      |
| `market.forceUpdateUserState()`    | `market.userPosition.forceUpdateUserState()` | Yes ⚠️      |

## Leverage Module (`market.leverage`)

The `leverage` and `leverageZapV2` methods remain unchanged.

No refactoring was applied to leverage-related logic.  
There were no namespace changes, signature changes, or internal modifications.

All leverage functionality continues to work exactly as before and does not require any migration updates.