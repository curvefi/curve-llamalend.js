import { assert } from "chai";
import lending from "../src/index.js";
import { getOneWayMarket, OneWayMarketTemplate } from "../src/markets/index.js";
import { BN } from "../src/utils.js";


const ONE_WAY_MARKETS = ['one-way-market-9'];

const generalTest = (id: string) => {
    describe(`${id} leverage createLoan test`, function () {
        let oneWayMarket: OneWayMarketTemplate;

        before(async function () {
            oneWayMarket = getOneWayMarket(id);
            if (Number(await oneWayMarket.vault.totalLiquidity()) === 0) {
                const maxDeposit = Number(await oneWayMarket.vault.maxDeposit()) * 0.7;
                await oneWayMarket.vault.deposit(maxDeposit);
            }
        });

        it('Leverage createLoan collateral only, debt too high', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isFalse(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const collateralAmount = 0.02;
            const borrowedAmount = 0;
            const N = 10;
            const { maxDebt } = await oneWayMarket.leverage.createLoanMaxRecv(collateralAmount, borrowedAmount, N);
            const debtAmount = (Number(maxDebt) * 1.004).toFixed(oneWayMarket.borrowed_token.decimals);

            try {
                await oneWayMarket.leverage.createLoanExpectedCollateral(collateralAmount, borrowedAmount, debtAmount, 1);
                await oneWayMarket.leverage.createLoan(collateralAmount, borrowedAmount, debtAmount, N, 1);
                throw Error("Did not revert");
            } catch (e) {
                // @ts-ignore
                assert.notEqual(e.message, "Did not revert", e.message);
                // @ts-ignore
                assert.isTrue(e.message.startsWith('execution reverted: "Debt too high"'), e.message);
            }
        });

        it('Leverage createLoan borrowed only, debt too high', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isFalse(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const collateralAmount = 0;
            const borrowedAmount = 1000;
            const N = 10;
            const { maxDebt } = await oneWayMarket.leverage.createLoanMaxRecv(collateralAmount, borrowedAmount, N);
            const debtAmount = (Number(maxDebt) * 1.004).toFixed(oneWayMarket.borrowed_token.decimals);

            try {
                await oneWayMarket.leverage.createLoanExpectedCollateral(collateralAmount, borrowedAmount, debtAmount, 1);
                await oneWayMarket.leverage.createLoan(collateralAmount, borrowedAmount, debtAmount, N, 1);
                throw Error("Did not revert");
            } catch (e) {
                // @ts-ignore
                assert.notEqual(e.message, "Did not revert", e.message);
                // @ts-ignore
                assert.isTrue(e.message.startsWith('execution reverted: "Debt too high"'), e.message);
            }
        });

        it('Leverage createLoan, debt too high', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isFalse(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const collateralAmount = 0.02;
            const borrowedAmount = 1000;
            const N = 10;
            const { maxDebt } = await oneWayMarket.leverage.createLoanMaxRecv(collateralAmount, borrowedAmount, N);
            const debtAmount = (Number(maxDebt) * 1.004).toFixed(oneWayMarket.borrowed_token.decimals);

            try {
                await oneWayMarket.leverage.createLoanExpectedCollateral(collateralAmount, borrowedAmount, debtAmount, 1);
                await oneWayMarket.leverage.createLoan(collateralAmount, borrowedAmount, debtAmount, N, 1);
                throw Error("Did not revert");
            } catch (e) {
                // @ts-ignore
                assert.notEqual(e.message, "Did not revert", e.message);
                // @ts-ignore
                assert.isTrue(e.message.startsWith('execution reverted: "Debt too high"'), e.message);
            }
        });

        it('Leverage createLoan collateral only', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isFalse(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const collateralAmount = 0.02;
            const borrowedAmount = 0;
            const N = 10;
            const { maxDebt } = await oneWayMarket.leverage.createLoanMaxRecv(collateralAmount, borrowedAmount, N);
            const debtAmount = (Number(maxDebt) / 2).toFixed(oneWayMarket.borrowed_token.decimals);
            const { totalCollateral } = await oneWayMarket.leverage.createLoanExpectedCollateral(collateralAmount, borrowedAmount, debtAmount, 1);
            const createLoanBands = await oneWayMarket.leverage.createLoanBands(collateralAmount, borrowedAmount, debtAmount, N);
            const createLoanPrices = await oneWayMarket.leverage.createLoanPrices(collateralAmount, borrowedAmount, debtAmount, N);
            const createLoanFullHealth = await oneWayMarket.leverage.createLoanHealth(collateralAmount, borrowedAmount, debtAmount, N);
            const createLoanHealth = await oneWayMarket.leverage.createLoanHealth(collateralAmount, borrowedAmount, debtAmount, N, false);

            await oneWayMarket.leverage.createLoan(collateralAmount, borrowedAmount, debtAmount, N, 1);

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            const userBands = await oneWayMarket.userBands();
            const userPrices = await oneWayMarket.userPrices();
            const fullHealth = await oneWayMarket.userHealth();
            const health = await oneWayMarket.userHealth(false);

            assert.equal(Number(createLoanBands[0]), Number(userBands[0]), 'band 0');
            assert.equal(Number(createLoanBands[1]), Number(userBands[1]), 'band 1');
            assert.approximately(Number(createLoanPrices[0]), Number(userPrices[0]), 1, 'price 0');
            assert.approximately(Number(createLoanPrices[1]), Number(userPrices[1]), 1, 'price 1');
            assert.approximately(Number(createLoanFullHealth), Number(fullHealth), 1, 'full health');
            assert.approximately(Number(createLoanHealth), Number(health), 0.3, 'health');
            assert.equal(Number(balances.collateral), BN(initialBalances.collateral).minus(collateralAmount).toNumber(), 'wallet collateral');
            assert.equal(Number(balances.borrowed), Number(initialBalances.borrowed) - borrowedAmount, 'wallet borrowed');
            assert.isAtMost(Math.abs(Number(state.collateral) - Number(totalCollateral)) / Number(totalCollateral), 0.01, 'state collateral');
            assert.equal(Number(state.debt), Number(debtAmount), 'state debt');

            await oneWayMarket.fullRepay();
        });

        it('Leverage createLoan borrowed only', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isFalse(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const collateralAmount = 0;
            const borrowedAmount = 1000;
            const N = 10;
            const { maxDebt } = await oneWayMarket.leverage.createLoanMaxRecv(collateralAmount, borrowedAmount, N);
            const debtAmount = (Number(maxDebt) / 2).toFixed(oneWayMarket.borrowed_token.decimals);
            const { totalCollateral } = await oneWayMarket.leverage.createLoanExpectedCollateral(collateralAmount, borrowedAmount, debtAmount, 1);
            const createLoanBands = await oneWayMarket.leverage.createLoanBands(collateralAmount, borrowedAmount, debtAmount, N);
            const createLoanPrices = await oneWayMarket.leverage.createLoanPrices(collateralAmount, borrowedAmount, debtAmount, N);
            const createLoanFullHealth = await oneWayMarket.leverage.createLoanHealth(collateralAmount, borrowedAmount, debtAmount, N);
            const createLoanHealth = await oneWayMarket.leverage.createLoanHealth(collateralAmount, borrowedAmount, debtAmount, N, false);

            await oneWayMarket.leverage.createLoan(collateralAmount, borrowedAmount, debtAmount, N, 1);

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            const userBands = await oneWayMarket.userBands();
            const userPrices = await oneWayMarket.userPrices();
            const fullHealth = await oneWayMarket.userHealth();
            const health = await oneWayMarket.userHealth(false);

            assert.equal(Number(createLoanBands[0]), Number(userBands[0]), 'band 0');
            assert.equal(Number(createLoanBands[1]), Number(userBands[1]), 'band 1');
            assert.approximately(Number(createLoanPrices[0]), Number(userPrices[0]), 1, 'price 0');
            assert.approximately(Number(createLoanPrices[1]), Number(userPrices[1]), 1, 'price 1');
            assert.approximately(Number(createLoanFullHealth), Number(fullHealth), 1, 'full health');
            assert.approximately(Number(createLoanHealth), Number(health), 0.3, 'health');
            assert.equal(Number(balances.collateral), BN(initialBalances.collateral).minus(collateralAmount).toNumber(), 'wallet collateral');
            assert.equal(Number(balances.borrowed), Number(initialBalances.borrowed) - borrowedAmount, 'wallet borrowed');
            assert.isAtMost(Math.abs(Number(state.collateral) - Number(totalCollateral)) / Number(totalCollateral), 0.01, 'state collateral');
            assert.equal(Number(state.debt), Number(debtAmount), 'state debt');

            await oneWayMarket.fullRepay();
        });

        it('Leverage createLoan', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isFalse(loanExists, "loanExists");
            assert.isAbove(Number(initialBalances.collateral), 0, "collateral > 0");
            assert.isAbove(Number(initialBalances.borrowed), 0, "borrowed > 0");

            const collateralAmount = 0.02;
            const borrowedAmount = 1000;
            const N = 10;
            const { maxDebt } = await oneWayMarket.leverage.createLoanMaxRecv(collateralAmount, borrowedAmount, N);
            const debtAmount = (Number(maxDebt) * 0.999).toFixed(oneWayMarket.borrowed_token.decimals);
            const { totalCollateral } = await oneWayMarket.leverage.createLoanExpectedCollateral(collateralAmount, borrowedAmount, debtAmount, 1);
            const createLoanBands = await oneWayMarket.leverage.createLoanBands(collateralAmount, borrowedAmount, debtAmount, N);
            const createLoanPrices = await oneWayMarket.leverage.createLoanPrices(collateralAmount, borrowedAmount, debtAmount, N);
            const createLoanFullHealth = await oneWayMarket.leverage.createLoanHealth(collateralAmount, borrowedAmount, debtAmount, N);
            const createLoanHealth = await oneWayMarket.leverage.createLoanHealth(collateralAmount, borrowedAmount, debtAmount, N, false);

            await oneWayMarket.leverage.createLoan(collateralAmount, borrowedAmount, debtAmount, N, 1);

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            const userBands = await oneWayMarket.userBands();
            const userPrices = await oneWayMarket.userPrices();
            const fullHealth = await oneWayMarket.userHealth();
            const health = await oneWayMarket.userHealth(false);

            assert.equal(Number(createLoanBands[0]), Number(userBands[0]), 'band 0');
            assert.equal(Number(createLoanBands[1]), Number(userBands[1]), 'band 1');
            assert.approximately(Number(createLoanPrices[0]), Number(userPrices[0]), 1, 'price 0');
            assert.approximately(Number(createLoanPrices[1]), Number(userPrices[1]), 1, 'price 1');
            assert.approximately(Number(createLoanFullHealth), Number(fullHealth), 1, 'full health');
            assert.approximately(Number(createLoanHealth), Number(health), 0.3, 'health');
            assert.equal(Number(balances.collateral), BN(initialBalances.collateral).minus(collateralAmount).toNumber(), 'wallet collateral');
            assert.equal(Number(balances.borrowed), Number(initialBalances.borrowed) - borrowedAmount, 'wallet borrowed');
            assert.isAtMost(Math.abs(Number(state.collateral) - Number(totalCollateral)) / Number(totalCollateral), 0.01, 'state collateral');
            assert.equal(Number(state.debt), Number(debtAmount), 'state debt');
        });
    })
}

describe('Leverage createLoan test', async function () {
    this.timeout(180000);

    before(async function () {
        await lending.init('JsonRpc', {},{ gasPrice: 0 });
        await lending.oneWayfactory.fetchMarkets();
    });

    for (const oneWayMarketId of ONE_WAY_MARKETS) {
        generalTest(oneWayMarketId);
    }
})
