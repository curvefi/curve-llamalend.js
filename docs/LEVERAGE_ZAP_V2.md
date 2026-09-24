# Leverage zap v2 — new approval step

There is **one new step** in the leverage flow: a controller approval.
Everything else (createLoan, borrowMore, repay, all expected/bands/prices/metrics,
and the ERC20 `*Approve` methods) stays exactly the same.

## New methods

```ts
market.leverageZapV2.isControllerApproved(address?): Promise<boolean>   // read
market.leverageZapV2.setControllerApproval(): Promise<string[]>         // write
market.leverageZapV2.estimateGas.setControllerApproval(): Promise<TGas>
```

## How to use

Add this once before the leverage action. It persists, so it only ever runs one time per user.

```ts
// NEW: controller approval
if (!await market.leverageZapV2.isControllerApproved()) {
    await market.leverageZapV2.setControllerApproval();
}

// SAME AS BEFORE
if (!await market.leverageZapV2.createLoanIsApproved({ userCollateral })) {
    await market.leverageZapV2.createLoanApprove({ userCollateral, isMax });
}
await market.leverageZapV2.createLoan({ userCollateral, debt, range, minRecv, router, calldata });
```

## Works on every market

Use the same code everywhere. On markets that don't need it the methods are no-ops:

```ts
await market.leverageZapV2.isControllerApproved()   // => true   (nothing to do)
await market.leverageZapV2.setControllerApproval()  // => []     (no tx)
```

So: always call `setControllerApproval()` when `isControllerApproved()` is `false`.
That's the only change.
