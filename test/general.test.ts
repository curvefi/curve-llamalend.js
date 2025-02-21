import { assert } from "chai";
import lending from "../src/index.js";
import { getOneWayMarket, OneWayMarketTemplate } from "../src/markets/index.js";
import { BN } from "../src/utils.js";


const ONE_WAY_MARKETS = ['one-way-market-0'];

const generalTest = (id: string) => {
    describe(`${id} oneWayMarket general test`, function () {
        let oneWayMarket: OneWayMarketTemplate;

        before(async function () {
            oneWayMarket = getOneWayMarket(id);
            const maxDeposit = Number(await oneWayMarket.vault.maxDeposit()) * 0.99;
            await oneWayMarket.vault.deposit(maxDeposit);
        });

        it('Create loan', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const initialState = await oneWayMarket.userState();

            assert.equal(Number(initialState.collateral), 0);
            assert.equal(Number(initialState.borrowed), 0);
            assert.equal(Number(initialState.debt), 0);
            assert.isAbove(Number(initialBalances.collateral), 0);

            const collateralAmount = 0.5;
            const N = 5;
            const maxRecv = await oneWayMarket.createLoanMaxRecv(collateralAmount, N);
            const debtAmount = (Number(maxRecv) / 2).toFixed(18);
            const createLoanPrices = await oneWayMarket.createLoanPrices(collateralAmount, debtAmount, N);
            const createLoanFullHealth = await oneWayMarket.createLoanHealth(collateralAmount, debtAmount, N);
            const createLoanHealth = await oneWayMarket.createLoanHealth(collateralAmount, debtAmount, N, false);

            await oneWayMarket.createLoan(collateralAmount, debtAmount, N);

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            const userPrices = await oneWayMarket.userPrices();
            const fullHealth = await oneWayMarket.userHealth();
            const health = await oneWayMarket.userHealth(false);

            assert.approximately(Number(createLoanPrices[0]), Number(userPrices[0]), 1e-2, 'price 0');
            assert.approximately(Number(createLoanPrices[1]), Number(userPrices[1]), 1e-2, 'price 1');
            assert.approximately(Number(createLoanFullHealth), Number(fullHealth), 0.1, 'full health');
            assert.approximately(Number(createLoanHealth), Number(health), 1e-4, 'health');
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) - Number(collateralAmount), 'wallet collateral');
            assert.approximately(Number(balances.borrowed), BN(initialBalances.borrowed).plus(Number(debtAmount)).toNumber(), 1e-12, 'wallet borrowed');
            assert.equal(Number(state.collateral), Number(collateralAmount), 'state collateral');
            assert.equal(Number(state.debt), Number(debtAmount), 'state debt');
        });

        it('Borrow more', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const initialState = await oneWayMarket.userState();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isTrue(loanExists);
            assert.isAbove(Number(initialBalances.collateral), 0);

            const collateralAmount = 0.5;
            const maxRecv = await oneWayMarket.borrowMoreMaxRecv(collateralAmount);
            const debtAmount = (Number(maxRecv) / 2).toFixed(18);
            const borrowMorePrices = await oneWayMarket.borrowMorePrices(collateralAmount, debtAmount);
            const borrowMoreFullHealth = await oneWayMarket.borrowMoreHealth(collateralAmount, debtAmount);
            const borrowMoreHealth = await oneWayMarket.borrowMoreHealth(collateralAmount, debtAmount, false);

            await oneWayMarket.borrowMore(collateralAmount, debtAmount);

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            const userPrices = await oneWayMarket.userPrices();
            const fullHealth = await oneWayMarket.userHealth();
            const health = await oneWayMarket.userHealth(false);

            assert.approximately(Number(borrowMorePrices[0]), Number(userPrices[0]), 1e-2, 'price 0');
            assert.approximately(Number(borrowMorePrices[1]), Number(userPrices[1]), 1e-2, 'price 1');
            assert.approximately(Number(borrowMoreFullHealth), Number(fullHealth), 1e-2, 'full health');
            assert.approximately(Number(borrowMoreHealth), Number(health), 1e-4, 'health');
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) - Number(collateralAmount), 'wallet collateral');
            assert.equal(balances.borrowed, BN(initialBalances.borrowed).plus(BN(debtAmount)).toString(), 'wallet borrowed');
            assert.equal(Number(state.collateral), Number(initialState.collateral) + Number(collateralAmount), 'state collateral');
            assert.approximately(Number(state.debt), Number(initialState.debt) + Number(debtAmount), 1e-4, 'state debt');
        });

        it('Add collateral', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const initialState = await oneWayMarket.userState();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isTrue(loanExists);
            assert.isAbove(Number(initialBalances.collateral), 0);

            const collateralAmount = 1;
            const addCollateralPrices = await oneWayMarket.addCollateralPrices(collateralAmount);
            const addCollateralFullHealth = await oneWayMarket.addCollateralHealth(collateralAmount);
            const addCollateralHealth = await oneWayMarket.addCollateralHealth(collateralAmount, false);

            await oneWayMarket.addCollateral(collateralAmount);

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            const userPrices = await oneWayMarket.userPrices();
            const fullHealth = await oneWayMarket.userHealth();
            const health = await oneWayMarket.userHealth(false);

            assert.approximately(Number(addCollateralPrices[0]), Number(userPrices[0]), 1e-2, 'price 0');
            assert.approximately(Number(addCollateralPrices[1]), Number(userPrices[1]), 1e-2, 'price 1');
            assert.approximately(Number(addCollateralFullHealth), Number(fullHealth), 1e-2, 'full health');
            assert.approximately(Number(addCollateralHealth), Number(health), 1e-4, 'health');
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) - Number(collateralAmount), 'wallet collateral');
            assert.equal(Number(balances.borrowed), Number(initialBalances.borrowed), 'wallet borrowed');
            assert.equal(Number(state.collateral), Number(initialState.collateral) + Number(collateralAmount), 'state collateral');
            assert.approximately(Number(initialState.debt), Number(state.debt), 1e-4, 'state debt');
        });

        it('Remove collateral', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const initialState = await oneWayMarket.userState();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isTrue(loanExists);
            assert.isAbove(Number(initialState.collateral), 0);

            const maxRemovable = await oneWayMarket.maxRemovable();
            const collateralAmount = (Number(maxRemovable) / 2).toFixed(oneWayMarket.collateral_token.decimals);
            const removeCollateralPrices = await oneWayMarket.removeCollateralPrices(collateralAmount);
            const removeCollateralFullHealth = await oneWayMarket.removeCollateralHealth(collateralAmount);
            const removeCollateralHealth = await oneWayMarket.removeCollateralHealth(collateralAmount, false);

            await oneWayMarket.removeCollateral(collateralAmount);

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            const userPrices = await oneWayMarket.userPrices();
            const fullHealth = await oneWayMarket.userHealth();
            const health = await oneWayMarket.userHealth(false);

            assert.approximately(Number(removeCollateralPrices[0]), Number(userPrices[0]), 1e-2, 'price 0');
            assert.approximately(Number(removeCollateralPrices[1]), Number(userPrices[1]), 1e-2, 'price 1');
            assert.approximately(Number(removeCollateralFullHealth), Number(fullHealth), 1e-2, 'full health');
            assert.approximately(Number(removeCollateralHealth), Number(health), 1e-4, 'health');
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) + Number(collateralAmount), 'wallet collateral');
            assert.equal(Number(balances.borrowed), Number(initialBalances.borrowed), 'wallet borrowed');
            assert.equal(state.collateral, BN(initialState.collateral).minus(BN(collateralAmount)).toString(), 'state collateral');
            assert.approximately(Number(initialState.debt), Number(state.debt), 1e-4, 'state debt');
        });

        it('Partial repay', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const initialState = await oneWayMarket.userState();
            const loanExists = await oneWayMarket.userLoanExists();
            const debtAmount = (Number(initialState.debt) / 4).toFixed(18);

            assert.isTrue(loanExists);
            assert.isAtLeast(Number(initialBalances.borrowed), Number(debtAmount));

            const repayPrices = await oneWayMarket.repayPrices(debtAmount);
            const repayFullHealth = await oneWayMarket.repayHealth(debtAmount);
            const repayHealth = await oneWayMarket.repayHealth(debtAmount, false);

            await oneWayMarket.repay(debtAmount);

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();
            const userPrices = await oneWayMarket.userPrices();
            const fullHealth = await oneWayMarket.userHealth();
            const health = await oneWayMarket.userHealth(false);

            assert.approximately(Number(repayPrices[0]), Number(userPrices[0]), 1e-2, 'price 0');
            assert.approximately(Number(repayPrices[1]), Number(userPrices[1]), 1e-2, 'price 1');
            assert.approximately(Number(repayFullHealth), Number(fullHealth), 1e-2, 'full health');
            assert.approximately(Number(repayHealth), Number(health), 1e-4, 'health');
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral), 'wallet collateral');
            assert.equal(balances.borrowed, BN(initialBalances.borrowed).minus(BN(debtAmount)).toString(), 'wallet borrowed');
            assert.equal(Number(state.collateral), Number(initialState.collateral), 'state collateral');
            assert.equal(Number(state.borrowed), Number(initialState.borrowed), 'state borrowed');
            assert.approximately(Number(state.debt), Number(initialState.debt) - Number(debtAmount), 1e-4, 'state debt');
        });

        it('Full repay', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const initialState = await oneWayMarket.userState();
            const loanExists = await oneWayMarket.userLoanExists();

            assert.isTrue(loanExists);
            assert.isAtLeast(Number(initialBalances.borrowed), Number(initialState.debt));

            await oneWayMarket.fullRepay();

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();


            assert.approximately(Number(balances.collateral), Number(initialBalances.collateral) + Number(initialState.collateral), 10**(-oneWayMarket.collateral_token.decimals), 'wallet collateral');
            assert.approximately(Number(balances.borrowed), Number(initialBalances.borrowed) - Number(initialState.debt), 1e-3, 'wallet borrowed');
            assert.equal(Number(state.collateral), 0, 'state collateral');
            assert.equal(Number(state.borrowed), 0, 'state borrowed');
            assert.equal(Number(state.debt), 0, 'state debt');
        });
    })
}

describe('General test', async function () {
    this.timeout(120000);

    before(async function () {
        await lending.init('JsonRpc', {},{ gasPrice: 0 });
        await lending.oneWayfactory.fetchMarkets();
    });

    for (const oneWayMarketId of ONE_WAY_MARKETS) {
        generalTest(oneWayMarketId);
    }
})
