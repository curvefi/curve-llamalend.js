# CURVE LENDING JS

## Setup

Install from npm:

`npm install @curvefi/lending-api`

## Init
```ts
import lending from "@curvefi/lending-api";

(async () => {
    // 1. Dev
    await lending.init('JsonRpc', {url: 'http://localhost:8545/', privateKey: ''}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0, chainId: 1 });
    // OR
    await lending.init('JsonRpc', {}, {}); // In this case JsonRpc url, privateKey, fee data and chainId will be specified automatically

    // 2. Infura
    lending.init("Infura", { network: "homestead", apiKey: <INFURA_KEY> }, { chainId: 1 });
    
    // 3. Web3 provider
    lending.init('Web3', { externalProvider: <WEB3_PROVIDER> }, { chainId: 1 });
})()
```
**Note 1.** ```chainId``` parameter is optional, but you must specify it in the case you use Metamask on localhost network, because Metamask has that [bug](https://hardhat.org/metamask-issue.html)

**Note 2.** Web3 init requires the address. Therefore, it can be initialized only after receiving the address.

**Wrong ❌️**
```tsx
import type { FunctionComponent } from 'react'
import { useState, useMemo } from 'react'
import { providers } from 'ethers'
import Onboard from 'bnc-onboard'
import type { Wallet } from 'bnc-onboard/dist/src/interfaces'
import lending from '@curvefi/lending-api'

    ...

const WalletProvider: FunctionComponent = ({ children }) => {
    const [wallet, setWallet] = useState<Wallet>()
    const [provider, setProvider] = useState<providers.Web3Provider>()
    const [address, setAddress] = useState<string>()

    const networkId = 1

    const onboard = useMemo(
        () =>
            Onboard({
                dappId: DAPP_ID,
                networkId,

                subscriptions: {
                    address: (address) => {
                        setAddress(address)
                    },

                    wallet: (wallet) => {
                        setWallet(wallet)
                        if (wallet.provider) {
                            lending.init("Web3", { externalProvider: wallet.provider }, { chainId: networkId })
                        }
                    },
                },
                walletSelect: {
                    wallets: wallets,
                },
            }),
        []
    )

    ...
```

**Right ✔️**
```tsx
import type { FunctionComponent } from 'react'
import { useState, useMemo, useEffect } from 'react'
import { providers } from 'ethers'
import Onboard from 'bnc-onboard'
import type { Wallet } from 'bnc-onboard/dist/src/interfaces'
import lending from '@curvefi/lending-api'

    ...

const WalletProvider: FunctionComponent = ({ children }) => {
    const [wallet, setWallet] = useState<Wallet>()
    const [provider, setProvider] = useState<providers.Web3Provider>()
    const [address, setAddress] = useState<string>()

    const networkId = 1

    const onboard = useMemo(
        () =>
            Onboard({
                dappId: DAPP_ID,
                networkId,

                subscriptions: {
                    address: (address) => {
                        setAddress(address)
                    },

                    wallet: (wallet) => {
                        setWallet(wallet)
                    },
                },
                walletSelect: {
                    wallets: wallets,
                },
            }),
        []
    )

    useEffect(() => {
        if (address && wallet?.provider) {
            lending.init("Web3", { externalProvider: wallet.provider }, { chainId: networkId })
        }
    }, [address, wallet?.provider]);

    ...
```

## Notes
- 1 Amounts can be passed in args either as numbers or strings.
- 2 oneWayMarket.swap**PriceImpact** method returns %, e. g. 0 < priceImpact <= 100.
- 3 Slippage arg should be passed as %, e. g. 0 < slippage <= 100.



## General methods
```ts
import lending from "@curvefi/lending-api";

(async () => {
    await lending.init('JsonRpc', {});

    const balances1 = await lending.getBalances(['sdt', 'weth']);
    // OR const balances1 = await lending.getBalances(['0x361a5a4993493ce00f61c32d4ecca5512b82ce90', '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619']);
    //['80980.0', '99.0']

    // You can specify address
    const balances2 = await lending.getBalances(['sdt', 'weth'], "0x0063046686E46Dc6F15918b61AE2B121458534a5");
    // OR const balances2 = await lending.getBalances(['0x361a5a4993493ce00f61c32d4ecca5512b82ce90', '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'], '0x0063046686E46Dc6F15918b61AE2B121458534a5');
    //['0.0', '0.0']

    const spender = "0x136e783846ef68C8Bd00a3369F787dF8d683a696"

    await lending.getAllowance(['sdt', 'weth'], lending.signerAddress, spender);
    //['0.0', '0.0']
    await lending.hasAllowance(['sdt', 'weth'], ['1000', '1000'], lending.signerAddress, spender);
    //false
    await lending.ensureAllowance(['sdt', 'weth'], ['1000', '1000'], spender);
    //['0xab21975af93c403fff91ac50e3e0df6a55b59c3003b34e9900821f5fa19e5454', '0xb6e10a2975adbde7dfb4263c0957dcce6c28cbe7a862f285bb4bda43cca8d62d']

    await lending.getUsdRate('0x7ceb23fd6bc0add59e62ac25578270cff1b9f619');
    //2637.61
})()
```

## oneWayMarket

### oneWayMarket fields
```ts
import lending from "@curvefi/lending-api";

(async () => {
    await lending.init('JsonRpc', {});

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');

    oneWayMarket.id
    // "one-way-market-0"
    oneWayMarket.name
    // "market-0"
    oneWayMarket.addresses
    // {
    //     amm: "0x78f7f91dce40269df106a189e47f27bab561332b"
    //     borrowed_token: "0x361a5a4993493ce00f61c32d4ecca5512b82ce90"
    //     collateral_token: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
    //     controller: "0xe27dda8e706f41ca0b496e6cf1b7f1e8308e6732"
    //     gauge: "0x0000000000000000000000000000000000000000"
    //     monetary_policy: "0xa845d0688745db0f377a6c5bf5fcde0a3a1a6aeb"
    //     vault: "0x42526886adb3b20a23a5a19c04e4bf81e9febb2b"
    // }
    oneWayMarket.borrowed_token
    // {
    //     address: "0x361a5a4993493ce00f61c32d4ecca5512b82ce90"
    //     decimals: 18
    //     name: "Stake DAO Token (PoS)"
    //     symbol: "SDT"
    // }
    oneWayMarket.collateral_token
    // {
    //     address: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
    //     decimals: 18
    //     name: "Wrapped Ether"
    //     symbol: "WETH"
    // }
    oneWayMarket.coinAddresses
    // ["0x361a5a4993493ce00f61c32d4ecca5512b82ce90", "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"]
    oneWayMarket.coinDecimals
    // [18,18]
    oneWayMarket.defaultBands
    // 10
    oneWayMarket.maxBands
    // 50
    oneWayMarket.minBands
    // 4
})()
````

### Wallet balances for oneWayMarket
```ts
import lending from "@curvefi/lending-api";

(async () => {
    await lending.init('JsonRpc', {});
    await lending.oneWayfactory.fetchMarkets();

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');

    // 1. Current address (signer) balances
    console.log(await oneWayMarket.wallet.balances());
    //
    {
        borrowed: "100000.0"
        collateral: "100.0"
        vaultShares: "0.0"
    }
    //

    // 2. You can specify the address
    console.log(await oneWayMarket.wallet.balances("0x0063046686E46Dc6F15918b61AE2B121458534a5"));
    //
    {
        borrowed: "0.0"
        collateral: "0.0"
        vaultShares: "0.0"
    }
    //
})()
```

### Stats
```ts
import lending from "@curvefi/lending-api";

(async () => {
    await lending.init('JsonRpc', {});

    await lending.oneWayfactory.fetchMarkets();

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');

    await oneWayMarket.stats.parameters();
    // {
    //     A: "100"
    //     admin_fee: "0.0"
    //     base_price: "8595.062092132517715849"
    //     fee: "0.6"
    //     liquidation_discount: "6.0"
    //     loan_discount: "9.0"
    // }
    await oneWayMarket.stats.rates();
    // {
    //     borrowApr: '17.8208613727056',
    //     lendApr: '13.829407727114368717',
    //     borrowApy: '19.507460419926105',
    //     lendApy: '15.138248271258824725'
    // }
    await oneWayMarket.stats.futureRates(10000, 0);  // dReserves = 10000, dDebt = 0
    // {
    //     borrowApr: '14.7869386793856',
    //     lendApr: '10.875115183120530145',
    //     borrowApy: '15.936145855611583',
    //     lendApy: '11.720304351866410822'
    // }
    await oneWayMarket.stats.futureRates(0, 10000);  // dReserves = 0, dDebt = 10000
    // {
    //     borrowApr: '22.979565109512',
    //     lendApr: '19.100290524367724358',
    //     borrowApy: '25.834284267258045',
    //     lendApy: '21.473092838884015799'
    // }
    await oneWayMarket.stats.balances();
    const { activeBand, maxBand, minBand, liquidationBand } = await oneWayMarket.stats.bandsInfo();
    // { activeBand: 0, maxBand: 15, minBand: 0, liquidationBand: null }
    await oneWayMarket.stats.bandBalances(liquidatingBand ?? 0);
    // {
    //     borrowed: "0.0"
    //     collateral: "0.0"
    // }
    await oneWayMarket.stats.bandsBalances();
    // {
    //     '0': { borrowed: '0.0', collateral: '0.0' },
    //     '1': { borrowed: '0.0', collateral: '0.0' },
    //     '2': { borrowed: '0.0', collateral: '0.0' },
    //     '3': { borrowed: '0.0', collateral: '0.0' },
    //     '4': { borrowed: '0.0', collateral: '0.0' },
    //     '5': { borrowed: '0.0', collateral: '0.0' },
    //     '6': { borrowed: '0.0', collateral: '0.0' },
    //     '7': { borrowed: '0.0', collateral: '0.0' },
    //     '8': { borrowed: '0.0', collateral: '0.0' },
    //     '9': { borrowed: '0.0', collateral: '0.0' },
    //     '10': { borrowed: '0.0', collateral: '0.0' },
    //     '11': { borrowed: '0.0', collateral: '0.0' },
    //     '12': { borrowed: '0.0', collateral: '0.1' },
    //     '13': { borrowed: '0.0', collateral: '0.1' },
    //     '14': { borrowed: '0.0', collateral: '0.1' },
    //     '15': { borrowed: '0.0', collateral: '0.1' }
    // }
    await oneWayMarket.stats.totalDebt();
    // 1000.0
    await oneWayMarket.stats.ammBalances();
    // {
    //     borrowed: "0"
    //     collateral: "0"
    // }
    await oneWayMarket.stats.capAndAvailable();
    // {
    //     available: "0.0"
    //     cap: "0.0"
    // }
})()
````


### Vault: deposit, mint, stake, unstake, withdraw, redeem
```ts
    await lending.init('JsonRpc', {});
    await lending.oneWayfactory.fetchMarkets();

    const oneWayMarket = lending.getOneWayMarket('one-way-market-1');
    
    
    await oneWayMarket.wallet.balances();
    // {
    //     collateral: '100000.0',
    //     borrowed: '1000000.0',
    //     vaultShares: '0.0',
    //     gauge: '0.0'
    // }
    
    // ------------ DEPOSIT ------------

    await oneWayMarket.vault.maxDeposit();
    // 1000000.0
    await oneWayMarket.vault.previewDeposit(20000);  // Shares to receive
    // 19957279.880161894212096572
    await oneWayMarket.vault.depositIsApproved(20000);
    // false
    await oneWayMarket.vault.depositApprove(20000);
    // [
    //     '0xb4a9da37381d6a7b36d89c977c6974d6f7d0aa7b82564b7bdef7b06b2fbd58ae'
    // ]
    await oneWayMarket.vault.deposit(20000);
    // 0x2670db285b6ac1d1e4fc63455554303b583ea0278ee7d75624be4573e018aa2e

    await oneWayMarket.wallet.balances();
    // {
    //     collateral: '100000.0',
    //     borrowed: '980000.0',
    //     vaultShares: '19957272.526619469933528807',
    //     gauge: '0.0'
    // }

    // ------------ MINT ------------

    await oneWayMarket.vault.maxMint();
    // 977906353.804354026742911543
    await oneWayMarket.vault.previewMint(20000);  // Assets to send
    // 20.042818950659253842
    await oneWayMarket.vault.mintIsApproved(20000);
    // true
    await oneWayMarket.vault.mintApprove(20000);
    // []
    await oneWayMarket.vault.mint(20000);
    // 0x9e34e201edaeacd27cb3013e003d415c110f562ad105e587f7c8fb0c3b974142

    let balances = await oneWayMarket.wallet.balances();
    // {
    //     collateral: '100000.0',
    //     borrowed: '979979.95718098845915171',
    //     vaultShares: '19977272.526619469933528807',
    //     gauge: '0.0'
    // }

    // ------------ UTILS ------------

    await oneWayMarket.vault.convertToAssets(100000);
    // 100.0
    await oneWayMarket.vault.convertToShares(100);
    // 100000.0

    // ------------ STAKE ------------

    await oneWayMarket.vault.stakeIsApproved(balances.vaultShares);
    // false
    await oneWayMarket.vault.stakeApprove(balances.vaultShares);
    // [
    //     '0xf3009825dfed3352d99b7d45b72d99b9a9b1773fae2abeabdb39d9880a3266d6'
    // ]
    await oneWayMarket.vault.stake(balances.vaultShares);
    // 0x3572dfa980b98091061df4b27ea8f05dee8b49384cc781dbcd7b8cf099610426
    balances = await oneWayMarket.wallet.balances();
    // {
    //     collateral: '100000.0',
    //     borrowed: '979979.95718098845915171',
    //     vaultShares: '0.0',
    //     gauge: '19977272.526619469933528807'
    // }

    // ------------ UNSTAKE ------------

    await oneWayMarket.vault.unstake(balances.gauge);
    // 0x30216703c444705598b10b3b510d05a19b44ad84699d8e2f3f0198a4573def99

    await oneWayMarket.wallet.balances();
    // {
    //     collateral: '100000.0',
    //     borrowed: '979979.95718098845915171',
    //     vaultShares: '19977272.526619469933528807',
    //     gauge: '0.0'
    // }

    // ------------ WITHDRAW ------------

    await oneWayMarket.vault.maxWithdraw();
    // 20020.043244481699203505
    await oneWayMarket.vault.previewWithdraw(10000);  // Shares to send
    // 9978636.051211318667087166
    await oneWayMarket.vault.withdraw(10000);
    //0xa8df19e420040dc21e60f1a25eedec01fead748e2d654100ca3e2d0e369a7ae0

    await oneWayMarket.wallet.balances();
    // {
    //     collateral: '100000.0',
    //     borrowed: '989979.95718098845915171',
    //     vaultShares: '9998636.505706074967248914',
    //     gauge: '0.0'
    // }

    // ------------ REDEEM ------------

    await oneWayMarket.vault.maxRedeem();
    // 9998636.505706074967248914
    await oneWayMarket.vault.previewRedeem(10000);  // Assets to receive
    // 10.021409718764999588
    await oneWayMarket.vault.redeem(10000);
    // 0x391721baa517170c23819b070532a3429ab3c7a306042615bf8e1983d035e363

    await oneWayMarket.wallet.balances();
    // {
    //     collateral: '100000.0',
    //     borrowed: '989989.978590745251091246',
    //     vaultShares: '9988636.505706074967248914',
    //     gauge: '0.0'
    // }

    // ------------ REWARDS ------------

    oneWayMarket.vault.rewardsOnly();
    // false
    await oneWayMarket.vault.totalLiquidity();
    // 180638.919172
    await oneWayMarket.vault.crvApr();
    // [0, 0]
    await oneWayMarket.vault.rewardTokens();
    // []
    await oneWayMarket.vault.rewardsApr();
    // []
    await oneWayMarket.vault.claimableCrv();
    // 0.0
    await oneWayMarket.vault.claimCrv();
    // 0x8325bada809340d681c165ffc5bac0ba490f8350872b5d0aa82f3fe6c01205aa
    await oneWayMarket.vault.claimableRewards();
    // []
    await oneWayMarket.vault.claimRewards();
    // 0xb0906c3a2dea66d1ab6f280833f7205f46af7374f8cf9baa5429f881094140ba
````

### Create loan, add collateral, borrow more, repay
```ts
(async () => {
    await lending.init('JsonRpc', {});

    await lending.oneWayfactory.fetchMarkets();

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');
    
    
    // --- CREATE LOAN ---

    await oneWayMarket.oraclePrice();
    // 3000.0
    await oneWayMarket.price();
    // 3045.569137149127502965
    await oneWayMarket.basePrice();
    // '3000.0'
    await oneWayMarket.wallet.balances();
    // { borrowed: '0.0', collateral: '1.0' }
    await oneWayMarket.createLoanMaxRecv(0.5, 5);
    // 1375.74670276529114147
    await oneWayMarket.createLoanBands(0.5, 1000, 5);
    // [ 36, 32 ]
    await oneWayMarket.createLoanPrices(0.5, 1000, 5);
    // [ '2068.347257607234777', '2174.941007873561634' ]
    await oneWayMarket.createLoanHealth(0.5, 1000, 5);  // FULL
    // 45.191203147616155
    await oneWayMarket.createLoanHealth(0.5, 1000, 5, false);  // NOT FULL
    // 3.9382535412942367
    
    await oneWayMarket.createLoanIsApproved(0.5);
    // false
    await oneWayMarketa.createLoanApprove(0.5);
    // [
    //     '0xc111e471715ae6f5437e12d3b94868a5b6542cd7304efca18b5782d315760ae5'
    // ]
    await oneWayMarket.createLoan(0.5, 1000, 5);

    console.log(await oneWayMarket.userLoanExists());
    //true
    console.log(await oneWayMarket.userState());
    //
    {
        N: "5"
        borrowed: "0.0"
        collateral: "1.0"
        debt: "1000.0"
    }
    //
    console.log(await oneWayMarket.userHealth());  // FULL
    //722.5902543890457276
    console.log(await oneWayMarket.userHealth(false));  // NOT FULL
    //3.4708541149110123
    console.log(await oneWayMarket.userRange());
    //5
    console.log(await oneWayMarket.userBands());
    //[206,,202]
    console.log(await oneWayMarket.userPrices());
    //["1073.332550295331639435","1128.647508360591547283]
    console.log(await oneWayMarket.userBandsBalances());
    //
    // {
    //     202: {collateral: '0.2', borrowed: '0.0'},
    //     203: {collateral: '0.2', borrowed: '0.0'},
    //     204: {collateral: '0.2', borrowed: '0.0'},
    //     205: {collateral: '0.2', borrowed: '0.0'},
    //     206: {collateral: '0.2', borrowed: '0.0'},
    // }
    //
    

    // --- BORROW MORE ---

    await oneWayMarket.borrowMoreMaxRecv(0.1);
    // 650.896043318349376298
    await oneWayMarket.borrowMoreBands(0.1, 500);
    // [ 14, 10 ]
    await oneWayMarket.borrowMorePrices(0.1, 500);
    // [ '2580.175063923865968', '2713.146225026413746' ]
    await oneWayMarket.borrowMoreHealth(0.1, 500);  // FULL
    // 15.200984677843693 %
    await oneWayMarket.borrowMoreHealth(0.1, 500, false);  // NOT FULL
    // 3.7268336789002429 %
    
    await oneWayMarket.borrowMoreIsApproved(0.1);
    // true
    await oneWayMarket.borrowMoreApprove(0.1);
    // []
    
    await oneWayMarket.borrowMore(0.1, 500);

    // Full health: 15.200984677843694 %
    // Not full health: 3.7268336789002439 %
    // Bands: [ 14, 10 ]
    // Prices: [ '2580.175063923865968', '2713.146225026413746' ]
    // State: { collateral: '0.6', borrowed: '0.0', debt: '1500.0' }

    // --- ADD COLLATERAL ---

    await oneWayMarket.addCollateralBands(0.2);
    // [ 43, 39 ]
    await oneWayMarket.addCollateralPrices(0.2);
    // [ '1927.834806254156043', '2027.187147180850842' ]
    await oneWayMarket.addCollateralHealth(0.2);  // FULL
    // 55.2190795613534006
    await oneWayMarket.addCollateralHealth(0.2, false);  // NOT FULL
    // 3.3357274109987789
    
    await oneWayMarket.addCollateralIsApproved(0.2);
    // true
    await oneWayMarket.addCollateralApprove(0.2);
    // []
    
    await oneWayMarket.addCollateral(0.2);  // OR await oneWayMarket.addCollateral(0.2, forAddress);

    // Full health: 55.2190795613534014 %
    // Not full health: 3.3357274109987797 %
    // Bands: [ 43, 39 ]
    // Prices: [ '1927.834806254156043', '2027.187147180850842' ]
    // State: { collateral: '0.8', borrowed: '0.0', debt: '1500.0' }

    // --- REMOVE COLLATERAL ---

    await oneWayMarket.maxRemovable()
    // 0.254841506439755199
    await oneWayMarket.removeCollateralBands(0.1);
    // [ 29, 25 ]
    await oneWayMarket.removeCollateralPrices(0.1);
    // [ '2219.101120164841944', '2333.46407819744091' ]
    await oneWayMarket.removeCollateralHealth(0.1);  // FULL
    // 35.1846612411492316
    await oneWayMarket.removeCollateralHealth(0.1, false);  // NOT FULL
    // 4.0796515570298074
    
    await oneWayMarket.removeCollateral(0.1);

    // Full health: 35.1846612411492326 %
    // Not full health: 4.0796515570298084 %
    // Bands: [ 29, 25 ]
    // Prices: [ '2219.101120164841944', '2333.46407819744091', ]
    // State: { collateral: '0.7', borrowed: '0.0', debt: '1500.0' }

    // --- REPAY ---

    await oneWayMarket.wallet.balances();
    // { borrowed: '1500.0', collateral: '0.3' }

    await oneWayMarket.repayBands(1000);
    // [ 139, 135 ]
    await oneWayMarket.repayPrices(1000);
    // [ '734.595897104762463', '772.453820291837448' ]
    await oneWayMarket.repayHealth(1000);  // FULL
    // 315.2178906180373138
    await oneWayMarket.repayHealth(1000, false);  // NOT FULL
    // 3.3614254588945566
    
    await oneWayMarket.repayIsApproved(1000);
    // true
    await oneWayMarket.repayApprove(1000);
    // []
    await oneWayMarket.repay(1000);

    // Full health: 315.2178906180373149 %
    // Not full health: 3.3614254588945577 %
    // Bands: [ 139, 135 ]
    // Prices: [ '734.595897104762463', '772.453820291837448' ]
    // State: { collateral: '0.7', borrowed: '0.0', debt: '500.0' }

    // --- FULL REPAY ---

    await oneWayMarket.fullRepayIsApproved();
    // true
    await oneWayMarket.fullRepayApprove();
    // []
    await oneWayMarket.fullRepay();

    // Loan exists: false
    // State: { collateral: '0.0', borrowed: '0.0', debt: '0.0' }
})()
```

### Create loan all ranges methods
```ts
    await lending.init('JsonRpc', {});

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');

    await oneWayMarket.createLoanMaxRecvAllRanges(1);
    // {
    //     '5': '2751.493405530582454486',
    //     '6': '2737.828112577888632315',
    //     '7': '2724.253615257658154585',
    //     '8': '2710.76923397831492797',
    //     '9': '2697.374294577689210021',
    //     '10': '2684.068128277815937982',
    //     '11': '2670.850071640120547429',
    //     '12': '2657.719466520988458715',
    //     '13': '2644.675660027714709155',
    //     '14': '2631.718004474831209682',
    //     '15': '2618.845857340807263461',
    //     '16': '2606.058581225120973696',
    //     '17': '2593.355543805697908653',
    //     '18': '2580.736117796713531552',
    //     '19': '2568.199680906757040338',
    //     '20': '2555.745615797352299399',
    //      
    //      ...
    //
    //     '50': '2217.556229455652339229'
    // }

    await oneWayMarket.createLoanBandsAllRanges(1, 2600);
    // {
    //     '5': [ 10, 6 ],
    //     '6': [ 11, 6 ],
    //     '7': [ 11, 5 ],
    //     '8': [ 12, 5 ],
    //     '9': [ 12, 4 ],
    //     '10': [ 13, 4 ],
    //     '11': [ 13, 3 ],
    //     '12': [ 14, 3 ],
    //     '13': [ 14, 2 ],
    //     '14': [ 15, 2 ],
    //     '15': [ 15, 1 ],
    //     '16': [ 16, 1 ],
    //     '17': null,
    //     '18': null,
    //     '19': null,
    //     '20': null,
    //
    //      ...
    //
    //     '50': null
    // }

    await oneWayMarket.createLoanPricesAllRanges(1, 2600);
    // {
    //     '5': [ '2686.01476277614933533', '2824.440448203' ],
    //     '6': [ '2659.154615148387841976', '2824.440448203' ],
    //     '7': [ '2659.154615148387841976', '2852.9701497' ],
    //     '8': [ '2632.563068996903963557', '2852.9701497' ],
    //     '9': [ '2632.563068996903963557', '2881.78803' ],
    //     '10': [ '2606.237438306934923921', '2881.78803' ],
    //     '11': [ '2606.237438306934923921', '2910.897' ],
    //     '12': [ '2580.175063923865574682', '2910.897' ],
    //     '13': [ '2580.175063923865574682', '2940.3' ],
    //     '14': [ '2554.373313284626918935', '2940.3' ],
    //     '15': [ '2554.373313284626918935', '2970' ],
    //     '16': [ '2528.829580151780649746', '2970' ],
    //     '17': null,
    //     '18': null,
    //     '19': null,
    //     '20': null,
    //
    //      ...
    //
    //     '50': null
    // }
```

### Swap
```ts
(async () => {
    await lending.init('JsonRpc', {});

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');

    await oneWayMarket.wallet.balances();
    // {
    //     borrowed: '301.533523886491869218',
    //     collateral: '0.860611976623971606'
    // }


    await oneWayMarket.maxSwappable(0, 1);
    // 380.672763174593107707
    await oneWayMarket.swapExpected(0, 1, 100);  // 100 - in_amount
    // 0.03679356627103543 (out_amount)
    await oneWayMarket.swapRequired(0, 1, 0.03679356627103543);  // 0.03679356627103543 - out_amount
    // 100.000000000000000558 (in_amount)
    await oneWayMarket.swapPriceImpact(0, 1, 100);
    // 0.170826
    await oneWayMarket.swapIsApproved(0, 100);
    // true
    await oneWayMarket.swapApprove(0, 100);
    // []
    await oneWayMarket.swap(0, 1, 100, 0.1);

    await oneWayMarket.wallet.balances();
    // {
    //     borrowed: '201.533523886491869218',
    //     collateral: '0.897405542895007036'
    // }
})()
```

### Self-liquidation
```ts
(async () => {
    await lending.init('JsonRpc', {});

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');

    // Wallet balances: {
    //     borrowed: '301.533523886491869218',
    //     collateral: '0.860611976623971606'
    // }
    // State: {
    //     collateral: '0.139388023376028394',
    //     borrowed: '2751.493405530582315609',
    //     debt: '3053.026929417074184827'
    // }
    
    await oneWayMarket.tokensToLiquidate();
    // 301.533523886491869218
    await oneWayMarket.selfLiquidateIsApproved();
    // true
    await oneWayMarket.selfLiquidateApprove();
    // []
    await oneWayMarket.selfLiquidate(0.1); // slippage = 0.1 %

    // Wallet balances: { borrowed: '0.0', collateral: '1.0' }
    // State: { collateral: '0.0', borrowed: '0.0', debt: '0.0' }
})()
```

### Liquidation
```ts
(async () => {
    await lending.init('JsonRpc', {});

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');
    const addressToLiquidate = "0x66aB6D9362d4F35596279692F0251Db635165871";

    await oneWayMarket.wallet.balances();
    // Liquidator wallet balances: {
    //     borrowed: '301.533523886491869218',
    //     collateral: '0.860611976623971606'
    // }
    await oneWayMarket.userState(addressToLiquidate);
    // State of the account we are goning to liquidate: {
    //     collateral: '0.139388023376028394',
    //     borrowed: '2751.493405530582315609',
    //     debt: '3053.026929417074184827'
    // }
    
    await oneWayMarket.currentLeverage()
    //0.94083266399502623316
    
    await oneWayMarket.currentPosition()
    // {
    //      currentPosition: "95777.510614373750083"
    //      deposited: "219533.5105208847"
    //      percentage: "-56.372259347958530763"
    // }
    
    await oneWayMarket.tokensToLiquidate(addressToLiquidate);
    // 301.533523886491869218
    await oneWayMarket.liquidateIsApproved();
    // true
    await oneWayMarket.liquidateApprove();
    // []
    await oneWayMarket.liquidate(addressToLiquidate, 0.1); // slippage = 0.1 %

    // Liquidator wallet balances: { borrowed: '0.0', collateral: '1.0' }
    // State of liquidated account: { collateral: '0.0', borrowed: '0.0', debt: '0.0' }
})()
```

### User loss
```ts
(async () => {
    await lending.init('JsonRpc', {});

    const oneWayMarket = lending.getoneWayMarket('sfrxeth');

    console.log(await oneWayMarket.userLoss("0x0063046686E46Dc6F15918b61AE2B121458534a5"));
    // {
    //     deposited_collateral: '929.933909709140155529',
    //     current_collateral_estimation: '883.035865972092328038',
    //     loss: '46.898043737047827491',
    //     loss_pct: '5.043158793049750311'
    // }
})()
```

### Leverage (createLoan, borrowMore, repay)
```ts
(async () => {
    await lending.init('JsonRpc', {}, {}, API_KEY_1INCH);
    await lending.oneWayfactory.fetchMarkets();

    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');
    console.log(oneWayMarket.collateral_token, oneWayMarket.borrowed_token);
    // {
    //     address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    //     decimals: 18,
    //     name: 'Wrapped Ether',
    //     symbol: 'WETH'
    // }
    //
    // {
    //     address: '0x498bf2b1e120fed3ad3d42ea2165e9b73f99c1e5',
    //     decimals: 18,
    //     name: 'Curve.Fi USD Stablecoin',
    //     symbol: 'crvUSD'
    // }
    console.log(await oneWayMarket.wallet.balances());
    // {
    //     collateral: '100.0',
    //     borrowed: '2000000.0',
    //     vaultShares: '0.0',
    //     gauge: '0'
    // }

    
    // - Create Loan -

    //        Creates leveraged position (userCollateral + collateralFromUserBorrowed + leverage_collateral)
    //                          ^
    //                          | 
    //        userCollateral    |        debt               debt + userBorrowed 
    // user      --->      controller    ---->    leverage_zap   ---->      router
    //           |              ^                  |   ^   ^                   |
    //           |              |__________________|   |   |___________________|
    //           |              leverageCollateral + collateralFromUserBorrowed
    //           |_____________________________________|                 
    //                        userBorrowed
    
    let userCollateral = 1;
    let userBorrowed = 1000;
    let debt = 2000;
    const range = 10;
    const slippage = 0.5; // %
    await oneWayMarket.leverage.maxLeverage(range);
    // 7.4728229145282742179
    await oneWayMarket.leverage.createLoanMaxRecv(userCollateral, userBorrowed, range);
    // {
    //     maxDebt: '26089.494406081862861214',
    //     maxTotalCollateral: '9.539182089833411347',
    //     userCollateral: '1',
    //     collateralFromUserBorrowed: '0.315221168834966496',
    //     collateralFromMaxDebt: '8.223960920998444851',
    //     maxLeverage: '7.25291100528992828612',
    //     avgPrice: '3172.3757757003568790858'
    // }
    await oneWayMarket.leverage.createLoanExpectedCollateral(userCollateral, userBorrowed, debt, slippage);
    // {
    //     totalCollateral: '1.946422996710829',
    //     userCollateral: '1.0',
    //     collateralFromUserBorrowed: '0.315474332236942984',
    //     collateralFromDebt: '0.630948664473886',
    //     leverage: '1.4796358613861877'
    //     avgPrice: '3169.8299919022623523421'
    // }
    await oneWayMarket.leverage.createLoanPriceImpact(userBorrowed, debt);
    // 0.08944411854377342 %
    await oneWayMarket.leverage.createLoanMaxRange(userCollateral, userBorrowed, debt);
    // 50
    await oneWayMarket.leverage.createLoanBands(userCollateral, userBorrowed, debt, range);
    // [ 76, 67 ]
    await oneWayMarket.leverage.createLoanPrices(userCollateral, userBorrowed, debt, range);
    // [ '1027.977701011670136614', '1187.061409925215211173' ]
    await oneWayMarket.leverage.createLoanHealth(userCollateral, userBorrowed, debt, range);
    // 195.8994783042570637
    await oneWayMarket.leverage.createLoanHealth(userCollateral, userBorrowed, debt, range, false);
    // 3.2780908310686365
    await oneWayMarket.leverage.createLoanIsApproved(userCollateral, userBorrowed);
    // false
    await oneWayMarket.leverage.createLoanApprove(userCollateral, userBorrowed);
    // [
    //     '0xd5491d9f1e9d8ac84b03867494e35b25efad151c597d2fa4211d7bf5d540c98e',
    //     '0x93565f37ec5be902a824714a30bddc25cf9cd9ed39b4c0e8de61fab44af5bc8c'
    // ]
    await oneWayMarket.leverage.createLoanRouteImage(userBorrowed, debt);
    // 'data:image/svg+xml;base64,PHN2ZyBpZD0ic2Fua2V5UGFyZW50U3ZnIiB4bWxucz...'

    
    // You must call oneWayMarket.leverage.createLoanExpectedCollateral() with the same args before
    await oneWayMarket.leverage.createLoan(userCollateral, userBorrowed, debt, range);
    // 0xeb1b7a92bcb02598f00dc8bbfe8fa3a554e7a2b1ca764e0ee45e2bf583edf731

    await oneWayMarket.wallet.balances();
    // {
    //     collateral: '99.0',
    //     borrowed: '599000.0',
    //     vaultShares: '1400000000.0',
    //     gauge: '0'
    // }
    await oneWayMarket.userState();
    // {
    //     collateral: '1.945616160868693648',
    //     borrowed: '0.0',
    //     debt: '2000.0',
    //     N: '10'
    // }
    await oneWayMarket.userBands();
    // [ 76, 67 ]
    await oneWayMarket.userPrices();
    // [ '1027.977718614028011906', '1187.061430251609195098' ]
    await oneWayMarket.userHealth();
    // 195.8372633833293605
    await oneWayMarket.userHealth(false);
    // 3.2518122092914609

    
    // - Borrow More -

    //        Updates leveraged position (dCollateral = userCollateral + collateralFromUserBorrowed + leverageCollateral)
    //                          ^
    //                          | 
    //        userCollateral    |        dDebt             dDebt + userBorrowed
    // user      --->      controller    ---->    leverage_zap   ---->      router
    //           |              ^                  |   ^   ^                   |
    //           |              |__________________|   |   |___________________|
    //           |              leverageCollateral + collateralFromUSerBorrowed
    //           |_____________________________________|                 
    //                        userBorrowed
    
    userCollateral = 2;
    userBorrowed = 2000;
    debt = 10000;
    await oneWayMarket.leverage.borrowMoreMaxRecv(userCollateral, userBorrowed);
    // {
    //     maxDebt: '76182.8497941193262889',
    //     maxTotalCollateral: '26.639775583730298462',
    //     userCollateral: '2',
    //     collateralFromUserBorrowed: '1.677318306610359627',
    //     collateralFromMaxDebt: '22.962457277119938834',
    //     avgPrice: '3172.55402418338331369083'
    // }
    await oneWayMarket.leverage.borrowMoreExpectedCollateral(userCollateral, userBorrowed, debt, slippage);
    // {
    //     totalCollateral: '5.783452104143246413',
    //     userCollateral: '2.0',
    //     collateralFromUserBorrowed: '0.630575350690541071',
    //     collateralFromDebt: '3.152876753452705342'
    //     avgPrice: '3171.70659749038129067231'
    // }
    await oneWayMarket.leverage.borrowMorePriceImpact(userBorrowed, debt);
    // 0.010784277354269765 %
    await oneWayMarket.leverage.borrowMoreBands(userCollateral, userBorrowed, debt);
    // [ 47, 38 ]
    await oneWayMarket.leverage.borrowMorePrices(userCollateral, userBorrowed, debt);
    // [ '1560.282474721398939216', '1801.742501325928269008' ]
    await oneWayMarket.leverage.borrowMoreHealth(userCollateral, userBorrowed, debt, true);
    // 91.6798951784708552
    await oneWayMarket.leverage.borrowMoreHealth(userCollateral, userBorrowed, debt, false);
    // 3.7614279042995641
    await oneWayMarket.leverage.borrowMoreIsApproved(userCollateral, userBorrowed);
    // true
    await oneWayMarket.leverage.borrowMoreApprove(userCollateral, userBorrowed);
    // []
    await oneWayMarket.leverage.borrowMoreRouteImage(userBorrowed, debt);
    // 'data:image/svg+xml;base64,PHN2ZyBpZD0ic2Fua2V5UGFyZW50U3ZnIiB4bWxucz...'

    // You must call oneWayMarket.leverage.borrowMoreExpectedCollateral() with the same args before
    await oneWayMarket.leverage.borrowMore(userCollateral, userBorrowed, debt, slippage);
    // 0x6357dd6ea7250d7adb2344cd9295f8255fd8fbbe85f00120fbcd1ebf139e057c

    await oneWayMarket.wallet.balances();
    // {
    //     collateral: '97.0',
    //     borrowed: '597000.0',
    //     vaultShares: '1400000000.0',
    //     gauge: '0'
    // }
    await oneWayMarket.userState();
    // {
    //     collateral: '7.727839965845165558',
    //     borrowed: '0.0',
    //     debt: '12000.000010193901375446',
    //     N: '10'
    // }
    await oneWayMarket.userBands();
    // [ 47, 38 ]
    await oneWayMarket.userPrices();
    // [ '1560.28248267408177179', '1801.742510509320950242' ]
    await oneWayMarket.userHealth();
    // 91.6519475547753288
    await oneWayMarket.userHealth(false);
    // 3.7449386373872907
    
    
    // - Repay -

    
    //      Deleveraged position (-dDebt = borrowedFromStateCollateral + borrowedFromUSerCollateral + userBorrowed)
    //          ^
    //          |       userCollateral
    //  user ___|__________________________
    //   |                                 |
    //   |      |     stateCollateral      ↓  userCollateral + stateCollateral    
    //   |    controller     -->     leverage_zap    -->      router
    //   |       ^                      | ^  ^                   |
    //   |       |______________________| |  |___________________|
    //   |                                |  borrowedFromStateCollateral
    //   |________________________________|               +
    //              userBorrowed             borrowedFromUSerCollateral
    
    const stateCollateral = 2;
    userCollateral = 1;
    userBorrowed = 1500;
    await oneWayMarket.leverage.repayExpectedBorrowed(stateCollateral, userCollateral, userBorrowed, slippage);
    // {
    //     totalBorrowed: '10998.882838599741571472',
    //     borrowedFromStateCollateral: '6332.588559066494374648',
    //     borrowedFromUserCollateral: '3166.294279533247196824',
    //     userBorrowed: '1500'
    //     avgPrice: '3166.29427953324743125312'
    // }

    await oneWayMarket.leverage.repayPriceImpact(stateCollateral, userCollateral);
    // 0.013150142802201724 %
    await oneWayMarket.leverage.repayIsFull(stateCollateral, userCollateral, userBorrowed);
    // false
    await oneWayMarket.leverage.repayIsAvailable(stateCollateral, userCollateral, userBorrowed);
    // true
    await oneWayMarket.leverage.repayBands(stateCollateral, userCollateral, userBorrowed);
    // [ 199, 190 ]
    await oneWayMarket.leverage.repayPrices(stateCollateral, userCollateral, userBorrowed);
    // [ '175.130965754280721633', '202.233191367561902757' ]
    await oneWayMarket.leverage.repayHealth(stateCollateral, userCollateral, userBorrowed, true);
    // 1699.6097751079226865
    await oneWayMarket.leverage.repayHealth(stateCollateral, userCollateral, userBorrowed, false);
    // 3.4560086962806991
    await oneWayMarket.leverage.repayIsApproved(userCollateral, userBorrowed);
    // false
    await oneWayMarket.leverage.repayApprove(userCollateral, userBorrowed);
    // ['0xd8a8d3b3f67395e1a4f4d4f95b041edcaf1c9f7bab5eb8a8a767467678295498']
    await oneWayMarket.leverage.repayRouteImage(stateCollateral, userCollateral);
    // 'data:image/svg+xml;base64,PHN2ZyBpZD0ic2Fua2V5UGFyZW50U3ZnIiB4bWxucz...'

    // You must call oneWayMarket.leverage.repayExpectedBorrowed() with the same args before
    await oneWayMarket.leverage.repay(stateCollateral, userCollateral, userBorrowed, slippage);
    // 0xe48a97fef1c54180a2c7d104d210a95ac1a516fdd22109682179f1582da23a82

    await oneWayMarket.wallet.balances();
    // {
    //     collateral: '96.0',
    //     borrowed: '595500.0',
    //     vaultShares: '1400000000.0',
    //     gauge: '0'
    // }
    await oneWayMarket.userState();
    // {
    //     collateral: '5.727839965845165558',
    //     borrowed: '0.0',
    //     debt: '992.083214663467727334',
    //     N: '10'
    // }
    await oneWayMarket.userBands();
    // [ 199, 190 ]
    await oneWayMarket.userPrices();
    // [ '175.13096689602455189', '202.233192685995210783' ]
    await oneWayMarket.userHealth();
    // 1716.0249924305707883
    await oneWayMarket.userHealth(false);
    // 3.6389352509210336
})()
```

### Leverage createLoan all ranges methods
```ts
    await lending.init('JsonRpc', {}, {}, API_KEY_1INCH);
    await lending.oneWayfactory.fetchMarkets();
    
    const oneWayMarket = lending.getOneWayMarket('one-way-market-0');
    
    const userCollateral = 1;
    const userBorrowed = 1000;
    const debt = 2000;
    await oneWayMarket.leverage.createLoanMaxRecvAllRanges(userCollateral, userBorrowed);
    // {
    //     '4': {
    //         maxDebt: '37916.338071504823875251',
    //         maxTotalCollateral: '13.286983617364703479',
    //         userCollateral: '1',
    //         collateralFromUserBorrowed: '0.315728154966395280',
    //         collateralFromMaxDebt: '11.971255462398308199',
    //         maxLeverage: '10.09857816541446843865',
    //         avgPrice: '3167.28167656266072703689'
    //     },
    //     '5': {
    //         maxDebt: '35363.440522143354729759',
    //         maxTotalCollateral: '12.480961984286574804',
    //         userCollateral: '1',
    //         collateralFromUserBorrowed: '0.315728154966395280',
    //         collateralFromMaxDebt: '11.165233829320179524',
    //         maxLeverage: '9.48597317551918486951',
    //         avgPrice: '3167.28167656266072703689'
    //     },
    //     '6': {
    //         maxDebt: '33122.824118147617102062',
    //         maxTotalCollateral: '11.773536301065561222',
    //         userCollateral: '1',
    //         collateralFromUserBorrowed: '0.315728154966395280',
    //         collateralFromMaxDebt: '10.457808146099165942',
    //         maxLeverage: '8.94830459971897955699',
    //         avgPrice: '3167.28167656266072703689'
    //     },
    //     '7': {
    //         maxDebt: '31140.555201395785060968',
    //         maxTotalCollateral: '11.147678193332270290',
    //         userCollateral: '1',
    //         collateralFromUserBorrowed: '0.315728154966395280',
    //         collateralFromMaxDebt: '9.831950038365875010',
    //         maxLeverage: '8.47263027035929823721',
    //         avgPrice: '3167.28167656266072703689'
    //     },
    //      
    //      ...
    //
    //     '50': {
    //         maxDebt: '8122.705063645852013929',
    //         maxTotalCollateral: '3.880294838047496482',
    //         userCollateral: '1',
    //         collateralFromUserBorrowed: '0.315728154966395280',
    //         collateralFromMaxDebt: '2.564566683081101202',
    //         maxLeverage: '2.94916151440614435181',
    //         avgPrice: '3167.28167656266072703689'
    //     }

    await oneWayMarket.leverage.createLoanBandsAllRanges(userCollateral, userBorrowed, debt);
    // {
    //     '4': [ 73, 70 ],
    //     '5': [ 73, 69 ],
    //     '6': [ 74, 69 ],
    //     '7': [ 74, 68 ],
    //
    //      ...
    //
    //     '50': [ 97, 48 ]
    // }

    await oneWayMarket.leverage.createLoanPricesAllRanges(userCollateral, userBorrowed, debt);
    // {
    //     '4': [ '1073.323292757532604807', '1136.910693647788699808' ],
    //     '5': [ '1073.323292757532604807', '1153.387660222394333133' ],
    //     '6': [ '1057.990102860996424743', '1153.387660222394333133' ],
    //     '7': [ '1057.990102860996424743', '1170.103423414023236507' ],
    //
    //      ...
    //
    //     '50': [ '759.898822708156242647', '1560.282492846180089068' ]
    // }
```
