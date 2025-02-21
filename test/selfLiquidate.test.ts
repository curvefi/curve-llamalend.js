import { assert } from "chai";
import lending from "../src/index.js";
import { getOneWayMarket, OneWayMarketTemplate } from "../src/markets/index.js";

const ONE_WAY_MARKETS = ['one-way-market-0'];

const selfLiquidationTest = (id: string) => {
    describe(`${id} self-liquidation test`, function () {
        let oneWayMarket: OneWayMarketTemplate;

        before(async function () {
            oneWayMarket = getOneWayMarket(id);
            const maxDeposit = Number(await oneWayMarket.vault.maxDeposit()) * 0.05;
            await oneWayMarket.vault.deposit(maxDeposit);
            const maxDebt = await oneWayMarket.createLoanMaxRecv(0.3, 10);
            await oneWayMarket.createLoan(0.3, maxDebt, 10);
            await oneWayMarket.swap(0, 1, Number(maxDebt), 0.05);
        });

        it('Self-liquidations', async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const initialState = await oneWayMarket.userState();
            const initialTokensToLiquidate = await oneWayMarket.tokensToLiquidate();

            assert.isAbove(Number(initialState.collateral), 0, "initial state collateral");
            assert.isAbove(Number(initialState.borrowed), 0, "initial state borrowed");
            assert.isAbove(Number(initialState.debt), 0, "initial state");
            assert.isAtLeast(Number(initialBalances.borrowed), Number(initialTokensToLiquidate));

            await oneWayMarket.selfLiquidate(0.1);

            const balances = await oneWayMarket.wallet.balances();
            const state = await oneWayMarket.userState();

            const tokensToLiquidate = await oneWayMarket.tokensToLiquidate();
            assert.equal(Number(tokensToLiquidate), 0, 'tokens to liquidate');
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) + Number(initialState.collateral), 'wallet collateral');
            assert.approximately(Number(balances.borrowed), Number(initialBalances.borrowed) - Number(initialTokensToLiquidate), 1e-4, 'wallet stablecoin');
            assert.equal(Number(state.collateral), 0, 'state callateral');
            assert.equal(Number(state.borrowed), 0, 'state stablecoin');
            assert.equal(Number(state.debt), 0, 'state debt');
        });
    })
}

describe('Self-liquidation test', async function () {
    this.timeout(120000);

    before(async function () {
        await lending.init('JsonRpc', {},{ gasPrice: 0 });
        await lending.oneWayfactory.fetchMarkets();
    });

    for (const oneWayMarketId of ONE_WAY_MARKETS) {
        selfLiquidationTest(oneWayMarketId);
    }
})
