import memoize from "memoizee";
import type { TGas } from "../../../interfaces";
import type { LendMarketTemplate } from "../../LendMarketTemplate";
import { smartNumber, _mulBy1_3, DIGas, _getUsdRate, toBN } from "../../../utils";
import { Llamalend } from "../../../llamalend";
import { _isGaugeKilled, _isGaugeRegistered } from "./gaugeStatus";
import LMCallbackABI from '../../../constants/abis/LlamaLendV2LMCallback.json' with {type: 'json'};

export class CollateralRewardsModule {
    private market: LendMarketTemplate;
    private llamalend: Llamalend;

    constructor(market: LendMarketTemplate) {
        this.market = market;
        this.llamalend = market.getLlamalend();
    }

    private _resolveCallback = memoize(async (): Promise<string> => {
        if (this.market.version !== 'v2') return this.llamalend.constants.ZERO_ADDRESS;

        const ammContract = this.llamalend.contracts[this.market.addresses.amm].contract;
        if (!("liquidity_mining_callback" in ammContract)) return this.llamalend.constants.ZERO_ADDRESS;

        const callback: string = await ammContract.liquidity_mining_callback(this.llamalend.constantOptions);
        if (!(callback in this.llamalend.contracts)) {
            this.llamalend.setContract(callback, LMCallbackABI);
        }
        return callback;
    }, {
        promise: true,
        maxAge: 60 * 60 * 1000, // 1h
    });

    private async _getCallback(): Promise<string> {
        const callback = await this._resolveCallback();
        if (callback === this.llamalend.constants.ZERO_ADDRESS) {
            throw Error(`${this.market.name} has no collateral LM callback`);
        }
        return callback;
    }

    public async callbackAddress(): Promise<string> {
        return await this._resolveCallback();
    }

    public async isCollateralRewardEnable(): Promise<boolean> {
        return (await this._resolveCallback()) !== this.llamalend.constants.ZERO_ADDRESS;
    }

    // The LM callback behaves as a DAO gauge (indexed by the prices API, registered in the
    // GaugeController). `null` only when the market has no callback; throws if the status can't be read.
    public async isCallbackKilled(): Promise<boolean | null> {
        return _isGaugeKilled(this.llamalend, await this._resolveCallback());
    }

    public async isCallbackRegistered(): Promise<boolean | null> {
        return _isGaugeRegistered(this.llamalend, await this._resolveCallback());
    }

    public async stats(): Promise<{ crvApr: number }> {
        const callback = await this._resolveCallback();
        if (callback === this.llamalend.constants.ZERO_ADDRESS) return { crvApr: 0 };
        if (await _isGaugeKilled(this.llamalend, callback)) return { crvApr: 0 };

        const callbackContract = this.llamalend.contracts[callback].contract;
        const [_inflationRate, _totalCollateral] = await Promise.all([
            callbackContract.inflation_rate(this.llamalend.constantOptions),
            callbackContract.total_collateral(this.llamalend.constantOptions),
        ]);

        let inflationRateBN = toBN(_inflationRate);
        if (this.llamalend.chainId === 1) {
            const gaugeController = this.llamalend.contracts[this.llamalend.constants.ALIASES.gauge_controller].contract;
            const weightBN = toBN(await gaugeController.gauge_relative_weight(callback, this.llamalend.constantOptions));
            inflationRateBN = inflationRateBN.times(weightBN);
        }

        const totalCollateralBN = toBN(_totalCollateral, this.market.collateral_token.decimals);
        if (inflationRateBN.eq(0) || totalCollateralBN.eq(0)) return { crvApr: 0 };

        const crvPrice = await _getUsdRate.call(this.llamalend, this.llamalend.constants.ALIASES.crv);
        const collateralPrice = await _getUsdRate.call(this.llamalend, this.market.addresses.collateral_token);

        // CRV paid per second as a fraction of the total collateral value, annualized (no compounding).
        const ratePerSecond = inflationRateBN.times(crvPrice).div(totalCollateralBN.times(collateralPrice));
        const crvApr = ratePerSecond.times(31536000).times(100).toNumber();
        return { crvApr };
    }

    public async totalCollateral(): Promise<string> {
        const callback = await this._getCallback();
        const _amount = await this.llamalend.contracts[callback].contract.total_collateral(this.llamalend.constantOptions);
        return this.llamalend.formatUnits(_amount, this.market.collateral_token.decimals);
    }

    public async userCollateral(address = ""): Promise<string> {
        const callback = await this._getCallback();
        address = address || this.llamalend.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const _amount = await this.llamalend.contracts[callback].contract.user_collateral(address, this.llamalend.constantOptions);
        return this.llamalend.formatUnits(_amount, this.market.collateral_token.decimals);
    }

    public async claimableCrv(address = ""): Promise<string> {
        const callback = await this._getCallback();
        address = address || this.llamalend.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const _amount = await this.llamalend.contracts[callback].contract.claimable_tokens(address, this.llamalend.constantOptions);
        return this.llamalend.formatUnits(_amount);
    }

    private async _claimCrv(estimateGas: boolean): Promise<string | TGas> {
        const callback = await this._getCallback();

        // On mainnet ALIASES.minter is the CRV Minter; on sidechains it is the gauge factory. Both expose mint(gauge).
        const contract = this.llamalend.contracts[this.llamalend.constants.ALIASES.minter].contract;

        const gas = await contract.mint.estimateGas(callback, this.llamalend.constantOptions);
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.mint(callback, { ...this.llamalend.options, gasLimit })).hash;
    }

    public async claimCrvEstimateGas(): Promise<TGas> {
        return await this._claimCrv(true) as TGas;
    }

    public async claimCrv(): Promise<string> {
        return await this._claimCrv(false) as string;
    }
}
