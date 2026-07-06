import { assert } from "chai";
import { ethers } from "ethers";
import { createLlamalend } from "../src/index.js";
import type { LendMarketTemplate } from "../src/lendMarkets/index.js";
import type { MintMarketTemplate } from "../src/mintMarkets/index.js";

/**
 * Compares markets fetched via the Curve API against markets fetched directly
 * from the blockchain, for both mint markets (crvUSD, mainnet only) and lend
 * markets (LlamaLend one-way markets, mainnet + Optimism).
 *
 * Each comparison uses two independent `createLlamalend()` instances (one per
 * data source) so that market objects are never cached/reused across fetches -
 * this guarantees we are really comparing two independently fetched datasets.
 */

const ETH_RPC_URL = process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com";
const OP_RPC_URL = process.env.OP_RPC_URL || "https://optimism-rpc.publicnode.com";

type LlamalendInstance = ReturnType<typeof createLlamalend>;

async function createInstance(url: string): Promise<LlamalendInstance> {
    const instance = createLlamalend();
    await instance.init("JsonRpc", { url }, { gasPrice: 0 });
    return instance;
}

const toLower = (address: string): string => address.toLowerCase();

type CoinSnapshot = {
    address: string;
    symbol: string;
    decimals: number;
};

const snapshotCoin = (coin: { address: string; symbol: string; decimals: number }): CoinSnapshot => ({
    address: toLower(coin.address),
    symbol: coin.symbol,
    decimals: coin.decimals,
});

type LendMarketSnapshot = {
    version: "v1" | "v2";
    addresses: {
        amm: string;
        controller: string;
        borrowed_token: string;
        collateral_token: string;
        monetary_policy: string;
        vault: string;
        gauge: string;
    };
    borrowed_token: CoinSnapshot;
    collateral_token: CoinSnapshot;
};

// Two fields are intentionally excluded from this snapshot because the two data
// sources use different (but each internally valid) conventions for them:
// - `market.name`: the API returns a human-friendly display name (e.g. "Borrow
//   crvUSD (wstETH collateral)"), while the on-chain factory stores an internal
//   slug (e.g. "wsteth-long"). Checked separately below for non-emptiness only.
// - Coin `.name` (inside `borrowed_token`/`collateral_token`): the API-backed
//   fetcher fills it with the token symbol, while the on-chain fetcher reads the
//   real ERC20 `name()`.
function snapshotLendMarket(market: LendMarketTemplate<"v1"> | LendMarketTemplate<"v2">): LendMarketSnapshot {
    return {
        version: market.version,
        addresses: {
            amm: toLower(market.addresses.amm),
            controller: toLower(market.addresses.controller),
            borrowed_token: toLower(market.addresses.borrowed_token),
            collateral_token: toLower(market.addresses.collateral_token),
            monetary_policy: toLower(market.addresses.monetary_policy),
            vault: toLower(market.addresses.vault),
            gauge: toLower(market.addresses.gauge),
        },
        borrowed_token: snapshotCoin(market.borrowed_token),
        collateral_token: snapshotCoin(market.collateral_token),
    };
}

function collectLendSnapshots(instance: LlamalendInstance): Map<string, LendMarketSnapshot> {
    const snapshots = new Map<string, LendMarketSnapshot>();
    for (const id of instance.lendMarkets.getMarketList()) {
        const market = instance.getLendMarket(id);
        snapshots.set(toLower(market.addresses.vault), snapshotLendMarket(market));
    }
    return snapshots;
}

function collectLendNames(instance: LlamalendInstance): Map<string, string> {
    const names = new Map<string, string>();
    for (const id of instance.lendMarkets.getMarketList()) {
        const market = instance.getLendMarket(id);
        names.set(toLower(market.addresses.vault), market.name);
    }
    return names;
}

function collectLendIds(instance: LlamalendInstance): Map<string, string> {
    const ids = new Map<string, string>();
    for (const id of instance.lendMarkets.getMarketList()) {
        const market = instance.getLendMarket(id);
        ids.set(toLower(market.addresses.vault), id);
    }
    return ids;
}

type MintMarketSnapshot = {
    amm: string;
    controller: string;
    monetaryPolicy: string;
    collateral: string;
    collateralSymbol: string;
    collateralDecimals: number;
    A: number;
};

function snapshotMintMarket(market: MintMarketTemplate): MintMarketSnapshot {
    return {
        amm: toLower(market.address),
        controller: toLower(market.controller),
        monetaryPolicy: toLower(market.monetaryPolicy),
        collateral: toLower(market.collateral),
        collateralSymbol: market.collateralSymbol,
        collateralDecimals: market.collateralDecimals,
        A: market.A,
    };
}

function collectMintSnapshots(instance: LlamalendInstance): Map<string, MintMarketSnapshot> {
    const snapshots = new Map<string, MintMarketSnapshot>();
    for (const id of instance.mintMarkets.getMarketList()) {
        const market = instance.getMintMarket(id);
        snapshots.set(toLower(market.controller), snapshotMintMarket(market));
    }
    return snapshots;
}

// Mint market ids are derived from the collateral symbol (e.g. "wsteth"), not
// from list position, so they're more stable than lend market ids - but this
// still deserves an explicit check (see `assertSameIdForSameMarket`).
function collectMintIds(instance: LlamalendInstance): Map<string, string> {
    const ids = new Map<string, string>();
    for (const id of instance.mintMarkets.getMarketList()) {
        const market = instance.getMintMarket(id);
        ids.set(toLower(market.controller), id);
    }
    return ids;
}

// Returns the number of markets that were actually compared, so callers can
// surface it (in the console and/or in the test title).
//
// Note on coverage direction: this only asserts API markets ⊆ on-chain markets
// (every market the API knows about must exist and match on-chain), not the
// reverse. A brand-new on-chain market that the API hasn't indexed yet is a
// normal, transient state (API indexing lag) and should not fail the suite.
// Such markets are still surfaced (non-fatally) via `warnAboutChainOnlyMarkets`
// below, so they are never silently invisible.
function assertMatchingMarketSets<T>(
    apiSnapshots: Map<string, T>,
    chainSnapshots: Map<string, T>,
    label: string
): number {
    assert.isAbove(apiSnapshots.size, 0, `API returned no ${label}`);
    assert.isAbove(chainSnapshots.size, 0, `Blockchain returned no ${label}`);

    for (const key of apiSnapshots.keys()) {
        assert.isTrue(chainSnapshots.has(key), `${label}: market ${key} from API was not found on-chain`);
    }

    for (const [key, apiSnapshot] of apiSnapshots) {
        assert.deepEqual(apiSnapshot, chainSnapshots.get(key), `${label}: mismatch for market ${key}`);
    }

    return apiSnapshots.size;
}

// Verifies that the same underlying market (identified by its stable key -
// vault or controller address) is assigned the *same* `id` regardless of
// whether it was fetched via the API or the blockchain. `id` is a derived,
// source-local identifier (see `collectLendIds`/`collectMintIds`), so this is
// the only way to catch a real ordering mismatch between the two sources -
// which would otherwise let `getLendMarket('one-way-market-3')` silently
// resolve to two different markets depending on how the app fetched data.
function assertSameIdForSameMarket(
    apiIds: Map<string, string>,
    chainIds: Map<string, string>,
    label: string
): void {
    for (const [key, apiId] of apiIds) {
        const chainId = chainIds.get(key);
        assert.isDefined(chainId, `${label}: market ${key} has an API id but no on-chain id`);
        assert.equal(chainId, apiId, `${label}: market ${key} got id "${apiId}" via API but "${chainId}" via blockchain`);
    }
}

// Non-fatal: reports on-chain markets that the API doesn't know about yet, so
// an API indexing lag is visible in the test output instead of being silently
// skipped by the one-directional check in `assertMatchingMarketSets`.
function warnAboutChainOnlyMarkets<T>(
    apiSnapshots: Map<string, T>,
    chainSnapshots: Map<string, T>,
    label: string
): void {
    const chainOnly = [...chainSnapshots.keys()].filter((key) => !apiSnapshots.has(key));
    if (chainOnly.length > 0) {
        console.log(
            `      !! [${label}] ${chainOnly.length} market(s) exist on-chain but are not (yet) returned by the API: ${chainOnly.join(", ")}`
        );
    }
}

const summary: string[] = [];

function recordSummary(label: string, api: number, chain: number): void {
    const line = `${label}: API=${api}, on-chain=${chain}`;
    summary.push(line);
    console.log(`      -> [${line}]`);
}

function recordOnChainOnlySummary(label: string, count: number): void {
    const line = `${label}: on-chain=${count} (no API for this data set)`;
    summary.push(line);
    console.log(`      -> [${line}]`);
}

describe("Markets: API vs Blockchain", function () {
    this.timeout(600000);

    after(function () {
        console.log("\n  Markets checked summary:");
        for (const line of summary) {
            console.log(`    - ${line}`);
        }
        console.log("");
    });

    describe("Mainnet lend markets (v1)", function () {
        let apiSnapshots: Map<string, LendMarketSnapshot>;
        let chainSnapshots: Map<string, LendMarketSnapshot>;
        let apiNames: Map<string, string>;
        let chainNames: Map<string, string>;
        let apiIds: Map<string, string>;
        let chainIds: Map<string, string>;

        before(async function () {
            const apiInstance = await createInstance(ETH_RPC_URL);
            await apiInstance.lendMarkets.fetchMarkets({ useApi: true, version: "v1" });
            apiSnapshots = collectLendSnapshots(apiInstance);
            apiNames = collectLendNames(apiInstance);
            apiIds = collectLendIds(apiInstance);

            const chainInstance = await createInstance(ETH_RPC_URL);
            await chainInstance.lendMarkets.fetchMarkets({ useApi: false, version: "v1" });
            chainSnapshots = collectLendSnapshots(chainInstance);
            chainNames = collectLendNames(chainInstance);
            chainIds = collectLendIds(chainInstance);

            recordSummary("mainnet lend v1", apiSnapshots.size, chainSnapshots.size);
            warnAboutChainOnlyMarkets(apiSnapshots, chainSnapshots, "mainnet lend v1");
        });

        it("matches markets fetched via API against markets fetched from the blockchain", function () {
            const comparedCount = assertMatchingMarketSets(apiSnapshots, chainSnapshots, "mainnet lend markets");
            this.test!.title += ` (${comparedCount} markets compared)`;
        });

        it("has a non-empty name for every market from both sources", function () {
            for (const [vault, name] of apiNames) assert.isNotEmpty(name, `API name missing for vault ${vault}`);
            for (const [vault, name] of chainNames) assert.isNotEmpty(name, `on-chain name missing for vault ${vault}`);
        });

        it("assigns the same id to the same market regardless of fetch source", function () {
            assertSameIdForSameMarket(apiIds, chainIds, "mainnet lend markets");
        });
    });

    describe("Mainnet mint markets (crvUSD)", function () {
        let apiSnapshots: Map<string, MintMarketSnapshot>;
        let chainSnapshots: Map<string, MintMarketSnapshot>;
        let apiIds: Map<string, string>;
        let chainIds: Map<string, string>;

        before(async function () {
            const apiInstance = await createInstance(ETH_RPC_URL);
            await apiInstance.mintMarkets.fetchMintMarkets({ useApi: true });
            apiSnapshots = collectMintSnapshots(apiInstance);
            apiIds = collectMintIds(apiInstance);

            const chainInstance = await createInstance(ETH_RPC_URL);
            await chainInstance.mintMarkets.fetchMintMarkets({ useApi: false });
            chainSnapshots = collectMintSnapshots(chainInstance);
            chainIds = collectMintIds(chainInstance);

            recordSummary("mainnet mint markets", apiSnapshots.size, chainSnapshots.size);
            warnAboutChainOnlyMarkets(apiSnapshots, chainSnapshots, "mainnet mint markets");
        });

        it("matches markets fetched via API against markets fetched from the blockchain", function () {
            const comparedCount = assertMatchingMarketSets(apiSnapshots, chainSnapshots, "mainnet mint markets");
            this.test!.title += ` (${comparedCount} markets compared)`;
        });

        it("assigns the same id to the same market regardless of fetch source", function () {
            assertSameIdForSameMarket(apiIds, chainIds, "mainnet mint markets");
        });
    });

    describe("Optimism lend markets (v1)", function () {
        let apiSnapshots: Map<string, LendMarketSnapshot>;
        let chainSnapshots: Map<string, LendMarketSnapshot>;
        let apiNames: Map<string, string>;
        let chainNames: Map<string, string>;
        let apiIds: Map<string, string>;
        let chainIds: Map<string, string>;

        before(async function () {
            const apiInstance = await createInstance(OP_RPC_URL);
            await apiInstance.lendMarkets.fetchMarkets({ useApi: true, version: "v1" });
            apiSnapshots = collectLendSnapshots(apiInstance);
            apiNames = collectLendNames(apiInstance);
            apiIds = collectLendIds(apiInstance);

            const chainInstance = await createInstance(OP_RPC_URL);
            await chainInstance.lendMarkets.fetchMarkets({ useApi: false, version: "v1" });
            chainSnapshots = collectLendSnapshots(chainInstance);
            chainNames = collectLendNames(chainInstance);
            chainIds = collectLendIds(chainInstance);

            recordSummary("optimism lend v1", apiSnapshots.size, chainSnapshots.size);
            warnAboutChainOnlyMarkets(apiSnapshots, chainSnapshots, "optimism lend v1");
        });

        it("matches markets fetched via API against markets fetched from the blockchain", function () {
            const comparedCount = assertMatchingMarketSets(apiSnapshots, chainSnapshots, "optimism lend markets");
            this.test!.title += ` (${comparedCount} markets compared)`;
        });

        it("has a non-empty name for every market from both sources", function () {
            for (const [vault, name] of apiNames) assert.isNotEmpty(name, `API name missing for vault ${vault}`);
            for (const [vault, name] of chainNames) assert.isNotEmpty(name, `on-chain name missing for vault ${vault}`);
        });

        it("assigns the same id to the same market regardless of fetch source", function () {
            assertSameIdForSameMarket(apiIds, chainIds, "optimism lend markets");
        });
    });

    // LlamaLend v2 has no API yet (fetchMarkets throws for useApi:true + version:'v2'),
    // so instead of an API-vs-chain comparison this is an on-chain sanity check.
    describe("Optimism lend markets (v2, LlamaLend v2, on-chain only)", function () {
        let snapshots: Map<string, LendMarketSnapshot>;

        before(async function () {
            const instance = await createInstance(OP_RPC_URL);
            await instance.lendMarkets.fetchMarkets({ useApi: false, version: "v2" });
            snapshots = collectLendSnapshots(instance);

            recordOnChainOnlySummary("optimism lend v2", snapshots.size);
        });

        it("finds at least one v2 market on-chain", function () {
            assert.isAbove(snapshots.size, 0, "No v2 markets found on Optimism");
            this.test!.title += ` (found ${snapshots.size})`;
        });

        it("every v2 market has valid addresses and coin data", function () {
            for (const [vault, market] of snapshots) {
                assert.equal(market.version, "v2");
                assert.equal(market.addresses.vault, vault);

                (["amm", "controller", "borrowed_token", "collateral_token", "monetary_policy", "vault"] as const)
                    .forEach((key) => {
                        assert.notEqual(
                            market.addresses[key],
                            toLower(ethers.ZeroAddress),
                            `v2 market ${vault}: ${key} should not be the zero address`
                        );
                    });

                assert.isNotEmpty(market.borrowed_token.symbol, `v2 market ${vault}: borrowed token symbol is empty`);
                assert.isAbove(market.borrowed_token.decimals, 0, `v2 market ${vault}: borrowed token decimals invalid`);
                assert.isNotEmpty(market.collateral_token.symbol, `v2 market ${vault}: collateral token symbol is empty`);
                assert.isAbove(market.collateral_token.decimals, 0, `v2 market ${vault}: collateral token decimals invalid`);
            }
        });
    });
});
