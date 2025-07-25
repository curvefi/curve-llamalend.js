# CURVE LLAMALEND JS

## Setup

Install from npm:

`npm install @curvefi/llamalend-api`

## Init
```ts
import llamalend from "@curvefi/llamalend-api";

(async () => {
    // 1. Dev
    await llamalend.init('JsonRpc', {url: 'http://localhost:8545/', privateKey: ''}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0, chainId: 1 });
    // OR
    await llamalend.init('JsonRpc', {}, {}); // In this case JsonRpc url, privateKey, fee data and chainId will be specified automatically

    // 2. Infura
    llamalend.init("Infura", { network: "homestead", apiKey: <INFURA_KEY> }, { chainId: 1 });
    
    // 3. Web3 provider
    llamalend.init('Web3', { externalProvider: <WEB3_PROVIDER> }, { chainId: 1 });
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
import llamalend from '@curvefi/lending-api'
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
                            llamalend.init("Web3", { externalProvider: wallet.provider }, { chainId: networkId })
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
import llamalend from '@curvefi/lending-api'

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
            llamalend.init("Web3", { externalProvider: wallet.provider }, { chainId: networkId })
        }
    }, [address, wallet?.provider]);

    ...
```

## Notes
- 1 Amounts can be passed in args either as numbers or strings.
- 2 lendMarket.swap**PriceImpact** method returns %, e. g. 0 < priceImpact <= 100.
- 3 Slippage arg should be passed as %, e. g. 0 < slippage <= 100.



## General methods
```ts
import llamalend from "@curvefi/llamalend-api";

(async () => {
    await llamalend.init('JsonRpc', {});

    const balances1 = await llamalend.getBalances(['sdt', 'weth']);
    // OR const balances1 = await llamalend.getBalances(['0x361a5a4993493ce00f61c32d4ecca5512b82ce90', '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619']);
    //['80980.0', '99.0']

    // You can specify address
    const balances2 = await llamalend.getBalances(['sdt', 'weth'], "0x0063046686E46Dc6F15918b61AE2B121458534a5");
    // OR const balances2 = await llamalend.getBalances(['0x361a5a4993493ce00f61c32d4ecca5512b82ce90', '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'], '0x0063046686E46Dc6F15918b61AE2B121458534a5');
    //['0.0', '0.0']

    const spender = "0x136e783846ef68C8Bd00a3369F787dF8d683a696"

    await llamalend.getAllowance(['sdt', 'weth'], llamalend.signerAddress, spender);
    //['0.0', '0.0']
    await llamalend.hasAllowance(['sdt', 'weth'], ['1000', '1000'], llamalend.signerAddress, spender);
    //false
    await llamalend.ensureAllowance(['sdt', 'weth'], ['1000', '1000'], spender);
    //['0xab21975af93c403fff91ac50e3e0df6a55b59c3003b34e9900821f5fa19e5454', '0xb6e10a2975adbde7dfb4263c0957dcce6c28cbe7a862f285bb4bda43cca8d62d']

    await llamalend.getUsdRate('0x7ceb23fd6bc0add59e62ac25578270cff1b9f619');
    //2637.61
})()
```

## lendMarket

### lendMarket fields
```ts
import llamalend from "@curvefi/llamalend-api";

(async () => {
    await llamalend.init('JsonRpc', {});

    const lendMarket = llamalend.getLendMarket('one-way-market-0');

    lendMarket.id
    // "one-way-market-0"
    lendMarket.name
    // "market-0"
    lendMarket.addresses
    // {
    //     amm: "0x78f7f91dce40269df106a189e47f27bab561332b"
    //     borrowed_token: "0x361a5a4993493ce00f61c32d4ecca5512b82ce90"
    //     collateral_token: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
    //     controller: "0xe27dda8e706f41ca0b496e6cf1b7f1e8308e6732"
    //     gauge: "0x0000000000000000000000000000000000000000"
    //     monetary_policy: "0xa845d0688745db0f377a6c5bf5fcde0a3a1a6aeb"
    //     vault: "0x42526886adb3b20a23a5a19c04e4bf81e9febb2b"
    // }
    lendMarket.borrowed_token
    // {
    //     address: "0x361a5a4993493ce00f61c32d4ecca5512b82ce90"
    //     decimals: 18
    //     name: "Stake DAO Token (PoS)"
    //     symbol: "SDT"
    // }
    lendMarket.collateral_token
    // {
    //     address: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
    //     decimals: 18
    //     name: "Wrapped Ether"
    //     symbol: "WETH"
    // }
    lendMarket.coinAddresses
    // ["0x361a5a4993493ce00f61c32d4ecca5512b82ce90", "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"]
    lendMarket.coinDecimals
    // [18,18]
    lendMarket.defaultBands
    // 10
    lendMarket.maxBands
    // 50
    lendMarket.minBands
    // 4
})()
````

### Wallet balances for lendMarket
```ts
import llamalend from "@curvefi/llamalend-api";

(async () => {
    await llamalend.init('JsonRpc', {});
    await llamalend.lendMarkets.fetchMarkets();

    const lendMarket = llamalend.getLendMarket('one-way-market-0');

    // 1. Current address (signer) balances
    console.log(await lendMarket.wallet.balances());
    //
    {
        borrowed: "100000.0"
        collateral: "100.0"
        vaultShares: "0.0"
    }
    //

    // 2. You can specify the address
    console.log(await lendMarket.wallet.balances("0x0063046686E46Dc6F15918b61AE2B121458534a5"));
    //
    {
        borrowed: "0.0"
        collateral: "0.0"
        vaultShares: "0.0"
    }
    //
})()
```

### Stats for lendMarket
```ts
import llamalend from "@curvefi/llamalend-api";

(async () => {
    await llamalend.init('JsonRpc', {});

    await llamalend.lendMarkets.fetchMarkets();

    const lendMarket = llamalend.getLendMarket('one-way-market-0');

    await lendMarket.stats.parameters();
    // {
    //     A: "100"
    //     admin_fee: "0.0"
    //     base_price: "8595.062092132517715849"
    //     fee: "0.6"
    //     liquidation_discount: "6.0"
    //     loan_discount: "9.0"
    // }
    await lendMarket.stats.rates();
    // {
    //     borrowApr: '17.8208613727056',
    //     lendApr: '13.829407727114368717',
    //     borrowApy: '19.507460419926105',
    //     lendApy: '15.138248271258824725'
    // }
    await lendMarket.stats.futureRates(10000, 0);  // dReserves = 10000, dDebt = 0
    // {
    //     borrowApr: '14.7869386793856',
    //     lendApr: '10.875115183120530145',
    //     borrowApy: '15.936145855611583',
    //     lendApy: '11.720304351866410822'
    // }
    await lendMarket.stats.futureRates(0, 10000);  // dReserves = 0, dDebt = 10000
    // {
    //     borrowApr: '22.979565109512',
    //     lendApr: '19.100290524367724358',
    //     borrowApy: '25.834284267258045',
    //     lendApy: '21.473092838884015799'
    // }
    await lendMarket.stats.balances();
    const { activeBand, maxBand, minBand, liquidationBand } = await lendMarket.stats.bandsInfo();
    // { activeBand: 0, maxBand: 15, minBand: 0, liquidationBand: null }
    await lendMarket.stats.bandBalances(liquidatingBand ?? 0);
    // {
    //     borrowed: "0.0"
    //     collateral: "0.0"
    // }
    await lendMarket.stats.bandsBalances();
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
    await lendMarket.stats.totalDebt();
    // 1000.0
    await lendMarket.stats.ammBalances();
    // {
    //     borrowed: "0"
    //     collateral: "0"
    // }
    await lendMarket.stats.capAndAvailable();
    // {
    //     available: "0.0"
    //     cap: "0.0"
    // }
})()
````


### Vault: deposit, mint, stake, unstake, withdraw, redeem for lendMarktet
```ts
    await llamalend.init('JsonRpc', {});
    await llamalend.lendMarkets.fetchMarkets();

    const lendMarket = llamalend.getLendMarket('one-way-market-1');
    
    
    await lendMarket.wallet.balances();
    // {
    //     collateral: '100000.0',
    //     borrowed: '1000000.0',
    //     vaultShares: '0.0',
    //     gauge: '0.0'
    // }
    
    // ------------ DEPOSIT ------------

    await lendMarket.vault.maxDeposit();
    // 1000000.0
    await lendMarket.vault.previewDeposit(20000);  // Shares to receive
    // 19957279.880161894212096572
    await lendMarket.vault.depositIsApproved(20000);
    // false
    await lendMarket.vault.depositApprove(20000);
    // [
    //     '0xb4a9da37381d6a7b36d89c977c6974d6f7d0aa7b82564b7bdef7b06b2fbd58ae'
    // ]
    await lendMarket.vault.deposit(20000);
    // 0x2670db285b6ac1d1e4fc63455554303b583ea0278ee7d75624be4573e018aa2e

    await lendMarket.wallet.balances();
    // {
    //     collateral: '100000.0',
    //     borrowed: '980000.0',
    //     vaultShares: '19957272.526619469933528807',
    //     gauge: '0.0'
    // }

    // ------------ MINT ------------

    await lendMarket.vault.maxMint();
    // 977906353.804354026742911543
    await lendMarket.vault.previewMint(20000);  // Assets to send
    // 20.042818950659253842
    await lendMarket.vault.mintIsApproved(20000);
    // true
    await lendMarket.vault.mintApprove(20000);
    // []
    await lendMarket.vault.mint(20000);
    // 0x9e34e201edaeacd27cb3013e003d415c110f562ad105e587f7c8fb0c3b974142

    let balances = await lendMarket.wallet.balances();
    // {
    //     collateral: '100000.0',
    //     borrowed: '979979.95718098845915171',
    //     vaultShares: '19977272.526619469933528807',
    //     gauge: '0.0'
    // }

    // ------------ UTILS ------------

    await lendMarket.vault.convertToAssets(100000);
    // 100.0
    await lendMarket.vault.convertToShares(100);
    // 100000.0

    // ------------ STAKE ------------

    await lendMarket.vault.stakeIsApproved(balances.vaultShares);
    // false
    await lendMarket.vault.stakeApprove(balances.vaultShares);
    // [
    //     '0xf3009825dfed3352d99b7d45b72d99b9a9b1773fae2abeabdb39d9880a3266d6'
    // ]
    await lendMarket.vault.stake(balances.vaultShares);
    // 0x3572dfa980b98091061df4b27ea8f05dee8b49384cc781dbcd7b8cf099610426
    balances = await lendMarket.wallet.balances();
    // {
    //     collateral: '100000.0',
    //     borrowed: '979979.95718098845915171',
    //     vaultShares: '0.0',
    //     gauge: '19977272.526619469933528807'
    // }

    // ------------ UNSTAKE ------------

    await lendMarket.vault.unstake(balances.gauge);
    // 0x30216703c444705598b10b3b510d05a19b44ad84699d8e2f3f0198a4573def99

    await lendMarket.wallet.balances();
    // {
    //     collateral: '100000.0',
    //     borrowed: '979979.95718098845915171',
    //     vaultShares: '19977272.526619469933528807',
    //     gauge: '0.0'
    // }

    // ------------ WITHDRAW ------------

    await lendMarket.vault.maxWithdraw();
    // 20020.043244481699203505
    await lendMarket.vault.previewWithdraw(10000);  // Shares to send
    // 9978636.051211318667087166
    await lendMarket.vault.withdraw(10000);
    //0xa8df19e420040dc21e60f1a25eedec01fead748e2d654100ca3e2d0e369a7ae0

    await lendMarket.wallet.balances();
    // {
    //     collateral: '100000.0',
    //     borrowed: '989979.95718098845915171',
    //     vaultShares: '9998636.505706074967248914',
    //     gauge: '0.0'
    // }

    // ------------ REDEEM ------------

    await lendMarket.vault.maxRedeem();
    // 9998636.505706074967248914
    await lendMarket.vault.previewRedeem(10000);  // Assets to receive
    // 10.021409718764999588
    await lendMarket.vault.redeem(10000);
    // 0x391721baa517170c23819b070532a3429ab3c7a306042615bf8e1983d035e363

    await lendMarket.wallet.balances();
    // {
    //     collateral: '100000.0',
    //     borrowed: '989989.978590745251091246',
    //     vaultShares: '9988636.505706074967248914',
    //     gauge: '0.0'
    // }

    // ------------ REWARDS ------------

    lendMarket.vault.rewardsOnly();
    // false
    await lendMarket.vault.totalLiquidity();
    // 180638.919172
    await lendMarket.vault.crvApr();
    // [0, 0]
    await lendMarket.vault.rewardTokens();
    // []
    await lendMarket.vault.rewardsApr();
    // []
    await lendMarket.vault.claimableCrv();
    // 0.0
    await lendMarket.vault.claimCrv();
    // 0x8325bada809340d681c165ffc5bac0ba490f8350872b5d0aa82f3fe6c01205aa
    await lendMarket.vault.claimableRewards();
    // []
    await lendMarket.vault.claimRewards();
    // 0xb0906c3a2dea66d1ab6f280833f7205f46af7374f8cf9baa5429f881094140ba
````

### Create loan, add collateral, borrow more, repay for lendMarket
```ts
(async () => {
    await llamalend.init('JsonRpc', {});

    await llamalend.lendMarkets.fetchMarkets();

    const lendMarket = llamalend.getLendMarket('one-way-market-0');
    
    
    // --- CREATE LOAN ---

    await lendMarket.oraclePrice();
    // 3000.0
    await lendMarket.price();
    // 3045.569137149127502965
    await lendMarket.basePrice();
    // '3000.0'
    await lendMarket.wallet.balances();
    // { borrowed: '0.0', collateral: '1.0' }
    await lendMarket.createLoanMaxRecv(0.5, 5);
    // 1375.74670276529114147
    await lendMarket.createLoanBands(0.5, 1000, 5);
    // [ 36, 32 ]
    await lendMarket.createLoanPrices(0.5, 1000, 5);
    // [ '2068.347257607234777', '2174.941007873561634' ]
    await lendMarket.createLoanHealth(0.5, 1000, 5);  // FULL
    // 45.191203147616155
    await lendMarket.createLoanHealth(0.5, 1000, 5, false);  // NOT FULL
    // 3.9382535412942367
    
    await lendMarket.createLoanIsApproved(0.5);
    // false
    await lendMarketa.createLoanApprove(0.5);
    // [
    //     '0xc111e471715ae6f5437e12d3b94868a5b6542cd7304efca18b5782d315760ae5'
    // ]
    await lendMarket.createLoan(0.5, 1000, 5);

    console.log(await lendMarket.userLoanExists());
    //true
    console.log(await lendMarket.userState());
    //
    {
        N: "5"
        borrowed: "0.0"
        collateral: "1.0"
        debt: "1000.0"
    }
    //
    console.log(await lendMarket.userHealth());  // FULL
    //722.5902543890457276
    console.log(await lendMarket.userHealth(false));  // NOT FULL
    //3.4708541149110123
    console.log(await lendMarket.userRange());
    //5
    console.log(await lendMarket.userBands());
    //[206,,202]
    console.log(await lendMarket.userPrices());
    //["1073.332550295331639435","1128.647508360591547283]
    console.log(await lendMarket.userBandsBalances());
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

    await lendMarket.borrowMoreMaxRecv(0.1);
    // 650.896043318349376298
    await lendMarket.borrowMoreBands(0.1, 500);
    // [ 14, 10 ]
    await lendMarket.borrowMorePrices(0.1, 500);
    // [ '2580.175063923865968', '2713.146225026413746' ]
    await lendMarket.borrowMoreHealth(0.1, 500);  // FULL
    // 15.200984677843693 %
    await lendMarket.borrowMoreHealth(0.1, 500, false);  // NOT FULL
    // 3.7268336789002429 %
    
    await lendMarket.borrowMoreIsApproved(0.1);
    // true
    await lendMarket.borrowMoreApprove(0.1);
    // []
    
    await lendMarket.borrowMore(0.1, 500);

    // Full health: 15.200984677843694 %
    // Not full health: 3.7268336789002439 %
    // Bands: [ 14, 10 ]
    // Prices: [ '2580.175063923865968', '2713.146225026413746' ]
    // State: { collateral: '0.6', borrowed: '0.0', debt: '1500.0' }

    // --- ADD COLLATERAL ---

    await lendMarket.addCollateralBands(0.2);
    // [ 43, 39 ]
    await lendMarket.addCollateralPrices(0.2);
    // [ '1927.834806254156043', '2027.187147180850842' ]
    await lendMarket.addCollateralHealth(0.2);  // FULL
    // 55.2190795613534006
    await lendMarket.addCollateralHealth(0.2, false);  // NOT FULL
    // 3.3357274109987789
    
    await lendMarket.addCollateralIsApproved(0.2);
    // true
    await lendMarket.addCollateralApprove(0.2);
    // []
    
    await lendMarket.addCollateral(0.2);  // OR await lendMarket.addCollateral(0.2, forAddress);

    // Full health: 55.2190795613534014 %
    // Not full health: 3.3357274109987797 %
    // Bands: [ 43, 39 ]
    // Prices: [ '1927.834806254156043', '2027.187147180850842' ]
    // State: { collateral: '0.8', borrowed: '0.0', debt: '1500.0' }

    // --- REMOVE COLLATERAL ---

    await lendMarket.maxRemovable()
    // 0.254841506439755199
    await lendMarket.removeCollateralBands(0.1);
    // [ 29, 25 ]
    await lendMarket.removeCollateralPrices(0.1);
    // [ '2219.101120164841944', '2333.46407819744091' ]
    await lendMarket.removeCollateralHealth(0.1);  // FULL
    // 35.1846612411492316
    await lendMarket.removeCollateralHealth(0.1, false);  // NOT FULL
    // 4.0796515570298074
    
    await lendMarket.removeCollateral(0.1);

    // Full health: 35.1846612411492326 %
    // Not full health: 4.0796515570298084 %
    // Bands: [ 29, 25 ]
    // Prices: [ '2219.101120164841944', '2333.46407819744091', ]
    // State: { collateral: '0.7', borrowed: '0.0', debt: '1500.0' }

    // --- REPAY ---

    await lendMarket.wallet.balances();
    // { borrowed: '1500.0', collateral: '0.3' }

    await lendMarket.repayBands(1000);
    // [ 139, 135 ]
    await lendMarket.repayPrices(1000);
    // [ '734.595897104762463', '772.453820291837448' ]
    await lendMarket.repayHealth(1000);  // FULL
    // 315.2178906180373138
    await lendMarket.repayHealth(1000, false);  // NOT FULL
    // 3.3614254588945566
    
    await lendMarket.repayIsApproved(1000);
    // true
    await lendMarket.repayApprove(1000);
    // []
    await lendMarket.repay(1000);

    // Full health: 315.2178906180373149 %
    // Not full health: 3.3614254588945577 %
    // Bands: [ 139, 135 ]
    // Prices: [ '734.595897104762463', '772.453820291837448' ]
    // State: { collateral: '0.7', borrowed: '0.0', debt: '500.0' }

    // --- FULL REPAY ---

    await lendMarket.fullRepayIsApproved();
    // true
    await lendMarket.fullRepayApprove();
    // []
    await lendMarket.fullRepay();

    // Loan exists: false
    // State: { collateral: '0.0', borrowed: '0.0', debt: '0.0' }
})()
```

### Create loan all ranges methods for lendMarket
```ts
    await llamalend.init('JsonRpc', {});

    const lendMarket = llamalend.getLendMarket('one-way-market-0');

    await lendMarket.createLoanMaxRecvAllRanges(1);
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

    await lendMarket.createLoanBandsAllRanges(1, 2600);
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

    await lendMarket.createLoanPricesAllRanges(1, 2600);
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

### Swap for lendMarket
```ts
(async () => {
    await llamalend.init('JsonRpc', {});

    const lendMarket = llamalend.getLendMarket('one-way-market-0');

    await lendMarket.wallet.balances();
    // {
    //     borrowed: '301.533523886491869218',
    //     collateral: '0.860611976623971606'
    // }


    await lendMarket.maxSwappable(0, 1);
    // 380.672763174593107707
    await lendMarket.swapExpected(0, 1, 100);  // 100 - in_amount
    // 0.03679356627103543 (out_amount)
    await lendMarket.swapRequired(0, 1, 0.03679356627103543);  // 0.03679356627103543 - out_amount
    // 100.000000000000000558 (in_amount)
    await lendMarket.swapPriceImpact(0, 1, 100);
    // 0.170826
    await lendMarket.swapIsApproved(0, 100);
    // true
    await lendMarket.swapApprove(0, 100);
    // []
    await lendMarket.swap(0, 1, 100, 0.1);

    await lendMarket.wallet.balances();
    // {
    //     borrowed: '201.533523886491869218',
    //     collateral: '0.897405542895007036'
    // }
})()
```

### Self-liquidation for lendMarket
```ts
(async () => {
    await llamalend.init('JsonRpc', {});

    const lendMarket = llamalend.getLendMarket('one-way-market-0');

    // Wallet balances: {
    //     borrowed: '301.533523886491869218',
    //     collateral: '0.860611976623971606'
    // }
    // State: {
    //     collateral: '0.139388023376028394',
    //     borrowed: '2751.493405530582315609',
    //     debt: '3053.026929417074184827'
    // }
    
    await lendMarket.tokensToLiquidate();
    // 301.533523886491869218
    await lendMarket.selfLiquidateIsApproved();
    // true
    await lendMarket.selfLiquidateApprove();
    // []
    await lendMarket.selfLiquidate(0.1); // slippage = 0.1 %

    // Wallet balances: { borrowed: '0.0', collateral: '1.0' }
    // State: { collateral: '0.0', borrowed: '0.0', debt: '0.0' }
})()
```

### Partial self-liquidation for lendMarket
```ts
(async () => {
    await llamalend.init('JsonRpc', {});

    const lendMarket = llamalend.getLendMarket('one-way-market-0');

    // Wallet balances: {
    //     borrowed: '301.533523886491869218',
    //     collateral: '0.860611976623971606'
    // }
    // State: {
    //     collateral: '0.139388023376028394',
    //     borrowed: '2751.493405530582315609',
    //     debt: '3053.026929417074184827'
    // }
    
    await lendMarket.tokensToLiquidate();
    // 301.533523886491869218

    const fraction = await lendMarket.calcPartialFrac(140); // <- 140 - amount (should be less then lendMarket.tokensToLiquidate)
    // {frac: '472880873283878292070000000000000000', fracDecimal: '0.47288087328387829207', amount: 200}
    // 

    
    await lendMarket.partialSelfLiquidateIsApproved(fraction);
    // false
    await lendMarket.partialSelfLiquidateApproveEstimateGas(fraction);
    // []
    await lendMarket.partialSelfLiquidateIsApproved(fraction);
    // true
    await lendMarket.partialSelfLiquidate(fraction, 0.1); // slippage = 0.1 %

    // Wallet balances: { borrowed: '0.0', collateral: '1.0' }
    // State: { collateral: '0.0', borrowed: '0.0', debt: '0.0' }
})()
```

### Liquidation for lendMarket
```ts
(async () => {
    await llamalend.init('JsonRpc', {});

    const lendMarket = llamalend.getLendMarket('one-way-market-0');
    const addressToLiquidate = "0x66aB6D9362d4F35596279692F0251Db635165871";

    await lendMarket.wallet.balances();
    // Liquidator wallet balances: {
    //     borrowed: '301.533523886491869218',
    //     collateral: '0.860611976623971606'
    // }
    await lendMarket.userState(addressToLiquidate);
    // State of the account we are goning to liquidate: {
    //     collateral: '0.139388023376028394',
    //     borrowed: '2751.493405530582315609',
    //     debt: '3053.026929417074184827'
    // }
    
    await lendMarket.currentLeverage()
    //0.94083266399502623316

    await lendMarket.currentPnL()
    /*
    {
        currentPosition:"9.383656846426222260"
        currentProfit:"0.007205653033021260"
        deposited:"1.572195559253977"
        percentage:"0.46"
    }
     */
    
    await lendMarket.tokensToLiquidate(addressToLiquidate);
    // 301.533523886491869218
    await lendMarket.liquidateIsApproved();
    // true
    await lendMarket.liquidateApprove();
    // []
    await lendMarket.liquidate(addressToLiquidate, 0.1); // slippage = 0.1 %

    // Liquidator wallet balances: { borrowed: '0.0', collateral: '1.0' }
    // State of liquidated account: { collateral: '0.0', borrowed: '0.0', debt: '0.0' }
})()
```

### User loss for lendMarket
```ts
(async () => {
    await llamalend.init('JsonRpc', {});

    const lendMarket = llamalend.getLendMarket('sfrxeth');

    console.log(await lendMarket.userLoss("0x0063046686E46Dc6F15918b61AE2B121458534a5"));
    // {
    //     deposited_collateral: '929.933909709140155529',
    //     current_collateral_estimation: '883.035865972092328038',
    //     loss: '46.898043737047827491',
    //     loss_pct: '5.043158793049750311'
    // }
})()
```

### Leverage (createLoan, borrowMore, repay) for lendMarket
```ts
(async () => {
    await llamalend.init('JsonRpc', {}, {}, API_KEY_1INCH);
    await llamalend.lendMarkets.fetchMarkets();

    const lendMarket = llamalend.getLendMarket('one-way-market-0');
    console.log(lendMarket.collateral_token, lendMarket.borrowed_token);
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
    //     name: 'curve.finance USD Stablecoin',
    //     symbol: 'crvUSD'
    // }
    console.log(await lendMarket.wallet.balances());
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
    await lendMarket.leverage.maxLeverage(range);
    // 7.4728229145282742179
    await lendMarket.leverage.createLoanMaxRecv(userCollateral, userBorrowed, range);
    // {
    //     maxDebt: '26089.494406081862861214',
    //     maxTotalCollateral: '9.539182089833411347',
    //     userCollateral: '1',
    //     collateralFromUserBorrowed: '0.315221168834966496',
    //     collateralFromMaxDebt: '8.223960920998444851',
    //     maxLeverage: '7.25291100528992828612',
    //     avgPrice: '3172.3757757003568790858'
    // }
    await lendMarket.leverage.createLoanExpectedCollateral(userCollateral, userBorrowed, debt, slippage);
    // {
    //     totalCollateral: '1.946422996710829',
    //     userCollateral: '1.0',
    //     collateralFromUserBorrowed: '0.315474332236942984',
    //     collateralFromDebt: '0.630948664473886',
    //     leverage: '1.4796358613861877'
    //     avgPrice: '3169.8299919022623523421'
    // }
    await lendMarket.leverage.createLoanPriceImpact(userBorrowed, debt);
    // 0.08944411854377342 %
    await lendMarket.leverage.createLoanMaxRange(userCollateral, userBorrowed, debt);
    // 50
    await lendMarket.leverage.createLoanBands(userCollateral, userBorrowed, debt, range);
    // [ 76, 67 ]
    await lendMarket.leverage.createLoanPrices(userCollateral, userBorrowed, debt, range);
    // [ '1027.977701011670136614', '1187.061409925215211173' ]
    await lendMarket.leverage.createLoanHealth(userCollateral, userBorrowed, debt, range);
    // 195.8994783042570637
    await lendMarket.leverage.createLoanHealth(userCollateral, userBorrowed, debt, range, false);
    // 3.2780908310686365
    await lendMarket.leverage.createLoanIsApproved(userCollateral, userBorrowed);
    // false
    await lendMarket.leverage.createLoanApprove(userCollateral, userBorrowed);
    // [
    //     '0xd5491d9f1e9d8ac84b03867494e35b25efad151c597d2fa4211d7bf5d540c98e',
    //     '0x93565f37ec5be902a824714a30bddc25cf9cd9ed39b4c0e8de61fab44af5bc8c'
    // ]
    await lendMarket.leverage.createLoanRouteImage(userBorrowed, debt);
    // 'data:image/svg+xml;base64,PHN2ZyBpZD0ic2Fua2V5UGFyZW50U3ZnIiB4bWxucz...'

    
    // You must call lendMarket.leverage.createLoanExpectedCollateral() with the same args before
    await lendMarket.leverage.createLoan(userCollateral, userBorrowed, debt, range);
    // 0xeb1b7a92bcb02598f00dc8bbfe8fa3a554e7a2b1ca764e0ee45e2bf583edf731

    await lendMarket.wallet.balances();
    // {
    //     collateral: '99.0',
    //     borrowed: '599000.0',
    //     vaultShares: '1400000000.0',
    //     gauge: '0'
    // }
    await lendMarket.userState();
    // {
    //     collateral: '1.945616160868693648',
    //     borrowed: '0.0',
    //     debt: '2000.0',
    //     N: '10'
    // }
    await lendMarket.userBands();
    // [ 76, 67 ]
    await lendMarket.userPrices();
    // [ '1027.977718614028011906', '1187.061430251609195098' ]
    await lendMarket.userHealth();
    // 195.8372633833293605
    await lendMarket.userHealth(false);
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
    await lendMarket.leverage.borrowMoreMaxRecv(userCollateral, userBorrowed);
    // {
    //     maxDebt: '76182.8497941193262889',
    //     maxTotalCollateral: '26.639775583730298462',
    //     userCollateral: '2',
    //     collateralFromUserBorrowed: '1.677318306610359627',
    //     collateralFromMaxDebt: '22.962457277119938834',
    //     avgPrice: '3172.55402418338331369083'
    // }
    await lendMarket.leverage.borrowMoreExpectedCollateral(userCollateral, userBorrowed, debt, slippage);
    // {
    //     totalCollateral: '5.783452104143246413',
    //     userCollateral: '2.0',
    //     collateralFromUserBorrowed: '0.630575350690541071',
    //     collateralFromDebt: '3.152876753452705342'
    //     avgPrice: '3171.70659749038129067231'
    // }
    await lendMarket.leverage.borrowMorePriceImpact(userBorrowed, debt);
    // 0.010784277354269765 %
    await lendMarket.leverage.borrowMoreBands(userCollateral, userBorrowed, debt);
    // [ 47, 38 ]
    await lendMarket.leverage.borrowMorePrices(userCollateral, userBorrowed, debt);
    // [ '1560.282474721398939216', '1801.742501325928269008' ]
    await lendMarket.leverage.borrowMoreHealth(userCollateral, userBorrowed, debt, true);
    // 91.6798951784708552
    await lendMarket.leverage.borrowMoreHealth(userCollateral, userBorrowed, debt, false);
    // 3.7614279042995641
    await lendMarket.leverage.borrowMoreIsApproved(userCollateral, userBorrowed);
    // true
    await lendMarket.leverage.borrowMoreApprove(userCollateral, userBorrowed);
    // []
    await lendMarket.leverage.borrowMoreRouteImage(userBorrowed, debt);
    // 'data:image/svg+xml;base64,PHN2ZyBpZD0ic2Fua2V5UGFyZW50U3ZnIiB4bWxucz...'

    // You must call lendMarket.leverage.borrowMoreExpectedCollateral() with the same args before
    await lendMarket.leverage.borrowMore(userCollateral, userBorrowed, debt, slippage);
    // 0x6357dd6ea7250d7adb2344cd9295f8255fd8fbbe85f00120fbcd1ebf139e057c

    await lendMarket.wallet.balances();
    // {
    //     collateral: '97.0',
    //     borrowed: '597000.0',
    //     vaultShares: '1400000000.0',
    //     gauge: '0'
    // }
    await lendMarket.userState();
    // {
    //     collateral: '7.727839965845165558',
    //     borrowed: '0.0',
    //     debt: '12000.000010193901375446',
    //     N: '10'
    // }
    await lendMarket.userBands();
    // [ 47, 38 ]
    await lendMarket.userPrices();
    // [ '1560.28248267408177179', '1801.742510509320950242' ]
    await lendMarket.userHealth();
    // 91.6519475547753288
    await lendMarket.userHealth(false);
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
    await lendMarket.leverage.repayExpectedBorrowed(stateCollateral, userCollateral, userBorrowed, slippage);
    // {
    //     totalBorrowed: '10998.882838599741571472',
    //     borrowedFromStateCollateral: '6332.588559066494374648',
    //     borrowedFromUserCollateral: '3166.294279533247196824',
    //     userBorrowed: '1500'
    //     avgPrice: '3166.29427953324743125312'
    // }

    await lendMarket.leverage.repayPriceImpact(stateCollateral, userCollateral);
    // 0.013150142802201724 %
    await lendMarket.leverage.repayIsFull(stateCollateral, userCollateral, userBorrowed);
    // false
    await lendMarket.leverage.repayIsAvailable(stateCollateral, userCollateral, userBorrowed);
    // true
    await lendMarket.leverage.repayBands(stateCollateral, userCollateral, userBorrowed);
    // [ 199, 190 ]
    await lendMarket.leverage.repayPrices(stateCollateral, userCollateral, userBorrowed);
    // [ '175.130965754280721633', '202.233191367561902757' ]
    await lendMarket.leverage.repayHealth(stateCollateral, userCollateral, userBorrowed, true);
    // 1699.6097751079226865
    await lendMarket.leverage.repayHealth(stateCollateral, userCollateral, userBorrowed, false);
    // 3.4560086962806991
    await lendMarket.leverage.repayIsApproved(userCollateral, userBorrowed);
    // false
    await lendMarket.leverage.repayApprove(userCollateral, userBorrowed);
    // ['0xd8a8d3b3f67395e1a4f4d4f95b041edcaf1c9f7bab5eb8a8a767467678295498']
    await lendMarket.leverage.repayRouteImage(stateCollateral, userCollateral);
    // 'data:image/svg+xml;base64,PHN2ZyBpZD0ic2Fua2V5UGFyZW50U3ZnIiB4bWxucz...'

    // You must call lendMarket.leverage.repayExpectedBorrowed() with the same args before
    await lendMarket.leverage.repay(stateCollateral, userCollateral, userBorrowed, slippage);
    // 0xe48a97fef1c54180a2c7d104d210a95ac1a516fdd22109682179f1582da23a82

    await lendMarket.wallet.balances();
    // {
    //     collateral: '96.0',
    //     borrowed: '595500.0',
    //     vaultShares: '1400000000.0',
    //     gauge: '0'
    // }
    await lendMarket.userState();
    // {
    //     collateral: '5.727839965845165558',
    //     borrowed: '0.0',
    //     debt: '992.083214663467727334',
    //     N: '10'
    // }
    await lendMarket.userBands();
    // [ 199, 190 ]
    await lendMarket.userPrices();
    // [ '175.13096689602455189', '202.233192685995210783' ]
    await lendMarket.userHealth();
    // 1716.0249924305707883
    await lendMarket.userHealth(false);
    // 3.6389352509210336
})()
```

### Leverage createLoan all ranges methods for lendMarket
```ts
    await llamalend.init('JsonRpc', {}, {}, API_KEY_1INCH);
    await llamalend.lendMarkets.fetchMarkets();
    
    const lendMarket = llamalend.getLendMarket('one-way-market-0');
    
    const userCollateral = 1;
    const userBorrowed = 1000;
    const debt = 2000;
    await lendMarket.leverage.createLoanMaxRecvAllRanges(userCollateral, userBorrowed);
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

    await lendMarket.leverage.createLoanBandsAllRanges(userCollateral, userBorrowed, debt);
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

    await lendMarket.leverage.createLoanPricesAllRanges(userCollateral, userBorrowed, debt);
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

## MintMarket

### MintMarket fields

```ts
import llamalend from "@curvefi/llamalend-api";
import {llamalend} from "./llamalend";

(async () => {
    await llamalend.init('JsonRpc', {});

    const mintMarket = llamalend.getMintMarket('eth');

    mintMarket.id;
    // eth
    mintMarket.address;
    // 0x3897810a334833184Ef7D6B419ba4d78EC2bBF80
    mintMarket.controller;
    // 0x1eF9f7C2abD0E351a8966f00565e1b04765d3f0C
    mintMarket.monetaryPolicy;
    // 0xc684432FD6322c6D58b6bC5d28B18569aA0AD0A1
    mintMarket.collateral;
    // 0xac3E018457B222d93114458476f3E3416Abbe38F
    mintMarket.collateralSymbol;
    // WETH
    mintMarket.collateralDecimals;
    // 18
    mintMarket.coins;
    // [ 'crvUSD', 'WETH' ]
    mintMarket.coinAddresses;
    // [
    //     '0x3194cBDC3dbcd3E11a07892e7bA5c3394048Cc87',
    //     '0xa3B53dDCd2E3fC28e8E130288F2aBD8d5EE37472'
    // ]
    mintMarket.coinDecimals;
    // [ 18, 18 ]
    mintMarket.minBands;
    // 5
    mintMarket.maxBands;
    // 50
    mintMarket.defaultBands;
    // 20
    mintMarket.A;
    // 100
    mintMarket.tickSpace;
    // 1 %
})()
````

### Wallet balances for mintMarket
```ts
import llamalend from "@curvefi/llamalend-api";

(async () => {
    await llamalend.init('JsonRpc', {});
    
    const mintMarket = llamalend.getMintMarket('eth');
    
    // 1. Current address (signer) balances

    await mintMarket.wallet.balances();
    // { stablecoin: '0.0', collateral: '1.0' }

    
    // 2. You can specify the address
    
    await mintMarket.wallet.balances("0x0063046686E46Dc6F15918b61AE2B121458534a5");
    // { stablecoin: '0.0', collateral: '0.0' }
})()
```

### Stats for mintMarket
```ts
import llamalend from "@curvefi/llamalend-api";

(async () => {
    await llamalend.init('JsonRpc', {});

    const mintMarket = llamalend.getMintMarket('eth');

    await mintMarket.stats.parameters();
    // {
    //     fee: '0.0',
    //     admin_fee: '0.0',
    //     rate: '0.0',
    //     future_rate: '0.0',
    //     liquidation_discount: '2.0',
    //     loan_discount: '5.0'
    // }
    await mintMarket.stats.balances();
    // [ '300.0', '0.402268776965776345' ]
    await mintMarket.stats.maxMinBands();
    // [ 15, 0 ]
    await mintMarket.stats.activeBand();
    // 11
    const liquidatingBand = await mintMarket.stats.liquidatingBand();  // null when there is no liquidation
    // 11
    await mintMarket.stats.bandBalances(liquidatingBand);
    // { stablecoin: '300.0', collateral: '0.002268776965776345' }
    await mintMarket.stats.bandsBalances();
    // {
    //     '0': { stablecoin: '0.0', collateral: '0.0' },
    //     '1': { stablecoin: '0.0', collateral: '0.0' },
    //     '2': { stablecoin: '0.0', collateral: '0.0' },
    //     '3': { stablecoin: '0.0', collateral: '0.0' },
    //     '4': { stablecoin: '0.0', collateral: '0.0' },
    //     '5': { stablecoin: '0.0', collateral: '0.0' },
    //     '6': { stablecoin: '0.0', collateral: '0.0' },
    //     '7': { stablecoin: '0.0', collateral: '0.0' },
    //     '8': { stablecoin: '0.0', collateral: '0.0' },
    //     '9': { stablecoin: '0.0', collateral: '0.0' },
    //     '10': { stablecoin: '0.0', collateral: '0.0' },
    //     '11': { stablecoin: '300.0', collateral: '0.002268776965776345' },
    //     '12': { stablecoin: '0.0', collateral: '0.1' },
    //     '13': { stablecoin: '0.0', collateral: '0.1' },
    //     '14': { stablecoin: '0.0', collateral: '0.1' },
    //     '15': { stablecoin: '0.0', collateral: '0.1' }
    // }
    await mintMarket.stats.totalSupply();
    // 1375.74 
    await mintMarket.stats.totalDebt();
    // 1375.74
    await mintMarket.stats.totalStablecoin();
    // 300.0 
    await mintMarket.stats.totalCollateral();
    // 0.402268776965776345
    await mintMarket.stats.capAndAvailable();
    // { cap: '10000000.0', available: '172237.031342956400517635' }
})()
````

### Create loan, add collateral, borrow more, repay for mintMarket
```ts
(async () => {
    await llamalend.init('JsonRpc', {});

    console.log(llamalend.getMintMarketList());
    // [ 'sfrxeth' ]
    
    const mintMarket = llamalend.getMintMarket('eth');
    
    
    // --- CREATE LOAN ---

    await mintMarket.oraclePrice();
    // 3000.0
    await mintMarket.price();
    // 3045.569137149127502965
    await mintMarket.basePrice();
    // '3000.0'
    await mintMarket.wallet.balances();
    // { stablecoin: '0.0', collateral: '1.0' }
    await mintMarket.createLoanMaxRecv(0.5, 5);
    // 1375.74670276529114147
    await mintMarket.createLoanBands(0.5, 1000, 5);
    // [ 36, 32 ]
    await mintMarket.createLoanPrices(0.5, 1000, 5);
    // [ '2068.347257607234777', '2174.941007873561634' ]
    await mintMarket.createLoanHealth(0.5, 1000, 5);  // FULL
    // 45.191203147616155
    await mintMarket.createLoanHealth(0.5, 1000, 5, false);  // NOT FULL
    // 3.9382535412942367
    
    await mintMarket.createLoanIsApproved(0.5);
    // false
    await mintMarket.createLoanApprove(0.5);
    // [
    //     '0xc111e471715ae6f5437e12d3b94868a5b6542cd7304efca18b5782d315760ae5'
    // ]
    await mintMarket.createLoan(0.5, 1000, 5);

    await mintMarket.debt();  // OR await mintMarket.debt(address);
    // 1000.0
    await mintMarket.loanExists();
    // true
    await mintMarket.userHealth();  // FULL
    // 45.1912031476161562 %
    await mintMarket.userHealth(false);  // NOT FULL
    // 3.9382535412942379
    await mintMarket.userRange()
    // 5
    await mintMarket.userBands();
    // [ 36, 32 ]
    await mintMarket.userPrices();
    // [ '2068.347257607234777', '2174.941007873561634' ]
    await mintMarket.userState();
    // { collateral: '0.5', stablecoin: '0.0', debt: '1000.0' }
    await mintMarket.userBandsBalances();
    // {
    //     '32': { stablecoin: '0.0', collateral: '0.1' },
    //     '33': { stablecoin: '0.0', collateral: '0.1' },
    //     '34': { stablecoin: '0.0', collateral: '0.1' },
    //     '35': { stablecoin: '0.0', collateral: '0.1' },
    //     '36': { stablecoin: '0.0', collateral: '0.1' }
    // }

    // --- BORROW MORE ---

    await mintMarket.borrowMoreMaxRecv(0.1);
    // 650.896043318349376298
    await mintMarket.borrowMoreBands(0.1, 500);
    // [ 14, 10 ]
    await mintMarket.borrowMorePrices(0.1, 500);
    // [ '2580.175063923865968', '2713.146225026413746' ]
    await mintMarket.borrowMoreHealth(0.1, 500);  // FULL
    // 15.200984677843693 %
    await mintMarket.borrowMoreHealth(0.1, 500, false);  // NOT FULL
    // 3.7268336789002429 %
    
    await mintMarket.borrowMoreIsApproved(0.1);
    // true
    await mintMarket.borrowMoreApprove(0.1);
    // []
    
    await mintMarket.borrowMore(0.1, 500);

    // Full health: 15.200984677843694 %
    // Not full health: 3.7268336789002439 %
    // Bands: [ 14, 10 ]
    // Prices: [ '2580.175063923865968', '2713.146225026413746' ]
    // State: { collateral: '0.6', stablecoin: '0.0', debt: '1500.0' }

    // --- ADD COLLATERAL ---

    await mintMarket.addCollateralBands(0.2);
    // [ 43, 39 ]
    await mintMarket.addCollateralPrices(0.2);
    // [ '1927.834806254156043', '2027.187147180850842' ]
    await mintMarket.addCollateralHealth(0.2);  // FULL
    // 55.2190795613534006
    await mintMarket.addCollateralHealth(0.2, false);  // NOT FULL
    // 3.3357274109987789
    
    await mintMarket.addCollateralIsApproved(0.2);
    // true
    await mintMarket.addCollateralApprove(0.2);
    // []
    
    await mintMarket.addCollateral(0.2);  // OR await mintMarket.addCollateral(0.2, forAddress);

    // Full health: 55.2190795613534014 %
    // Not full health: 3.3357274109987797 %
    // Bands: [ 43, 39 ]
    // Prices: [ '1927.834806254156043', '2027.187147180850842' ]
    // State: { collateral: '0.8', stablecoin: '0.0', debt: '1500.0' }

    // --- REMOVE COLLATERAL ---

    await mintMarket.maxRemovable()
    // 0.254841506439755199
    await mintMarket.removeCollateralBands(0.1);
    // [ 29, 25 ]
    await mintMarket.removeCollateralPrices(0.1);
    // [ '2219.101120164841944', '2333.46407819744091' ]
    await mintMarket.removeCollateralHealth(0.1);  // FULL
    // 35.1846612411492316
    await mintMarket.removeCollateralHealth(0.1, false);  // NOT FULL
    // 4.0796515570298074
    
    await mintMarket.removeCollateral(0.1);

    // Full health: 35.1846612411492326 %
    // Not full health: 4.0796515570298084 %
    // Bands: [ 29, 25 ]
    // Prices: [ '2219.101120164841944', '2333.46407819744091', ]
    // State: { collateral: '0.7', stablecoin: '0.0', debt: '1500.0' }

    // --- REPAY ---

    await mintMarket.wallet.balances();
    // { stablecoin: '1500.0', collateral: '0.3' }

    await mintMarket.repayBands(1000);
    // [ 139, 135 ]
    await mintMarket.repayPrices(1000);
    // [ '734.595897104762463', '772.453820291837448' ]
    await mintMarket.repayHealth(1000);  // FULL
    // 315.2178906180373138
    await mintMarket.repayHealth(1000, false);  // NOT FULL
    // 3.3614254588945566
    
    await mintMarket.repayIsApproved(1000);
    // true
    await mintMarket.repayApprove(1000);
    // []
    await mintMarket.repay(1000);

    // Full health: 315.2178906180373149 %
    // Not full health: 3.3614254588945577 %
    // Bands: [ 139, 135 ]
    // Prices: [ '734.595897104762463', '772.453820291837448' ]
    // State: { collateral: '0.7', stablecoin: '0.0', debt: '500.0' }

    // --- FULL REPAY ---

    await mintMarket.fullRepayIsApproved();
    // true
    await mintMarket.fullRepayApprove();
    // []
    await mintMarket.fullRepay();

    // Loan exists: false
    // State: { collateral: '0.0', stablecoin: '0.0', debt: '0.0' }
})()
```

### Create loan all ranges methods for mintMarket
```ts
    await llamalend.init('JsonRpc', {});

    const mintMarket = llamalend.getMintMarket('eth');

    await mintMarket.createLoanMaxRecvAllRanges(1);
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

    await mintMarket.createLoanBandsAllRanges(1, 2600);
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

    await mintMarket.createLoanPricesAllRanges(1, 2600);
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

### Swap for mintMarket
```ts
(async () => {
    await llamalend.init('JsonRpc', {});

    const mintMarket = llamalend.getMintMarket('eth');

    await mintMarket.wallet.balances();
    // {
    //     stablecoin: '301.533523886491869218',
    //     collateral: '0.860611976623971606'
    // }


    await mintMarket.maxSwappable(0, 1);
    // 380.672763174593107707
    await mintMarket.swapExpected(0, 1, 100);  // 100 - in_amount
    // 0.03679356627103543 (out_amount)
    await mintMarket.swapRequired(0, 1, 0.03679356627103543);  // 0.03679356627103543 - out_amount
    // 100.000000000000000558 (in_amount)
    await mintMarket.swapPriceImpact(0, 1, 100);
    // 0.170826
    await mintMarket.swapIsApproved(0, 100);
    // true
    await mintMarket.swapApprove(0, 100);
    // []
    await mintMarket.swap(0, 1, 100, 0.1);

    await mintMarket.wallet.balances();
    // {
    //     stablecoin: '201.533523886491869218',
    //     collateral: '0.897405542895007036'
    // }
})()
```

### Self-liquidation for mintMarket
```ts
(async () => {
    await llamalend.init('JsonRpc', {});

    const mintMarket = llamalend.getMintMarket('eth');

    // Wallet balances: {
    //     stablecoin: '301.533523886491869218',
    //     collateral: '0.860611976623971606'
    // }
    // State: {
    //     collateral: '0.139388023376028394',
    //     stablecoin: '2751.493405530582315609',
    //     debt: '3053.026929417074184827'
    // }
    
    await mintMarket.tokensToLiquidate();
    // 301.533523886491869218
    await mintMarket.selfLiquidateIsApproved();
    // true
    await mintMarket.selfLiquidateApprove();
    // []
    await mintMarket.selfLiquidate(0.1); // slippage = 0.1 %

    // Wallet balances: { stablecoin: '0.0', collateral: '1.0' }
    // State: { collateral: '0.0', stablecoin: '0.0', debt: '0.0' }
})()
```

### Liquidation for mintMarket
```ts
(async () => {
    await llamalend.init('JsonRpc', {});

    const mintMarket = llamalend.getMintMarket('eth');
    const addressToLiquidate = "0x66aB6D9362d4F35596279692F0251Db635165871";

    await mintMarket.wallet.balances();
    // Liquidator wallet balances: {
    //     stablecoin: '301.533523886491869218',
    //     collateral: '0.860611976623971606'
    // }
    await mintMarket.userState(addressToLiquidate);
    // State of the account we are goning to liquidate: {
    //     collateral: '0.139388023376028394',
    //     stablecoin: '2751.493405530582315609',
    //     debt: '3053.026929417074184827'
    // }
    
    await mintMarket.tokensToLiquidate(addressToLiquidate);
    // 301.533523886491869218
    await mintMarket.liquidateIsApproved();
    // true
    await mintMarket.liquidateApprove();
    // []
    await mintMarket.liquidate(addressToLiquidate, 0.1); // slippage = 0.1 %

    // Liquidator wallet balances: { stablecoin: '0.0', collateral: '1.0' }
    // State of liquidated account: { collateral: '0.0', stablecoin: '0.0', debt: '0.0' }
})()
```

### User loss for mintMarket
```ts
(async () => {
    await llamalend.init('JsonRpc', {});

    const mintMarket = llamalend.getMintMarket('sfrxeth');

    console.log(await mintMarket.userLoss("0x0063046686E46Dc6F15918b61AE2B121458534a5"));
    // {
    //     deposited_collateral: '929.933909709140155529',
    //     current_collateral_estimation: '883.035865972092328038',
    //     loss: '46.898043737047827491',
    //     loss_pct: '5.043158793049750311'
    // }
})()
```

### Leverage for mintMarket
```ts
(async () => {

    //        Creates leveraged position (collateral + leverage_collateral)
    //                          ^
    //                          | 
    //        collateral        |         crvUSD                 crvUSD    
    // user       -->      controller     -->     leverage_zap    -->    curve_router
    //                          ^                      |  ^                   |
    //                          |______________________|  |___________________|
    //                             leverage_collateral     leverage_collateral
    
    await llamalend.init('JsonRpc', {});

    const mintMarket = llamalend.getMintMarket('wsteth');
    
    
    await mintMarket.leverage.createLoanMaxRecv(1, 5);
    // {
    //     maxBorrowable: '16547.886068664425693035',
    //     maxCollateral: '8.789653769216069731',
    //     leverage: '8.7897',
    //     routeIdx: 1
    // }
    const { collateral, leverage, routeIdx } = await mintMarket.leverage.createLoanCollateral(1, 1000);
    // { collateral: '1.470781767566863562', leverage: '1.4708', routeIdx: 1 }
    await mintMarket.leverage.getRouteName(routeIdx);
    // crvUSD/USDT --> tricrypto2 --> steth
    await mintMarket.leverage.getMaxRange(1, 1000);
    // 50
    await mintMarket.leverage.createLoanBands(1, 1000, 5);
    // [ 103, 99 ]
    await mintMarket.leverage.createLoanPrices(1, 1000, 5);
    // [ '731.101353314760924139', '768.779182694401331144' ]
    await mintMarket.leverage.createLoanHealth(1, 1000, 5);  // FULL
    // 203.0010181561119221
    await mintMarket.leverage.createLoanHealth(1, 1000, 5, false);  // NOT FULL
    // 3.6596075146233826
    await mintMarket.leverage.priceImpact(1, 1000);
    // 0.0007 %

    await mintMarket.leverage.createLoanIsApproved(1);
    // false
    await mintMarket.leverage.createLoanApprove(1);
    // [
    //     '0xc111e471715ae6f5437e12d3b94868a5b6542cd7304efca18b5782d315760ae5'
    // ]
    await mintMarket.leverage.createLoan(1, 1000, 5);
    // 0x0c6fbfdbd5c35d84b6137d3f27b91235100c540f97d87f27eefe9c53d3fe2727

    await mintMarket.debt();  // OR await mintMarket.debt(address);
    // 1000.0
    await mintMarket.loanExists();
    // true
    await mintMarket.userHealth();  // FULL
    // 202.9745534261399119
    await mintMarket.userHealth(false);  // NOT FULL
    // 3.664403959327331
    await mintMarket.userRange()
    // 5
    await mintMarket.userBands();
    // [ 103, 99 ]
    await mintMarket.userPrices();
    // [ '731.101559601446893847', '768.779399612218705572' ]
    await mintMarket.userState();
    // {
    //     collateral: '1.47084941027800225',
    //     stablecoin: '0.0',
    //     debt: '1000.0'
    // }
    await mintMarket.userBandsBalances();
    // {
    //     '99': { stablecoin: '0.0', collateral: '0.29416988205560045' },
    //     '100': { stablecoin: '0.0', collateral: '0.29416988205560045' },
    //     '101': { stablecoin: '0.0', collateral: '0.29416988205560045' },
    //     '102': { stablecoin: '0.0', collateral: '0.29416988205560045' },
    //     '103': { stablecoin: '0.0', collateral: '0.29416988205560045' }
    // }

})()
```

### Leverage all ranges methods for mintMarket
```ts
    await llamalend.init('JsonRpc', {});

    const mintMarket = llamalend.getMintMarket('wsteth');

    await mintMarket.leverage.createLoanMaxRecvAllRanges(1);
    // {
    //     '4': {
    //         maxBorrowable: '17147.090188198024935509',
    //         maxCollateral: '9.062551195413331339',
    //         leverage: '9.0626',
    //         routeIdx: 1
    //     },
    //     '5': {
    //         maxBorrowable: '16403.646954605099577422',
    //         maxCollateral: '8.713012324116998431',
    //         leverage: '8.7130',
    //         routeIdx: 1
    //     },
    //     '6': {
    //         maxBorrowable: '15719.798733163998861372',
    //         maxCollateral: '8.391490399698554111',
    //         leverage: '8.3915',
    //         routeIdx: 1
    //     },
    //     '7': {
    //         maxBorrowable: '15088.670386359222674207',
    //         maxCollateral: '8.094753549413418159',
    //         leverage: '8.0948',
    //         routeIdx: 1
    //     },
    //     '8': {
    //         maxBorrowable: '14504.40446852885551856',
    //         maxCollateral: '7.820048255346502533',
    //         leverage: '7.8200',
    //         routeIdx: 1
    //     },
    //     '9': {
    //         maxBorrowable: '13961.979739583096049766',
    //         maxCollateral: '7.565014055477733007',
    //         leverage: '7.5650',
    //         routeIdx: 1
    //     },
    //     '10': {
    //         maxBorrowable: '13457.067188253192169488',
    //         maxCollateral: '7.327615875203003395',
    //         leverage: '7.3276',
    //         routeIdx: 1
    //     },
    //      
    //      ...
    //
    //     '50': {
    //         maxBorrowable: '5292.589588751249894884',
    //         maxCollateral: '3.488707841886932836',
    //         leverage: '3.4887',
    //         routeIdx: 1
    //     }
    // }

    await mintMarket.leverage.createLoanBandsAllRanges(1, 14000);
    // {
    //     '4': [ 3, 0 ],
    //     '5': [ 3, -1 ],
    //     '6': [ 4, -1 ],
    //     '7': [ 4, -2 ],
    //     '8': [ 5, -2 ],
    //     '9': null,
    //     '10': null,
    //
    //      ...
    //
    //     '50': null
    // }

    await mintMarket.leverage.createLoanPricesAllRanges(1, 14000);
    // {
    //     '4': [ '1997.376270314867650039', '2079.309355360395105159' ],
    //     '5': [ '1997.376270314867650039', '2100.312480162015257736' ],
    //     '6': [ '1977.402507611718973539', '2100.312480162015257736' ],
    //     '7': [ '1977.402507611718973539', '2121.527757739409351246' ],
    //     '8': [ '1957.628482535601783803', '2121.527757739409351246' ],
    //     '9': null,
    //     '10': null,
    //
    //      ...
    //
    //     '50': null
    // }
```

### Deleverage for mintMarket
```ts
(async () => {

    //    Deleveraged position (fully or partially)
    //      ^
    //      | 
    //      |     collateral              collateral    
    // controller     -->     leverage_zap    -->    curve_router
    //      ^                      |    ^                   |
    //      |______________________|    |___________________|
    //               crvUSD                     crvUSD
    
    await llamalend.init('JsonRpc', {});

    const mintMarket = llamalend.getMintMarket('wsteth');


    await mintMarket.userState();
    // {
    //     collateral: '1.532865973844812038',
    //     stablecoin: '0.0',
    //     debt: '1000.0'
    // }
    const { stablecoins, routeIdx } = await mintMarket.deleverage.repayStablecoins(0.5);
    // { stablecoins: '936.993512434228957835', routeIdx: 2 }
    await mintMarket.deleverage.getRouteName(routeIdx)
    // wstETH wrapper -> steth -> factory-tricrypto-4 (TriCRV)
    await mintMarket.deleverage.repayBands(0.5)
    // [ 344, 340 ]
    await mintMarket.deleverage.repayPrices(0.5)
    // [ '65.389368517832066821', '68.759256234814550815' ]
    await mintMarket.deleverage.repayHealth(0.5)  // FULL
    // 2962.6116372201716629
    await mintMarket.deleverage.repayHealth(0.5, false)  // NOT FULL
    // 3.3355078309621505
    await mintMarket.deleverage.priceImpact(0.5)
    // 0.0080 %
    await mintMarket.deleverage.isAvailable(0.5)
    // true
    await mintMarket.deleverage.isFullRepayment(0.5)
    // false

    await mintMarket.deleverage.repay(0.5, 0.3)

    await mintMarket.userState()
    // {
    //     collateral: '1.032865973844812038',
    //     stablecoin: '0.0',
    //     debt: '63.006629410173187253'
    // }
    await mintMarket.userBands()
    // [ 344, 340 ]
    await mintMarket.userPrices()
    // [ '65.389377792947951092', '68.759265987930143609' ]
    await mintMarket.userHealth()  // FULL
    // 2962.6210276926274746
    await mintMarket.userHealth(false)  // NOT FULL
    // 3.3352898532375197
    await mintMarket.userBandsBalances()
    // {
    //     '340': { stablecoin: '0.0', collateral: '0.20657319476896241' },
    //     '341': { stablecoin: '0.0', collateral: '0.206573194768962407' },
    //     '342': { stablecoin: '0.0', collateral: '0.206573194768962407' },
    //     '343': { stablecoin: '0.0', collateral: '0.206573194768962407' },
    //     '344': { stablecoin: '0.0', collateral: '0.206573194768962407' }
    // }
})()
```

### LeverageV2 (createLoan, borrowMore, repay) for mintMarket
```ts
(async () => {
    await llamalend.init('JsonRpc', {}, {});

    const mintMarket = llamalend.getMintMarket('cbbtc');
    console.log(await mintMarket.wallet.balances());
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
    await mintMarket.leverageV2.maxLeverage(range);
    // 7.4728229145282742179
    await mintMarket.leverageV2.createLoanMaxRecv(userCollateral, userBorrowed, range);
    // {
    //     maxDebt: '26089.494406081862861214',
    //     maxTotalCollateral: '9.539182089833411347',
    //     userCollateral: '1',
    //     collateralFromUserBorrowed: '0.315221168834966496',
    //     collateralFromMaxDebt: '8.223960920998444851',
    //     maxLeverage: '7.25291100528992828612',
    //     avgPrice: '3172.3757757003568790858'
    // }
    await mintMarket.leverageV2.createLoanExpectedCollateral(userCollateral, userBorrowed, debt, slippage);
    // {
    //     totalCollateral: '1.946422996710829',
    //     userCollateral: '1.0',
    //     collateralFromUserBorrowed: '0.315474332236942984',
    //     collateralFromDebt: '0.630948664473886',
    //     leverage: '1.4796358613861877'
    //     avgPrice: '3169.8299919022623523421'
    // }
    await mintMarket.leverageV2.createLoanPriceImpact(userBorrowed, debt);
    // 0.08944411854377342 %
    await mintMarket.leverageV2.createLoanMaxRange(userCollateral, userBorrowed, debt);
    // 50
    await mintMarket.leverageV2.createLoanBands(userCollateral, userBorrowed, debt, range);
    // [ 76, 67 ]
    await mintMarket.leverageV2.createLoanPrices(userCollateral, userBorrowed, debt, range);
    // [ '1027.977701011670136614', '1187.061409925215211173' ]
    await mintMarket.leverageV2.createLoanHealth(userCollateral, userBorrowed, debt, range);
    // 195.8994783042570637
    await mintMarket.leverageV2.createLoanHealth(userCollateral, userBorrowed, debt, range, false);
    // 3.2780908310686365
    await mintMarket.leverageV2.createLoanIsApproved(userCollateral, userBorrowed);
    // false
    await mintMarket.leverageV2.createLoanApprove(userCollateral, userBorrowed);
    // [
    //     '0xd5491d9f1e9d8ac84b03867494e35b25efad151c597d2fa4211d7bf5d540c98e',
    //     '0x93565f37ec5be902a824714a30bddc25cf9cd9ed39b4c0e8de61fab44af5bc8c'
    // ]
    await mintMarket.leverageV2.createLoanRouteImage(userBorrowed, debt);
    // 'data:image/svg+xml;base64,PHN2ZyBpZD0ic2Fua2V5UGFyZW50U3ZnIiB4bWxucz...'

    
    // You must call mintMarket.leverageV2.createLoanExpectedCollateral() with the same args before
    await mintMarket.leverageV2.createLoan(userCollateral, userBorrowed, debt, range);
    // 0xeb1b7a92bcb02598f00dc8bbfe8fa3a554e7a2b1ca764e0ee45e2bf583edf731

    await mintMarket.wallet.balances();
    // {
    //     collateral: '99.0',
    //     borrowed: '599000.0',
    //     vaultShares: '1400000000.0',
    //     gauge: '0'
    // }
    await mintMarket.userState();
    // {
    //     collateral: '1.945616160868693648',
    //     borrowed: '0.0',
    //     debt: '2000.0',
    //     N: '10'
    // }
    await mintMarket.userBands();
    // [ 76, 67 ]
    await mintMarket.userPrices();
    // [ '1027.977718614028011906', '1187.061430251609195098' ]
    await mintMarket.userHealth();
    // 195.8372633833293605
    await mintMarket.userHealth(false);
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
    await mintMarket.leverageV2.borrowMoreMaxRecv(userCollateral, userBorrowed);
    // {
    //     maxDebt: '76182.8497941193262889',
    //     maxTotalCollateral: '26.639775583730298462',
    //     userCollateral: '2',
    //     collateralFromUserBorrowed: '1.677318306610359627',
    //     collateralFromMaxDebt: '22.962457277119938834',
    //     avgPrice: '3172.55402418338331369083'
    // }
    await mintMarket.leverageV2.borrowMoreExpectedCollateral(userCollateral, userBorrowed, debt, slippage);
    // {
    //     totalCollateral: '5.783452104143246413',
    //     userCollateral: '2.0',
    //     collateralFromUserBorrowed: '0.630575350690541071',
    //     collateralFromDebt: '3.152876753452705342'
    //     avgPrice: '3171.70659749038129067231'
    // }
    await mintMarket.leverageV2.borrowMorePriceImpact(userBorrowed, debt);
    // 0.010784277354269765 %
    await mintMarket.leverageV2.borrowMoreBands(userCollateral, userBorrowed, debt);
    // [ 47, 38 ]
    await mintMarket.leverageV2.borrowMorePrices(userCollateral, userBorrowed, debt);
    // [ '1560.282474721398939216', '1801.742501325928269008' ]
    await mintMarket.leverageV2.borrowMoreHealth(userCollateral, userBorrowed, debt, true);
    // 91.6798951784708552
    await mintMarket.leverageV2.borrowMoreHealth(userCollateral, userBorrowed, debt, false);
    // 3.7614279042995641
    await mintMarket.leverageV2.borrowMoreIsApproved(userCollateral, userBorrowed);
    // true
    await mintMarket.leverageV2.borrowMoreApprove(userCollateral, userBorrowed);
    // []
    await mintMarket.leverageV2.borrowMoreRouteImage(userBorrowed, debt);
    // 'data:image/svg+xml;base64,PHN2ZyBpZD0ic2Fua2V5UGFyZW50U3ZnIiB4bWxucz...'

    // You must call mintMarket.leverageV2.borrowMoreExpectedCollateral() with the same args before
    await mintMarket.leverageV2.borrowMore(userCollateral, userBorrowed, debt, slippage);
    // 0x6357dd6ea7250d7adb2344cd9295f8255fd8fbbe85f00120fbcd1ebf139e057c

    await mintMarket.wallet.balances();
    // {
    //     collateral: '97.0',
    //     borrowed: '597000.0',
    //     vaultShares: '1400000000.0',
    //     gauge: '0'
    // }
    await mintMarket.userState();
    // {
    //     collateral: '7.727839965845165558',
    //     borrowed: '0.0',
    //     debt: '12000.000010193901375446',
    //     N: '10'
    // }
    await mintMarket.userBands();
    // [ 47, 38 ]
    await mintMarket.userPrices();
    // [ '1560.28248267408177179', '1801.742510509320950242' ]
    await mintMarket.userHealth();
    // 91.6519475547753288
    await lendMarket.userHealth(false);
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
    await mintMarket.leverageV2.repayExpectedBorrowed(stateCollateral, userCollateral, userBorrowed, slippage);
    // {
    //     totalBorrowed: '10998.882838599741571472',
    //     borrowedFromStateCollateral: '6332.588559066494374648',
    //     borrowedFromUserCollateral: '3166.294279533247196824',
    //     userBorrowed: '1500'
    //     avgPrice: '3166.29427953324743125312'
    // }

    await mintMarket.leverageV2.repayPriceImpact(stateCollateral, userCollateral);
    // 0.013150142802201724 %
    await mintMarket.leverageV2.repayIsFull(stateCollateral, userCollateral, userBorrowed);
    // false
    await mintMarket.leverageV2.repayIsAvailable(stateCollateral, userCollateral, userBorrowed);
    // true
    await mintMarket.leverageV2.repayBands(stateCollateral, userCollateral, userBorrowed);
    // [ 199, 190 ]
    await mintMarket.leverageV2.repayPrices(stateCollateral, userCollateral, userBorrowed);
    // [ '175.130965754280721633', '202.233191367561902757' ]
    await mintMarket.leverageV2.repayHealth(stateCollateral, userCollateral, userBorrowed, true);
    // 1699.6097751079226865
    await mintMarket.leverageV2.repayHealth(stateCollateral, userCollateral, userBorrowed, false);
    // 3.4560086962806991
    await mintMarket.leverageV2.repayIsApproved(userCollateral, userBorrowed);
    // false
    await mintMarket.leverageV2.repayApprove(userCollateral, userBorrowed);
    // ['0xd8a8d3b3f67395e1a4f4d4f95b041edcaf1c9f7bab5eb8a8a767467678295498']
    await mintMarket.leverageV2.repayRouteImage(stateCollateral, userCollateral);
    // 'data:image/svg+xml;base64,PHN2ZyBpZD0ic2Fua2V5UGFyZW50U3ZnIiB4bWxucz...'

    // You must call mintMarket.leverageV2.repayExpectedBorrowed() with the same args before
    await mintMarket.leverageV2.repay(stateCollateral, userCollateral, userBorrowed, slippage);
    // 0xe48a97fef1c54180a2c7d104d210a95ac1a516fdd22109682179f1582da23a82

    await mintMarket.wallet.balances();
    // {
    //     collateral: '96.0',
    //     borrowed: '595500.0',
    //     vaultShares: '1400000000.0',
    //     gauge: '0'
    // }
    await mintMarket.userState();
    // {
    //     collateral: '5.727839965845165558',
    //     borrowed: '0.0',
    //     debt: '992.083214663467727334',
    //     N: '10'
    // }
    await mintMarket.userBands();
    // [ 199, 190 ]
    await mintMarket.userPrices();
    // [ '175.13096689602455189', '202.233192685995210783' ]
    await mintMarket.userHealth();
    // 1716.0249924305707883
    await mintMarket.userHealth(false);
    // 3.6389352509210336
})()
```

### Leverage createLoan all ranges methods for mintMarket
```ts
    await llamalend.init('JsonRpc', {}, {}, API_KEY_1INCH);
    
    const mintMarket = llamalend.getMintMarket('cbbtc');
    
    const userCollateral = 1;
    const userBorrowed = 1000;
    const debt = 2000;
    await mintMarket.leverageV2.createLoanMaxRecvAllRanges(userCollateral, userBorrowed);
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

    await mintMarket.leverageV2.createLoanBandsAllRanges(userCollateral, userBorrowed, debt);
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

    await mintMarket.leverageV2.createLoanPricesAllRanges(userCollateral, userBorrowed, debt);
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