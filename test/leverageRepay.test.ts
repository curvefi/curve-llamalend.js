import { assert } from "chai";
import lending from "../src/index.js";
import { getOneWayMarket, OneWayMarketTemplate } from "../src/markets/index.js";
import { BN } from "../src/utils.js";


const ONE_WAY_MARKETS = ['one-way-market-9'];

const generalTest = (id: string) => {
    describe(`${id} leverage repay test`, function () {
        let oneWayMarket: OneWayMarketTemplate;

        before(async function () {
            oneWayMarket = getOneWayMarket(id);
            if (Number(await oneWayMarket.vault.totalLiquidity()) === 0) {
                const maxDeposit = Number(await oneWayMarket.vault.maxDeposit()) * 0.7;
                await oneWayMarket.vault.deposit(maxDeposit);
            }
            if (!(await oneWayMarket.userLoanExists())) {
                const collateralAmount = 0.02;
                const borrowedAmount = 1000;
                const N = 10;
                const { maxDebt } = await oneWayMarket.leverage.createLoanMaxRecv(collateralAmount, borrowedAmount, N);
                const debtAmount = (Number(maxDebt) / 2).toFixed(oneWayMarket.borrowed_token.decimals);

                await oneWayMarket.leverage.createLoanExpectedCollateral(collateralAmount, borrowedAmount, debtAmount, 1);
                await oneWayMarket.leverage.createLoan(collateralAmount, borrowedAmount, debtAmount, N, 1);
            }
        });

        it('Leverage repay state collateral only', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const initialState = await oneWayMarket.userState();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isTrue(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const stateCollateralAmount = 0.0002;
            const collateralAmount = 0;
            const borrowedAmount = 0;
            const { totalBorrowed } = await oneWayMarket.leverage.repayExpectedBorrowed(stateCollateralAmount, collateralAmount, borrowedAmount, 1);
            const repayBands = await oneWayMarket.leverage.repayBands(stateCollateralAmount, collateralAmount, borrowedAmount);
            const repayPrices = await oneWayMarket.leverage.repayPrices(stateCollateralAmount, collateralAmount, borrowedAmount);
            const repayFullHealth = await oneWayMarket.leverage.repayHealth(stateCollateralAmount, collateralAmount, borrowedAmount);
            const repayHealth = await oneWayMarket.leverage.repayHealth(stateCollateralAmount, collateralAmount, borrowedAmount, false);

            await oneWayMarket.leverage.repay(stateCollateralAmount, collateralAmount, borrowedAmount, 1);
            await new Promise((r) => setTimeout(r, 5000)); // Timeout needed to update fork state

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            const userBands = await oneWayMarket.userBands();
            const userPrices = await oneWayMarket.userPrices();
            const fullHealth = await oneWayMarket.userHealth();
            const health = await oneWayMarket.userHealth(false);

            assert.equal(Number(repayBands[0]), Number(userBands[0]), 'band 0');
            assert.equal(Number(repayBands[1]), Number(userBands[1]), 'band 1');
            assert.approximately(Number(repayPrices[0]), Number(userPrices[0]), 0.1, 'price 0');
            assert.approximately(Number(repayPrices[1]), Number(userPrices[1]), 0.1, 'price 1');
            assert.approximately(Number(repayFullHealth), Number(fullHealth), 0.1, 'full health');
            assert.approximately(Number(repayHealth), Number(health), 0.1, 'health');
            assert.equal(Number(balances.collateral), BN(initialBalances.collateral).minus(collateralAmount).toNumber(), 'wallet collateral');
            assert.equal(Number(balances.borrowed), Number(initialBalances.borrowed) - borrowedAmount, 'wallet borrowed');
            assert.deepStrictEqual(BN(state.collateral), BN(initialState.collateral).minus(stateCollateralAmount),'state collateral');
            const debtDiff = Number(initialState.debt) - Number(state.debt);
            assert.isAtMost(Math.abs(debtDiff - Number(totalBorrowed)) / Number(totalBorrowed), 0.01, 'state debt');
        });

        it('Leverage repay user collateral only', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const initialState = await oneWayMarket.userState();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isTrue(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const stateCollateralAmount = 0;
            const collateralAmount = 0.0002;
            const borrowedAmount = 0;
            const { totalBorrowed } = await oneWayMarket.leverage.repayExpectedBorrowed(stateCollateralAmount, collateralAmount, borrowedAmount, 1);
            const repayBands = await oneWayMarket.leverage.repayBands(stateCollateralAmount, collateralAmount, borrowedAmount);
            const repayPrices = await oneWayMarket.leverage.repayPrices(stateCollateralAmount, collateralAmount, borrowedAmount);
            const repayFullHealth = await oneWayMarket.leverage.repayHealth(stateCollateralAmount, collateralAmount, borrowedAmount);
            const repayHealth = await oneWayMarket.leverage.repayHealth(stateCollateralAmount, collateralAmount, borrowedAmount, false);

            await oneWayMarket.leverage.repay(stateCollateralAmount, collateralAmount, borrowedAmount, 1);
            await new Promise((r) => setTimeout(r, 5000)); // Timeout needed to update fork state

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            const userBands = await oneWayMarket.userBands();
            const userPrices = await oneWayMarket.userPrices();
            const fullHealth = await oneWayMarket.userHealth();
            const health = await oneWayMarket.userHealth(false);

            assert.equal(Number(repayBands[0]), Number(userBands[0]), 'band 0');
            assert.equal(Number(repayBands[1]), Number(userBands[1]), 'band 1');
            assert.approximately(Number(repayPrices[0]), Number(userPrices[0]), 0.1, 'price 0');
            assert.approximately(Number(repayPrices[1]), Number(userPrices[1]), 0.1, 'price 1');
            assert.approximately(Number(repayFullHealth), Number(fullHealth), 0.1, 'full health');
            assert.approximately(Number(repayHealth), Number(health), 0.1, 'health');
            assert.equal(Number(balances.collateral), BN(initialBalances.collateral).minus(collateralAmount).toNumber(), 'wallet collateral');
            assert.equal(Number(balances.borrowed), Number(initialBalances.borrowed) - borrowedAmount, 'wallet borrowed');
            assert.equal(Number(state.collateral), Number(initialState.collateral) - Number(stateCollateralAmount), 'state collateral');
            const debtDiff = Number(initialState.debt) - Number(state.debt);
            assert.isAtMost(Math.abs(debtDiff - Number(totalBorrowed)) / Number(totalBorrowed), 0.01, 'state debt');
        });

        it('Leverage repay user borrowed only', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const initialState = await oneWayMarket.userState();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isTrue(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const stateCollateralAmount = 0;
            const collateralAmount = 0;
            const borrowedAmount = 500;
            const { totalBorrowed } = await oneWayMarket.leverage.repayExpectedBorrowed(stateCollateralAmount, collateralAmount, borrowedAmount, 1);
            const repayBands = await oneWayMarket.leverage.repayBands(stateCollateralAmount, collateralAmount, borrowedAmount);
            const repayPrices = await oneWayMarket.leverage.repayPrices(stateCollateralAmount, collateralAmount, borrowedAmount);
            const repayFullHealth = await oneWayMarket.leverage.repayHealth(stateCollateralAmount, collateralAmount, borrowedAmount);
            const repayHealth = await oneWayMarket.leverage.repayHealth(stateCollateralAmount, collateralAmount, borrowedAmount, false);

            await oneWayMarket.leverage.repay(stateCollateralAmount, collateralAmount, borrowedAmount, 1);
            await new Promise((r) => setTimeout(r, 5000)); // Timeout needed to update fork state

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            const userBands = await oneWayMarket.userBands();
            const userPrices = await oneWayMarket.userPrices();
            const fullHealth = await oneWayMarket.userHealth();
            const health = await oneWayMarket.userHealth(false);

            assert.equal(Number(repayBands[0]), Number(userBands[0]), 'band 0');
            assert.equal(Number(repayBands[1]), Number(userBands[1]), 'band 1');
            assert.approximately(Number(repayPrices[0]), Number(userPrices[0]), 0.1, 'price 0');
            assert.approximately(Number(repayPrices[1]), Number(userPrices[1]), 0.1, 'price 1');
            assert.approximately(Number(repayFullHealth), Number(fullHealth), 0.1, 'full health');
            assert.approximately(Number(repayHealth), Number(health), 0.1, 'health');
            assert.equal(Number(balances.collateral), BN(initialBalances.collateral).minus(collateralAmount).toNumber(), 'wallet collateral');
            assert.equal(Number(balances.borrowed), Number(initialBalances.borrowed) - borrowedAmount, 'wallet borrowed');
            assert.equal(Number(state.collateral), Number(initialState.collateral) - Number(stateCollateralAmount), 'state collateral');
            assert.equal(borrowedAmount, Number(totalBorrowed), 'borrowed amount');
            const debtDiff = Number(initialState.debt) - Number(state.debt);
            assert.isAtMost(Math.abs(debtDiff - Number(totalBorrowed)) / Number(totalBorrowed), 2e-6, 'state debt');
        });

        it('Leverage repay', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const initialState = await oneWayMarket.userState();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isTrue(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const stateCollateralAmount = 0.0003;
            const collateralAmount = 0.0002;
            const borrowedAmount = 500;
            const { totalBorrowed } = await oneWayMarket.leverage.repayExpectedBorrowed(stateCollateralAmount, collateralAmount, borrowedAmount, 1);
            const repayBands = await oneWayMarket.leverage.repayBands(stateCollateralAmount, collateralAmount, borrowedAmount);
            const repayPrices = await oneWayMarket.leverage.repayPrices(stateCollateralAmount, collateralAmount, borrowedAmount);
            const repayFullHealth = await oneWayMarket.leverage.repayHealth(stateCollateralAmount, collateralAmount, borrowedAmount);
            const repayHealth = await oneWayMarket.leverage.repayHealth(stateCollateralAmount, collateralAmount, borrowedAmount, false);

            await oneWayMarket.leverage.repay(stateCollateralAmount, collateralAmount, borrowedAmount, 1);
            await new Promise((r) => setTimeout(r, 5000)); // Timeout needed to update fork state

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            const userBands = await oneWayMarket.userBands();
            const userPrices = await oneWayMarket.userPrices();
            const fullHealth = await oneWayMarket.userHealth();
            const health = await oneWayMarket.userHealth(false);

            assert.equal(Number(repayBands[0]), Number(userBands[0]), 'band 0');
            assert.equal(Number(repayBands[1]), Number(userBands[1]), 'band 1');
            assert.approximately(Number(repayPrices[0]), Number(userPrices[0]), 0.1, 'price 0');
            assert.approximately(Number(repayPrices[1]), Number(userPrices[1]), 0.1, 'price 1');
            assert.approximately(Number(repayFullHealth), Number(fullHealth), 0.1, 'full health');
            assert.approximately(Number(repayHealth), Number(health), 0.1, 'health');
            assert.equal(Number(balances.collateral), BN(initialBalances.collateral).minus(collateralAmount).toNumber(), 'wallet collateral');
            assert.equal(Number(balances.borrowed), Number(initialBalances.borrowed) - borrowedAmount, 'wallet borrowed');
            assert.deepStrictEqual(BN(state.collateral), BN(initialState.collateral).minus(stateCollateralAmount), 'state collateral');
            const debtDiff = Number(initialState.debt) - Number(state.debt);
            assert.isAtMost(Math.abs(debtDiff - Number(totalBorrowed)) / Number(totalBorrowed), 0.01, 'state debt');
        });

        it('Leverage full repay', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const initialState = await oneWayMarket.userState();
            let loanExists = await oneWayMarket.userLoanExists();

            assert.isTrue(loanExists, "loan does not exist");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const stateCollateralAmount = (Number(initialState.collateral) / 3).toFixed(oneWayMarket.collateral_token.decimals);
            const collateralAmount = (Number(initialState.collateral) / 3).toFixed(oneWayMarket.collateral_token.decimals);
            const borrowedAmount = (Number(initialState.debt) / 3).toFixed(oneWayMarket.borrowed_token.decimals);
            const { totalBorrowed } = await oneWayMarket.leverage.repayExpectedBorrowed(stateCollateralAmount, collateralAmount, borrowedAmount, 1);

            await oneWayMarket.leverage.repay(stateCollateralAmount, collateralAmount, borrowedAmount, 1);
            await new Promise((r) => setTimeout(r, 5000)); // Timeout needed to update fork state

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            loanExists = await oneWayMarket.userLoanExists();

            assert.isFalse(loanExists, "loan still exists");
            assert.approximately(Number(balances.collateral), Number(initialBalances.collateral) + (Number(initialState.collateral) / 3), 1e-6, 'wallet collateral');
            const borrowedDiff = (Number(balances.borrowed) + Number(initialState.debt)) - (Number(initialBalances.borrowed) - Number(borrowedAmount));
            assert.isTrue(borrowedDiff > 0); // Same sign
            assert.isAtMost(Math.abs(borrowedDiff - Number(totalBorrowed)) / Math.abs(borrowedDiff), 0.01, 'wallet borrowed');
            assert.equal(Number(state.collateral), 0, 'state collateral');
            assert.equal(Number(state.borrowed), 0, 'state borrowed');
            assert.equal(Number(state.debt), 0, 'state debt');
        });
    })
}

describe('Leverage repay test', async function () {
    this.timeout(180000);

    before(async function () {
        await lending.init('JsonRpc', {},{ gasPrice: 0 });
        await lending.oneWayfactory.fetchMarkets();
    });

    for (const oneWayMarketId of ONE_WAY_MARKETS) {
        generalTest(oneWayMarketId);
    }
})
