export interface IPricesV1 {
    A: () => Promise<string>;
    basePrice: () => Promise<string>;
    oraclePrice: () => Promise<string>;
    oraclePriceBand: () => Promise<number>;
    price: () => Promise<string>;
    calcTickPrice: (n: number) => Promise<string>;
    calcBandPrices: (n: number) => Promise<[string, string]>;
    calcRangePct: (range: number) => Promise<string>;
    getPrices: (_n2: bigint, _n1: bigint) => Promise<[string,string]>;
    calcPrices: (_n2: bigint, _n1: bigint) => Promise<[string, string]>;
    checkRange: (range: number) => void;
}