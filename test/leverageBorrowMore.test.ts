import { assert } from "chai";
import lending from "../src/index.js";
import { getOneWayMarket, OneWayMarketTemplate } from "../src/markets/index.js";
import { BN } from "../src/utils.js";


const ONE_WAY_MARKETS = ['one-way-market-9'];

const generalTest = (id: string) => {
    describe(`${id} leverage borrowMore test`, function () {
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

        it('Leverage borrowMore collateral only, debt too high', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isTrue(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const collateralAmount = 0.02;
            const borrowedAmount = 0;
            const { maxDebt } = await oneWayMarket.leverage.borrowMoreMaxRecv(collateralAmount, borrowedAmount);
            const debtAmount = (Number(maxDebt) * 1.004).toFixed(oneWayMarket.borrowed_token.decimals);

            try {
                await oneWayMarket.leverage.borrowMoreExpectedCollateral(collateralAmount, borrowedAmount, debtAmount, 1);
                await oneWayMarket.leverage.borrowMore(collateralAmount, borrowedAmount, debtAmount,1);
                throw Error("Did not revert");
            } catch (e) {
                // @ts-ignore
                assert.notEqual(e.message, "Did not revert", e.message);
                // @ts-ignore
                assert.isTrue(e.message.startsWith('execution reverted: "Debt too high"'), e.message);
            }
        });

        it('Leverage borrowMore borrowed only, debt too high', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isTrue(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const collateralAmount = 0;
            const borrowedAmount = 1000;
            const { maxDebt } = await oneWayMarket.leverage.borrowMoreMaxRecv(collateralAmount, borrowedAmount);
            const debtAmount = (Number(maxDebt) * 1.004).toFixed(oneWayMarket.borrowed_token.decimals);

            try {
                await oneWayMarket.leverage.borrowMoreExpectedCollateral(collateralAmount, borrowedAmount, debtAmount, 1);
                await oneWayMarket.leverage.borrowMore(collateralAmount, borrowedAmount, debtAmount,1);
                throw Error("Did not revert");
            } catch (e) {
                // @ts-ignore
                assert.notEqual(e.message, "Did not revert", e.message);
                // @ts-ignore
                assert.isTrue(e.message.startsWith('execution reverted: "Debt too high"'), e.message);
            }
        });

        it('Leverage borrowMore, debt too high', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isTrue(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const collateralAmount = 0.02;
            const borrowedAmount = 1000;
            const { maxDebt } = await oneWayMarket.leverage.borrowMoreMaxRecv(collateralAmount, borrowedAmount);
            const debtAmount = (Number(maxDebt) * 1.004).toFixed(oneWayMarket.borrowed_token.decimals);

            try {
                await oneWayMarket.leverage.borrowMoreExpectedCollateral(collateralAmount, borrowedAmount, debtAmount, 1);
                await oneWayMarket.leverage.borrowMore(collateralAmount, borrowedAmount, debtAmount,1);
                throw Error("Did not revert");
            } catch (e) {
                // @ts-ignore
                assert.notEqual(e.message, "Did not revert", e.message);
                // @ts-ignore
                assert.isTrue(e.message.startsWith('execution reverted: "Debt too high"'), e.message);
            }
        });

        it('Leverage borrowMore collateral only', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const initialState = await oneWayMarket.userState();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isTrue(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const collateralAmount = 0.02;
            const borrowedAmount = 0;
            const { maxDebt } = await oneWayMarket.leverage.borrowMoreMaxRecv(collateralAmount, borrowedAmount);
            const debtAmount = (Number(maxDebt) / 2).toFixed(oneWayMarket.borrowed_token.decimals);
            const { totalCollateral } = await oneWayMarket.leverage.borrowMoreExpectedCollateral(collateralAmount, borrowedAmount, debtAmount, 1);
            const borrowMoreBands = await oneWayMarket.leverage.borrowMoreBands(collateralAmount, borrowedAmount, debtAmount);
            const borrowMorePrices = await oneWayMarket.leverage.borrowMorePrices(collateralAmount, borrowedAmount, debtAmount);
            const borrowMoreFullHealth = await oneWayMarket.leverage.borrowMoreHealth(collateralAmount, borrowedAmount, debtAmount);
            const borrowMoreHealth = await oneWayMarket.leverage.borrowMoreHealth(collateralAmount, borrowedAmount, debtAmount, false);

            await oneWayMarket.leverage.borrowMore(collateralAmount, borrowedAmount, debtAmount,1);

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            const userBands = await oneWayMarket.userBands();
            const userPrices = await oneWayMarket.userPrices();
            const fullHealth = await oneWayMarket.userHealth();
            const health = await oneWayMarket.userHealth(false);

            assert.equal(Number(borrowMoreBands[0]), Number(userBands[0]), 'band 0');
            assert.equal(Number(borrowMoreBands[1]), Number(userBands[1]), 'band 1');
            assert.approximately(Number(borrowMorePrices[0]), Number(userPrices[0]), 1, 'price 0');
            assert.approximately(Number(borrowMorePrices[1]), Number(userPrices[1]), 1, 'price 1');
            assert.approximately(Number(borrowMoreFullHealth), Number(fullHealth), 1, 'full health');
            assert.approximately(Number(borrowMoreHealth), Number(health), 0.3, 'health');
            assert.equal(Number(balances.collateral), BN(initialBalances.collateral).minus(collateralAmount).toNumber(), 'wallet collateral');
            assert.equal(Number(balances.borrowed), Number(initialBalances.borrowed) - borrowedAmount, 'wallet borrowed');
            const collateralDiff = Number(state.collateral) - Number(initialState.collateral);
            assert.isAtMost(Math.abs(collateralDiff - Number(totalCollateral)) / Number(totalCollateral), 0.01, 'state collateral');
            const debtDiff = Number(state.debt) - Number(initialState.debt);
            assert.isAtMost(Math.abs(debtDiff - Number(debtAmount)) / Number(debtAmount), 2e-6, 'state debt');
        });

        it('Leverage borrowMore borrowed only', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const initialState = await oneWayMarket.userState();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isTrue(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const collateralAmount = 0;
            const borrowedAmount = 1000;
            const { maxDebt } = await oneWayMarket.leverage.borrowMoreMaxRecv(collateralAmount, borrowedAmount);
            const debtAmount = (Number(maxDebt) / 2).toFixed(oneWayMarket.borrowed_token.decimals);
            const { totalCollateral } = await oneWayMarket.leverage.borrowMoreExpectedCollateral(collateralAmount, borrowedAmount, debtAmount, 1);
            const borrowMoreBands = await oneWayMarket.leverage.borrowMoreBands(collateralAmount, borrowedAmount, debtAmount);
            const borrowMorePrices = await oneWayMarket.leverage.borrowMorePrices(collateralAmount, borrowedAmount, debtAmount);
            const borrowMoreFullHealth = await oneWayMarket.leverage.borrowMoreHealth(collateralAmount, borrowedAmount, debtAmount);
            const borrowMoreHealth = await oneWayMarket.leverage.borrowMoreHealth(collateralAmount, borrowedAmount, debtAmount, false);

            await oneWayMarket.leverage.borrowMore(collateralAmount, borrowedAmount, debtAmount,1);

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            const userBands = await oneWayMarket.userBands();
            const userPrices = await oneWayMarket.userPrices();
            const fullHealth = await oneWayMarket.userHealth();
            const health = await oneWayMarket.userHealth(false);

            assert.equal(Number(borrowMoreBands[0]), Number(userBands[0]), 'band 0');
            assert.equal(Number(borrowMoreBands[1]), Number(userBands[1]), 'band 1');
            assert.approximately(Number(borrowMorePrices[0]), Number(userPrices[0]), 1, 'price 0');
            assert.approximately(Number(borrowMorePrices[1]), Number(userPrices[1]), 1, 'price 1');
            assert.approximately(Number(borrowMoreFullHealth), Number(fullHealth), 1, 'full health');
            assert.approximately(Number(borrowMoreHealth), Number(health), 0.3, 'health');
            assert.equal(Number(balances.collateral), BN(initialBalances.collateral).minus(collateralAmount).toNumber(), 'wallet collateral');
            assert.equal(Number(balances.borrowed), Number(initialBalances.borrowed) - borrowedAmount, 'wallet borrowed');
            const collateralDiff = Number(state.collateral) - Number(initialState.collateral);
            assert.isAtMost(Math.abs(collateralDiff - Number(totalCollateral)) / Number(totalCollateral), 0.01, 'state collateral');
            const debtDiff = Number(state.debt) - Number(initialState.debt);
            assert.isAtMost(Math.abs(debtDiff - Number(debtAmount)) / Number(debtAmount), 2e-6, 'state debt');
        });

        it('Leverage borrowMore', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const initialState = await oneWayMarket.userState();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isTrue(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const collateralAmount = 0.02;
            const borrowedAmount = 1000;
            const { maxDebt } = await oneWayMarket.leverage.borrowMoreMaxRecv(collateralAmount, borrowedAmount);
            const debtAmount = (Number(maxDebt) * 0.999).toFixed(oneWayMarket.borrowed_token.decimals);
            const { totalCollateral } = await oneWayMarket.leverage.borrowMoreExpectedCollateral(collateralAmount, borrowedAmount, debtAmount, 1);
            const borrowMoreBands = await oneWayMarket.leverage.borrowMoreBands(collateralAmount, borrowedAmount, debtAmount);
            const borrowMorePrices = await oneWayMarket.leverage.borrowMorePrices(collateralAmount, borrowedAmount, debtAmount);
            const borrowMoreFullHealth = await oneWayMarket.leverage.borrowMoreHealth(collateralAmount, borrowedAmount, debtAmount);
            const borrowMoreHealth = await oneWayMarket.leverage.borrowMoreHealth(collateralAmount, borrowedAmount, debtAmount, false);

            await oneWayMarket.leverage.borrowMore(collateralAmount, borrowedAmount, debtAmount,1);

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            const userBands = await oneWayMarket.userBands();
            const userPrices = await oneWayMarket.userPrices();
            const fullHealth = await oneWayMarket.userHealth();
            const health = await oneWayMarket.userHealth(false);

            assert.equal(Number(borrowMoreBands[0]), Number(userBands[0]), 'band 0');
            assert.equal(Number(borrowMoreBands[1]), Number(userBands[1]), 'band 1');
            assert.approximately(Number(borrowMorePrices[0]), Number(userPrices[0]), 1, 'price 0');
            assert.approximately(Number(borrowMorePrices[1]), Number(userPrices[1]), 1, 'price 1');
            assert.approximately(Number(borrowMoreFullHealth), Number(fullHealth), 1, 'full health');
            assert.approximately(Number(borrowMoreHealth), Number(health), 0.3, 'health');
            assert.equal(Number(balances.collateral), BN(initialBalances.collateral).minus(collateralAmount).toNumber(), 'wallet collateral');
            assert.equal(Number(balances.borrowed), Number(initialBalances.borrowed) - borrowedAmount, 'wallet borrowed');
            const collateralDiff = Number(state.collateral) - Number(initialState.collateral);
            assert.isAtMost(Math.abs(collateralDiff - Number(totalCollateral)) / Number(totalCollateral), 0.01, 'state collateral');
            const debtDiff = Number(state.debt) - Number(initialState.debt);
            assert.isAtMost(Math.abs(debtDiff - Number(debtAmount)) / Number(debtAmount), 2e-6, 'state debt');
        });
    })
}

describe('Leverage borrowMore test', async function () {
    this.timeout(180000);

    before(async function () {
        await lending.init('JsonRpc', {},{ gasPrice: 0 });
        await lending.oneWayfactory.fetchMarkets();
    });

    for (const oneWayMarketId of ONE_WAY_MARKETS) {
        generalTest(oneWayMarketId);
    }
})
