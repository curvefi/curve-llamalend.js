import memoize from "memoizee";
import type { LendMarketTemplate } from "../../LendMarketTemplate";
import {
    BN,
    formatUnits,
    _cutZeros,
} from "../../../utils";
import {Llamalend} from "../../../llamalend";
import BigNumber from "bignumber.js";

export class PricesV1Module {
    private market: LendMarketTemplate;
    private llamalend: Llamalend;

    constructor(market: LendMarketTemplate) {
        this.market = market;
        this.llamalend = market.getLlamalend();
    }

    public A = memoize(async(): Promise<string> => {
        const _A = await this.llamalend.contracts[this.market.addresses.amm].contract.A(this.llamalend.constantOptions) as bigint;
        return formatUnits(_A, 0);
    },
    {
        promise: true,
        maxAge: 86400 * 1000, // 1d
    });

    public basePrice = memoize(async(): Promise<string> => {
        const _price = await this.llamalend.contracts[this.market.addresses.amm].contract.get_base_price(this.llamalend.constantOptions) as bigint;
        return formatUnits(_price);
    },
    {
        promise: true,
        maxAge: 86400 * 1000, // 1d
    });

    public oraclePrice = memoize(async (): Promise<string> => {
        const _price = await this.llamalend.contracts[this.market.addresses.amm].contract.price_oracle(this.llamalend.constantOptions) as bigint;
        return formatUnits(_price);
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    public async oraclePriceBand(): Promise<number> {
        const oraclePriceBN = BN(await this.oraclePrice());
        const basePriceBN = BN(await this.basePrice());
        const A_BN = BN(await this.A());
        const multiplier = oraclePriceBN.lte(basePriceBN) ? A_BN.minus(1).div(A_BN) : A_BN.div(A_BN.minus(1));
        const term = oraclePriceBN.lte(basePriceBN) ? 1 : -1;
        const compareFunc = oraclePriceBN.lte(basePriceBN) ?
            (oraclePriceBN: BigNumber, currentTickPriceBN: BigNumber) => oraclePriceBN.lte(currentTickPriceBN) :
            (oraclePriceBN: BigNumber, currentTickPriceBN: BigNumber) => oraclePriceBN.gt(currentTickPriceBN);

        let band = 0;
        let currentTickPriceBN = oraclePriceBN.lte(basePriceBN) ? basePriceBN.times(multiplier) : basePriceBN;
        while (compareFunc(oraclePriceBN, currentTickPriceBN)) {
            currentTickPriceBN = currentTickPriceBN.times(multiplier);
            band += term;
        }

        return band;
    }

    public async price(): Promise<string> {
        const _price = await this.llamalend.contracts[this.market.addresses.amm].contract.get_p(this.llamalend.constantOptions) as bigint;
        return formatUnits(_price);
    }

    public async calcTickPrice(n: number): Promise<string> {
        const basePrice = await this.basePrice();
        const basePriceBN = BN(basePrice);
        const A_BN = BN(await this.A());

        return _cutZeros(basePriceBN.times(A_BN.minus(1).div(A_BN).pow(n)).toFixed(18))
    }

    public async calcBandPrices(n: number): Promise<[string, string]> {
        return [await this.calcTickPrice(n + 1), await this.calcTickPrice(n)]
    }

    public async calcRangePct(range: number): Promise<string> {
        const A_BN = BN(await this.A());
        const startBN = BN(1);
        const endBN = A_BN.minus(1).div(A_BN).pow(range);

        return startBN.minus(endBN).times(100).toFixed(6)
    }
}