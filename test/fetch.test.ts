import { assert } from "chai";
import lending from "../src/index.js";
import {OneWayMarketTemplate} from "../src/markets";

function cloneDeep<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (typeof obj === 'function') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return (obj.map((item) => cloneDeep(item)) as unknown) as T;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as unknown as T;
    }

    if (obj instanceof Set) {
        return new Set(Array.from(obj).map((item) => cloneDeep(item))) as unknown as T;
    }

    if (obj instanceof Map) {
        return new Map(Array.from(obj.entries()).map(([key, value]) => [cloneDeep(key), cloneDeep(value)])) as unknown as T;
    }

    const clonedObj: { [key: string]: any } = {};
    Object.keys(obj).forEach((key) => {
        clonedObj[key] = cloneDeep((obj as { [key: string]: any })[key]);
    });

    return clonedObj as T;
}

type CompareObject = {
    [key: string]: any;
};

const compareObjects = (
    obj1: CompareObject,
    obj2: CompareObject,
    fieldsToExclude: string[] = []
): boolean => {
    function deepEqual(a: any, b: any): boolean {
        if (a === b) return true;
        if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
            return false;
        }

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) {
            return false;
        }

        for (const key of keysA) {
            if (!keysB.includes(key)) {
                return false;
            }

            if (typeof a[key] === "function" || typeof b[key] === "function") {
                continue;
            }

            if (!deepEqual(a[key], b[key])) {
                return false;
            }
        }
        return true;
    }

    function filterFields(obj: CompareObject, fieldsToExclude: string[]): { [key: string]: any } {
        const filteredObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (!fieldsToExclude.includes(key) && typeof obj[key] !== "function") {
                filteredObj[key] = obj[key];
            }
        }
        return filteredObj;
    }

    const filteredObj1 = filterFields(obj1, fieldsToExclude);
    const filteredObj2 = filterFields(obj2, fieldsToExclude);

    return deepEqual(filteredObj1, filteredObj2);
};




const matchTest = (marketAPI: OneWayMarketTemplate, marketContract: OneWayMarketTemplate, id: string) => {
    describe(`${id} match test`, function () {
        it("match", async function () {
            const comparisonResult = compareObjects(marketAPI, marketContract, ['name', 'borrowed_token', 'collateral_token', 'estimateGas', 'createLoanApprove']);
            assert.isTrue(comparisonResult, `Market data for item ${id} does not match.`);
        });
    });
}


describe('Fetch Markets Test', async function () {
    this.timeout(1200000);

    before(async function () {
        await lending.init('JsonRpc', {}, { gasPrice: 0 });
    });

    it('should fetch and compare market lists with and without parameter', async function () {
        await lending.oneWayfactory.fetchMarkets(true);
        const marketsWithDefault = lending.oneWayfactory.getMarketList();

        await lending.oneWayfactory.fetchMarkets(false);
        const marketsWithFalse = lending.oneWayfactory.getMarketList();

        assert.deepEqual(
            marketsWithDefault,
            marketsWithFalse,
            'Market lists should match when fetched with and without the `false` parameter'
        );
    });

    it('should compare market objects from API and Blockchain', async function () {
        await lending.oneWayfactory.fetchMarkets(true);
        const marketListAPI = await lending.oneWayfactory.getMarketList();

        const marketsAPI: Record<string, any> = {};
        marketListAPI.forEach((item: string) => {
            marketsAPI[item] = cloneDeep(lending.getOneWayMarket(item));
        });

        await lending.oneWayfactory.fetchMarkets(false);
        const marketListBlockchain = await lending.oneWayfactory.getMarketList();

        const marketsBlockchain: Record<string, any> = {};
        marketListBlockchain.forEach((item: string) => {
            marketsBlockchain[item] = cloneDeep(lending.getOneWayMarket(item));
        });
        
        marketListAPI.forEach((item: string) => {
            matchTest(marketsAPI[item], marketsBlockchain[item], item);
        });
    });

});




