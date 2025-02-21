import { assert } from "chai";
import lending from "../src/index.js";
import { getOneWayMarket, OneWayMarketTemplate } from "../src/markets/index.js";
import { BN } from "../src/utils.js";


const ONE_WAY_MARKETS = ['one-way-market-1'];

const vaultTest = (id: string) => {
    describe(`${id} vault test`, function () {
        let oneWayMarket: OneWayMarketTemplate;

        before(async function () {
            oneWayMarket = getOneWayMarket(id);
            const maxRedeem = await oneWayMarket.vault.maxRedeem();
            await oneWayMarket.vault.redeem(maxRedeem);
        });

        it("deposit", async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const depositAmount = Number(await oneWayMarket.vault.maxDeposit()) / 2;
            const expectedShares = await oneWayMarket.vault.previewDeposit(depositAmount);

            await oneWayMarket.vault.deposit(depositAmount);

            const balances = await oneWayMarket.wallet.balances();

            assert.deepStrictEqual(BN(balances.borrowed).toString(), BN(initialBalances.borrowed).minus(depositAmount).toString(), 'assets');
            const delta = Number(balances.vaultShares) - (Number(initialBalances.vaultShares) + Number(expectedShares));
            assert.isAtMost(Math.abs(delta) / Number(balances.vaultShares), 1e-7, 'shares');
        });

        it("mint", async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const mintAmount = Number(await oneWayMarket.vault.maxMint()) / 2;
            const expectedAssets = await oneWayMarket.vault.previewMint(mintAmount);

            await oneWayMarket.vault.mint(mintAmount);

            const balances = await oneWayMarket.wallet.balances();

            const delta = Number(balances.borrowed) - (Number(initialBalances.borrowed) - Number(expectedAssets));
            assert.isAtMost(Math.abs(delta) / Number(balances.borrowed), 1e-10, 'assets');
            assert.deepStrictEqual(BN(balances.vaultShares).toString(), BN(initialBalances.vaultShares).plus(mintAmount).toString(), 'shares');
        });

        it("stake", async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const stakeAmount = Number(initialBalances.vaultShares) / 2;

            await oneWayMarket.vault.stake(stakeAmount);

            const balances = await oneWayMarket.wallet.balances();

            assert.deepStrictEqual(balances.gauge, String(stakeAmount), 'gauge balance');
            assert.deepStrictEqual(BN(balances.vaultShares), BN(initialBalances.vaultShares).minus(stakeAmount), 'wallet balance');
        });

        it("unstake", async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const unstakeAmount = initialBalances.gauge;

            await oneWayMarket.vault.unstake(unstakeAmount);

            const balances = await oneWayMarket.wallet.balances();

            assert.deepStrictEqual(balances.gauge, "0.0", 'gauge balance');
            assert.deepStrictEqual(BN(balances.vaultShares), BN(initialBalances.vaultShares).plus(unstakeAmount), 'wallet balance');
        });

        it("withdraw", async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const withdrawAmount = Number(await oneWayMarket.vault.maxWithdraw()) / 2;
            const expectedShares = await oneWayMarket.vault.previewWithdraw(withdrawAmount);

            await oneWayMarket.vault.withdraw(withdrawAmount);

            const balances = await oneWayMarket.wallet.balances();

            assert.deepStrictEqual(BN(balances.borrowed).toString(), BN(initialBalances.borrowed).plus(BN(withdrawAmount)).toString(), 'assets');
            const delta = Number(balances.vaultShares) - (Number(initialBalances.vaultShares) - Number(expectedShares));
            assert.isAtMost(Math.abs(delta) / Number(balances.vaultShares), 1e-8, 'shares');
        });

        it("redeem", async function () {
            const initialBalances = await oneWayMarket.wallet.balances();
            const redeemAmount = await oneWayMarket.vault.maxRedeem();
            const expectedAssets = await oneWayMarket.vault.previewRedeem(redeemAmount);

            await oneWayMarket.vault.redeem(redeemAmount);

            const balances = await oneWayMarket.wallet.balances();

            const delta = Number(balances.borrowed) - (Number(initialBalances.borrowed) + Number(expectedAssets));
            assert.isAtMost(Math.abs(delta) / Number(balances.borrowed), 1e-10, 'assets');
            assert.deepStrictEqual(BN(balances.vaultShares).toString(), BN(initialBalances.vaultShares).minus(redeemAmount).toString(), 'shares');
        });
    });
}

describe('Vault test', async function () {
    this.timeout(120000);

    before(async function () {
        await lending.init('JsonRpc', {},{ gasPrice: 0 });
        await lending.oneWayfactory.fetchMarkets();
    });

    for (const oneWayMarketId of ONE_WAY_MARKETS) {
        vaultTest(oneWayMarketId);
    }
})
