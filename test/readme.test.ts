import lending from "../src/index.js";

const generalMethodsTest = async () => {
    await lending.init('JsonRpc', {});  // Polygon network
    await lending.oneWayfactory.fetchMarkets();

    const balances1 = await lending.getBalances(['sdt', 'weth']);
    // OR const balances1 = await lending.getBalances(['0x361a5a4993493ce00f61c32d4ecca5512b82ce90', '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619']);
    console.log(balances1);

    // You can specify address
    const balances2 = await lending.getBalances(['sdt', 'weth'], "0x0063046686E46Dc6F15918b61AE2B121458534a5");
    // OR const balances2 = await lending.getBalances(['0x361a5a4993493ce00f61c32d4ecca5512b82ce90', '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'], '0x0063046686E46Dc6F15918b61AE2B121458534a5');
    console.log(balances2);

    const spender = "0x136e783846ef68C8Bd00a3369F787dF8d683a696"

    console.log(await lending.getAllowance(['sdt', 'weth'], lending.signerAddress, spender));
    console.log(await lending.hasAllowance(['sdt', 'weth'], ['1000', '1000'], lending.signerAddress, spender));
    console.log(await lending.ensureAllowance(['sdt', 'weth'], ['1000', '1000'], spender));

    console.log(await lending.getUsdRate('0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'));
}

const oneWayMarketFieldsTest = async () => {
    await lending.init('JsonRpc', {});
    await lending.oneWayfactory.fetchMarkets();

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');

    console.log(oneWayMarket.id);
    console.log(oneWayMarket.name);
    console.log(oneWayMarket.addresses);
    console.log(oneWayMarket.borrowed_token);
    console.log(oneWayMarket.collateral_token);
    console.log(oneWayMarket.coinAddresses);
    console.log(oneWayMarket.coinDecimals);
    console.log(oneWayMarket.defaultBands);
    console.log(oneWayMarket.minBands);
    console.log(oneWayMarket.maxBands);
}

const walletBalancesTest = async () => {
    await lending.init('JsonRpc', {});
    await lending.oneWayfactory.fetchMarkets();

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');

    // 1. Current address (signer) balances
    console.log(await oneWayMarket.wallet.balances());

    // 2. You can specify the address
    console.log(await oneWayMarket.wallet.balances("0x0063046686E46Dc6F15918b61AE2B121458534a5"));
}

const statsTest = async () => {
    await lending.init('JsonRpc', {});
    await lending.oneWayfactory.fetchMarkets();

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');

    console.log(await oneWayMarket.stats.parameters());
    console.log(await oneWayMarket.stats.rates());
    console.log(await oneWayMarket.stats.futureRates(10000, 0));
    console.log(await oneWayMarket.stats.futureRates(0, 10000));
    console.log(await oneWayMarket.stats.balances());
    const { activeBand, maxBand, minBand, liquidationBand } = await oneWayMarket.stats.bandsInfo();
    console.log({ activeBand, maxBand, minBand, liquidationBand });
    console.log(await oneWayMarket.stats.bandBalances(liquidationBand ?? 0));
    console.log(await oneWayMarket.stats.bandsBalances());
    console.log(await oneWayMarket.stats.totalDebt());
    console.log(await oneWayMarket.stats.ammBalances());
    console.log(await oneWayMarket.stats.capAndAvailable());
}

const vaultTest = async () => {
    await lending.init('JsonRpc', {});
    await lending.oneWayfactory.fetchMarkets();

    const oneWayMarket = lending.getOneWayMarket('one-way-market-1');

    console.log(await oneWayMarket.wallet.balances());

    // ------------ DEPOSIT ------------

    console.log(await oneWayMarket.vault.maxDeposit());
    console.log(await oneWayMarket.vault.previewDeposit(20000));  // Shares to receive
    console.log(await oneWayMarket.vault.depositIsApproved(20000));
    console.log(await oneWayMarket.vault.depositApprove(20000));
    console.log(await oneWayMarket.vault.deposit(20000));

    console.log(await oneWayMarket.wallet.balances());

    // ------------ MINT ------------

    console.log(await oneWayMarket.vault.maxMint());
    console.log(await oneWayMarket.vault.previewMint(20000));  // Assets to send
    console.log(await oneWayMarket.vault.mintIsApproved(20000));
    console.log(await oneWayMarket.vault.mintApprove(20000));
    console.log(await oneWayMarket.vault.mint(20000));

    let balances = await oneWayMarket.wallet.balances();
    console.log(balances);

    // ------------ UTILS ------------

    console.log(await oneWayMarket.vault.convertToAssets(100000));
    console.log(await oneWayMarket.vault.convertToShares(100));

    // ------------ STAKE ------------

    console.log(await oneWayMarket.vault.stakeIsApproved(balances.vaultShares));
    console.log(await oneWayMarket.vault.stakeApprove(balances.vaultShares));
    console.log(await oneWayMarket.vault.stake(balances.vaultShares));
    balances = await oneWayMarket.wallet.balances();
    console.log(balances);

    // ------------ UNSTAKE ------------

    console.log(await oneWayMarket.vault.unstake(balances.gauge));

    console.log(await oneWayMarket.wallet.balances());

    // ------------ WITHDRAW ------------

    console.log(await oneWayMarket.vault.maxWithdraw());
    console.log(await oneWayMarket.vault.previewWithdraw(10000));  // Shares to send
    console.log(await oneWayMarket.vault.withdraw(10000));

    console.log(await oneWayMarket.wallet.balances());

    console.log(await oneWayMarket.vault.maxRedeem());
    console.log(await oneWayMarket.vault.previewRedeem(10000));  // Assets to receive
    console.log(await oneWayMarket.vault.redeem(10000));

    console.log(await oneWayMarket.wallet.balances());


    // ------------ REWARDS ------------

    console.log(oneWayMarket.vault.rewardsOnly());
    console.log(await oneWayMarket.vault.totalLiquidity());
    console.log(await oneWayMarket.vault.crvApr());
    console.log(await oneWayMarket.vault.rewardTokens());
    console.log(await oneWayMarket.vault.rewardsApr());
    console.log(await oneWayMarket.vault.claimableCrv());
    console.log(await oneWayMarket.vault.claimCrv());
    console.log(await oneWayMarket.vault.claimableRewards());
    console.log(await oneWayMarket.vault.claimRewards());

}

const generalTest = async () => {
    await lending.init('JsonRpc', {});
    await lending.oneWayfactory.fetchMarkets();

    console.log(lending.oneWayfactory.getMarketList());

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');


    console.log("\n--- CREATE LOAN ---\n");

    console.log(await oneWayMarket.oraclePrice());
    console.log(await oneWayMarket.price());
    console.log(await oneWayMarket.basePrice());
    console.log(await oneWayMarket.wallet.balances());
    console.log(await oneWayMarket.createLoanMaxRecv(1, 5));
    console.log(await oneWayMarket.createLoanBands(1, 1000, 5));
    console.log(await oneWayMarket.createLoanPrices(1, 1000, 5));
    console.log(await oneWayMarket.createLoanHealth(1, 1000, 5));  // FULL
    console.log(await oneWayMarket.createLoanHealth(1, 1000, 5, false));  // NOT FULL

    console.log(await oneWayMarket.createLoanIsApproved(1));
    // false
    console.log(await oneWayMarket.createLoanApprove(1));
    // [
    //     '0xc111e471715ae6f5437e12d3b94868a5b6542cd7304efca18b5782d315760ae5'
    // ]
    console.log(await oneWayMarket.createLoan(1, 1000, 5));

    console.log(await oneWayMarket.userLoanExists());
    console.log(await oneWayMarket.userState());
    console.log(await oneWayMarket.userHealth());  // FULL
    console.log(await oneWayMarket.userHealth(false));  // NOT FULL
    console.log(await oneWayMarket.userRange());
    console.log(await oneWayMarket.userBands());
    console.log(await oneWayMarket.userPrices());
    console.log(await oneWayMarket.userBandsBalances());

    console.log("\n--- BORROW MORE ---\n");

    console.log(await oneWayMarket.borrowMoreMaxRecv(0.5));
    console.log(await oneWayMarket.borrowMoreBands(0.5, 500));
    console.log(await oneWayMarket.borrowMorePrices(0.5, 500));
    console.log(await oneWayMarket.borrowMoreHealth(0.5, 500));  // FULL
    console.log(await oneWayMarket.borrowMoreHealth(0.5, 500, false));  // NOT FULL

    console.log(await oneWayMarket.borrowMoreIsApproved(0.5));
    console.log(await oneWayMarket.borrowMoreApprove(0.5));

    console.log(await oneWayMarket.borrowMore(0.5, 500));

    console.log(await oneWayMarket.userState());
    console.log(await oneWayMarket.userHealth());  // FULL
    console.log(await oneWayMarket.userHealth(false));  // NOT FULL
    console.log(await oneWayMarket.userBands());
    console.log(await oneWayMarket.userPrices());

    console.log("\n--- ADD COLLATERAL ---\n");

    console.log(await oneWayMarket.addCollateralBands(0.2));
    console.log(await oneWayMarket.addCollateralPrices(0.2));
    console.log(await oneWayMarket.addCollateralHealth(0.2));  // FULL
    console.log(await oneWayMarket.addCollateralHealth(0.2, false));  // NOT FULL

    console.log(await oneWayMarket.addCollateralIsApproved(0.2));
    console.log(await oneWayMarket.addCollateralApprove(0.2));

    console.log(await oneWayMarket.addCollateral(0.2));  // OR await oneWayMarket.addCollateral(0.2, forAddress);

    console.log(await oneWayMarket.userState());
    console.log(await oneWayMarket.userHealth());  // FULL
    console.log(await oneWayMarket.userHealth(false));  // NOT FULL
    console.log(await oneWayMarket.userBands());
    console.log(await oneWayMarket.userPrices());

    console.log("\n--- REMOVE COLLATERAL ---\n")

    console.log(await oneWayMarket.maxRemovable());
    console.log(await oneWayMarket.removeCollateralBands(0.1));
    console.log(await oneWayMarket.removeCollateralPrices(0.1));
    console.log(await oneWayMarket.removeCollateralHealth(0.1));  // FULL
    console.log(await oneWayMarket.removeCollateralHealth(0.1, false));  // NOT FULL

    console.log(await oneWayMarket.removeCollateral(0.1));

    console.log(await oneWayMarket.userState());
    console.log(await oneWayMarket.userHealth());  // FULL
    console.log(await oneWayMarket.userHealth(false));  // NOT FULL
    console.log(await oneWayMarket.userBands());
    console.log(await oneWayMarket.userPrices());

    console.log("\n--- REPAY ---\n");

    console.log(await oneWayMarket.wallet.balances());

    console.log(await oneWayMarket.repayBands(1000));
    console.log(await oneWayMarket.repayPrices(1000));
    console.log(await oneWayMarket.repayHealth(1000));  // FULL
    console.log(await oneWayMarket.repayHealth(1000, false));  // NOT FULL

    console.log(await oneWayMarket.repayIsApproved(1000));
    console.log(await oneWayMarket.repayApprove(1000));

    console.log(await oneWayMarket.repay(1000));

    console.log(await oneWayMarket.userLoanExists());
    console.log(await oneWayMarket.userState());
    console.log(await oneWayMarket.userHealth());  // FULL
    console.log(await oneWayMarket.userHealth(false));  // NOT FULL
    console.log(await oneWayMarket.userBands());
    console.log(await oneWayMarket.userPrices());

    console.log("\n--- FULL REPAY ---\n");

    console.log(await oneWayMarket.fullRepayIsApproved());
    console.log(await oneWayMarket.fullRepayApprove());

    console.log(await oneWayMarket.fullRepay());

    console.log(await oneWayMarket.userLoanExists());
    console.log(await oneWayMarket.userState());

    console.log(await oneWayMarket.userLoss());
    console.log(await oneWayMarket.currentLeverage());
    console.log(await oneWayMarket.currentPnL());
}

const createLoanAllRangesTest = async () => {
    await lending.init('JsonRpc', {});
    await lending.oneWayfactory.fetchMarkets();

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');

    console.log(await oneWayMarket.createLoanMaxRecvAllRanges(1));
    console.log(await oneWayMarket.createLoanBandsAllRanges(1, 1600));
    console.log(await oneWayMarket.createLoanPricesAllRanges(1, 1600));
}

const swapTest = async () => {
    await lending.init('JsonRpc', {});
    await lending.oneWayfactory.fetchMarkets();

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');

    // Load liquidity
    await oneWayMarket.vault.deposit(10000);
    const maxDebt = await oneWayMarket.createLoanMaxRecv(0.3, 10);
    await oneWayMarket.createLoan(0.3, maxDebt, 10)

    console.log(await oneWayMarket.wallet.balances());

    console.log(await oneWayMarket.maxSwappable(0, 1));
    console.log(await oneWayMarket.swapExpected(0, 1, 100));
    console.log(await oneWayMarket.swapRequired(0, 1, 0.1));
    console.log(await oneWayMarket.swapPriceImpact(0, 1, 100));
    console.log(await oneWayMarket.swapIsApproved(0, 100));
    console.log(await oneWayMarket.swapApprove(0, 100));
    console.log(await oneWayMarket.swap(0, 1, 100, 0.1));

    console.log(await oneWayMarket.wallet.balances());
}

const selfLiquidationTest = async () => {
    await lending.init('JsonRpc', {});
    await lending.oneWayfactory.fetchMarkets();

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');

    // Load liquidity
    await oneWayMarket.vault.deposit(10000);
    const maxDebt = await oneWayMarket.createLoanMaxRecv(0.3, 10);
    await oneWayMarket.createLoan(0.3, maxDebt, 10);
    await oneWayMarket.swap(0, 1, Number(maxDebt) * 10, 0.05);

    console.log(await oneWayMarket.wallet.balances());
    console.log(await oneWayMarket.userState());

    console.log(await oneWayMarket.tokensToLiquidate());
    console.log(await oneWayMarket.selfLiquidateIsApproved());
    console.log(await oneWayMarket.selfLiquidateApprove());
    console.log(await oneWayMarket.selfLiquidate(0.1));

    console.log(await oneWayMarket.wallet.balances());
    console.log(await oneWayMarket.userState());
}

const leverageTest = async () => {
    await lending.init('JsonRpc', {}, {});
    await lending.oneWayfactory.fetchMarkets();

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');
    console.log(oneWayMarket.collateral_token, oneWayMarket.borrowed_token);
    console.log(await oneWayMarket.wallet.balances());

    if (Number(await oneWayMarket.vault.totalLiquidity()) === 0) {
        const maxDeposit = Number(await oneWayMarket.vault.maxDeposit()) * 0.7;
        await oneWayMarket.vault.deposit(maxDeposit);
    }

    console.log("\n- Create Loan -\n")

    let userCollateral = 1;
    let userBorrowed = 1000;
    let debt = 2000;
    const range = 10;
    const slippage = 0.5; // %
    console.log(await oneWayMarket.leverage.maxLeverage(range));
    console.log(await oneWayMarket.leverage.createLoanMaxRecv(userCollateral, userBorrowed, range));
    console.log(await oneWayMarket.leverage.createLoanExpectedCollateral(userCollateral, userBorrowed, debt, slippage));
    console.log(await oneWayMarket.leverage.createLoanPriceImpact(userBorrowed, debt));
    console.log(await oneWayMarket.leverage.createLoanMaxRange(userCollateral, userBorrowed, debt));
    console.log(await oneWayMarket.leverage.createLoanBands(userCollateral, userBorrowed, debt, range));
    console.log(await oneWayMarket.leverage.createLoanPrices(userCollateral, userBorrowed, debt, range));
    console.log(await oneWayMarket.leverage.createLoanHealth(userCollateral, userBorrowed, debt, range));
    console.log(await oneWayMarket.leverage.createLoanHealth(userCollateral, userBorrowed, debt, range, false));
    console.log(await oneWayMarket.leverage.createLoanIsApproved(userCollateral, userBorrowed));
    console.log(await oneWayMarket.leverage.createLoanApprove(userCollateral, userBorrowed));
    console.log(oneWayMarket.leverage.createLoanRouteImage(userBorrowed, debt));

    console.log(await oneWayMarket.leverage.createLoan(userCollateral, userBorrowed, debt, range, slippage));

    console.log(await oneWayMarket.wallet.balances());
    console.log(await oneWayMarket.userState());
    console.log(await oneWayMarket.userBands());
    console.log(await oneWayMarket.userPrices());
    console.log(await oneWayMarket.userHealth());
    console.log(await oneWayMarket.userHealth(false));

    console.log("\n- Borrow More -\n")

    userCollateral = 2;
    userBorrowed = 2000;
    debt = 10000;
    console.log(await oneWayMarket.leverage.borrowMoreMaxRecv(userCollateral, userBorrowed));
    console.log(await oneWayMarket.leverage.borrowMoreExpectedCollateral(userCollateral, userBorrowed, debt, slippage));
    console.log(await oneWayMarket.leverage.borrowMorePriceImpact(userBorrowed, debt));
    console.log(await oneWayMarket.leverage.borrowMoreBands(userCollateral, userBorrowed, debt));
    console.log(await oneWayMarket.leverage.borrowMorePrices(userCollateral, userBorrowed, debt));
    console.log(await oneWayMarket.leverage.borrowMoreHealth(userCollateral, userBorrowed, debt, true));
    console.log(await oneWayMarket.leverage.borrowMoreHealth(userCollateral, userBorrowed, debt, false));
    console.log(await oneWayMarket.leverage.borrowMoreIsApproved(userCollateral, userBorrowed));
    console.log(await oneWayMarket.leverage.borrowMoreApprove(userCollateral, userBorrowed));
    console.log(await oneWayMarket.leverage.borrowMoreRouteImage(userBorrowed, debt));

    console.log(await oneWayMarket.leverage.borrowMore(userCollateral, userBorrowed, debt, slippage));

    console.log(await oneWayMarket.wallet.balances());
    console.log(await oneWayMarket.userState());
    console.log(await oneWayMarket.userBands());
    console.log(await oneWayMarket.userPrices());
    console.log(await oneWayMarket.userHealth());
    console.log(await oneWayMarket.userHealth(false));

    console.log("\n- Repay -\n")

    const stateCollateral = 1;
    userCollateral = 1;
    userBorrowed = 1500;
    console.log(await oneWayMarket.leverage.repayExpectedBorrowed(stateCollateral, userCollateral, userBorrowed, slippage));
    console.log(await oneWayMarket.leverage.repayPriceImpact(stateCollateral, userCollateral));
    console.log(await oneWayMarket.leverage.repayIsFull(stateCollateral, userCollateral, userBorrowed));
    console.log(await oneWayMarket.leverage.repayIsAvailable(stateCollateral, userCollateral, userBorrowed));
    console.log(await oneWayMarket.leverage.repayBands(stateCollateral, userCollateral, userBorrowed));
    console.log(await oneWayMarket.leverage.repayPrices(stateCollateral, userCollateral, userBorrowed));
    console.log(await oneWayMarket.leverage.repayHealth(stateCollateral, userCollateral, userBorrowed, true));
    console.log(await oneWayMarket.leverage.repayHealth(stateCollateral, userCollateral, userBorrowed, false));
    console.log(await oneWayMarket.leverage.repayIsApproved(userCollateral, userBorrowed));
    console.log(await oneWayMarket.leverage.repayApprove(userCollateral, userBorrowed));
    console.log(await oneWayMarket.leverage.repayRouteImage(stateCollateral, userCollateral));

    console.log(await oneWayMarket.leverage.repay(stateCollateral, userCollateral, userBorrowed, slippage));

    console.log(await oneWayMarket.wallet.balances());
    console.log(await oneWayMarket.userState());
    console.log(await oneWayMarket.userBands());
    console.log(await oneWayMarket.userPrices());
    console.log(await oneWayMarket.userHealth());
    console.log(await oneWayMarket.userHealth(false));
}

const leverageAllRangesTest = async () => {
    await lending.init('JsonRpc', {}, {});
    await lending.oneWayfactory.fetchMarkets();

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');

    if (Number(await oneWayMarket.vault.totalLiquidity()) === 0) {
        const maxDeposit = Number(await oneWayMarket.vault.maxDeposit()) * 0.7;
        await oneWayMarket.vault.deposit(maxDeposit);
    }

    const userCollateral = 1;
    const userBorrowed = 1000;
    const debt = 2000;
    console.log(await oneWayMarket.leverage.createLoanMaxRecvAllRanges(userCollateral, userBorrowed));
    console.log(await oneWayMarket.leverage.createLoanBandsAllRanges(userCollateral, userBorrowed, debt));
    console.log(await oneWayMarket.leverage.createLoanPricesAllRanges(userCollateral, userBorrowed, debt));
}

(async () => {
    console.log("\n--- generalMethodsTest ---\n")
    await generalMethodsTest();
    console.log("\n--- llammaFieldsTest ---\n")
    await oneWayMarketFieldsTest();
    console.log("\n--- walletBalancesTest ---\n")
    await walletBalancesTest();
    console.log("\n--- statsTest ---\n")
    await statsTest();
    console.log("\n--- vaultTest ---\n")
    await vaultTest();
    console.log("\n--- generalTest ---\n")
    await generalTest();
    console.log("\n--- createLoanAllRangesTest ---\n")
    await createLoanAllRangesTest();
    console.log("\n--- swapTest ---\n")
    await swapTest();
    console.log("\n--- selfLiquidationTest ---\n")
    await selfLiquidationTest();
    console.log("\n--- leverageTest ---\n")
    await leverageTest();
    console.log("\n--- leverageAllRangesTest ---\n")
    await leverageAllRangesTest();
})()
