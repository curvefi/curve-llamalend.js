import { assert } from "chai";
import lending from "../src/index.js";
import { getOneWayMarket, OneWayMarketTemplate } from "../src/markets/index.js";
import { BN } from "../src/utils.js";

const ONE_WAY_MARKETS = ['one-way-market-0'];

const swapTest = (id: string) => {
    let oneWayMarket: OneWayMarketTemplate;
    let maxDebt: string;

    before(async function () {
        oneWayMarket = getOneWayMarket(id);
        const depositAmount = Number(await oneWayMarket.vault.maxDeposit()) * 0.05;
        await oneWayMarket.vault.deposit(depositAmount);
        maxDebt = await oneWayMarket.createLoanMaxRecv(0.3, 10);
        await oneWayMarket.createLoan(0.3, maxDebt, 10)
    });

    after(async function () {
        await oneWayMarket.fullRepay();
    });


    describe(`${id} one-way-market swap test`, function () {
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                if (i === j) continue;

                it(`${i} --> ${j}`, async function () {
                    const initialBalancesObj = await oneWayMarket.wallet.balances();
                    const initialBalances = [initialBalancesObj.borrowed, initialBalancesObj.collateral];
                    const swapAmount = i === 0 ? Number(maxDebt) / 10 : 0.003;
                    const expected = Number(await oneWayMarket.swapExpected(i, j, swapAmount));

                    await oneWayMarket.swap(i, j, swapAmount, 0.05);

                    const balancesObj = await oneWayMarket.wallet.balances();
                    const balances = [balancesObj.borrowed, balancesObj.collateral];
                    const out = Number(balances[j]) - Number(initialBalances[j]);

                    assert.deepStrictEqual(BN(balances[i]).toString(), BN(initialBalances[i]).minus(BN(swapAmount)).toString(), 'in');
                    assert.isAtMost(Math.abs(out - expected) / expected, 5 * 1e-3, 'out');
                });
            }
        }
    });
}

describe('Swap test', async function () {
    this.timeout(120000);

    before(async function () {
        await lending.init('JsonRpc', {},{ gasPrice: 0 });
        await lending.oneWayfactory.fetchMarkets();
    });

    for (const oneWayMarketId of ONE_WAY_MARKETS) {
        swapTest(oneWayMarketId);
    }
})

