import { assert } from "chai";
import llamalend from "../src/index.js";
import { BN } from "../src/utils.js";


describe('st-crvUSD test', async function () {
    this.timeout(120000);

    before(async function () {
        await llamalend.init('JsonRpc', {},{ gasPrice: 0 });
    });

    it("deposit", async function () {
        const initialBalances = await llamalend.st_crvUSD.userBalances();
        const depositAmount = Number(await llamalend.st_crvUSD.maxDeposit()) / 2;
        const expectedShares = await llamalend.st_crvUSD.previewDeposit(depositAmount);

        await llamalend.st_crvUSD.deposit(depositAmount);

        const balances = await llamalend.st_crvUSD.userBalances();

        assert.deepStrictEqual(BN(balances.crvUSD).toString(), BN(initialBalances.crvUSD).minus(depositAmount).toString(), 'assets');
        const delta = Number(balances.st_crvUSD) - (Number(initialBalances.st_crvUSD) + Number(expectedShares));
        assert.isAtMost(Math.abs(delta) / Number(balances.st_crvUSD), 1e-7, 'shares');
    });

    it("mint", async function () {
        const initialBalances = await llamalend.st_crvUSD.userBalances();
        const mintAmount = Number(await llamalend.st_crvUSD.maxMint()) / 2;
        const expectedAssets = await llamalend.st_crvUSD.previewMint(mintAmount);

        await llamalend.st_crvUSD.mint(mintAmount);

        const balances = await llamalend.st_crvUSD.userBalances();

        const delta = Number(balances.crvUSD) - (Number(initialBalances.crvUSD) - Number(expectedAssets));
        assert.isAtMost(Math.abs(delta) / Number(balances.crvUSD), 1e-10, 'assets');
        assert.deepStrictEqual(BN(balances.st_crvUSD).toString(), BN(initialBalances.st_crvUSD).plus(mintAmount).toString(), 'shares');
    });

    it("withdraw", async function () {
        const initialBalances = await llamalend.st_crvUSD.userBalances();
        const withdrawAmount = Number(await llamalend.st_crvUSD.maxWithdraw()) / 2;
        const expectedShares = await llamalend.st_crvUSD.previewWithdraw(withdrawAmount);

        await llamalend.st_crvUSD.withdraw(withdrawAmount);

        const balances = await llamalend.st_crvUSD.userBalances();

        assert.deepStrictEqual(BN(balances.crvUSD).toString(), BN(initialBalances.crvUSD).plus(BN(withdrawAmount)).toString(), 'assets');
        const delta = Number(balances.st_crvUSD) - (Number(initialBalances.st_crvUSD) - Number(expectedShares));
        assert.isAtMost(Math.abs(delta) / Number(balances.st_crvUSD), 1e-8, 'shares');
    });

    it("redeem", async function () {
        const initialBalances = await llamalend.st_crvUSD.userBalances();
        const redeemAmount = await llamalend.st_crvUSD.maxRedeem();
        const expectedAssets = await llamalend.st_crvUSD.previewRedeem(redeemAmount);

        await llamalend.st_crvUSD.redeem(redeemAmount);

        const balances = await llamalend.st_crvUSD.userBalances();

        const delta = Number(balances.crvUSD) - (Number(initialBalances.crvUSD) + Number(expectedAssets));
        assert.isAtMost(Math.abs(delta) / Number(balances.crvUSD), 1e-10, 'assets');
        assert.deepStrictEqual(BN(balances.st_crvUSD).toString(), BN(initialBalances.st_crvUSD).minus(redeemAmount).toString(), 'shares');
    });
})
