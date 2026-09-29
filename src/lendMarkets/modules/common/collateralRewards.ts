import memoize from "memoizee";
import type { TGas } from "../../../interfaces";
import type { LendMarketTemplate } from "../../LendMarketTemplate";
import { smartNumber, _mulBy1_3, DIGas } from "../../../utils";
import { Llamalend } from "../../../llamalend";
import LMCallbackABI from '../../../constants/abis/LlamaLendV2LMCallback.json' with {type: 'json'};

export class CollateralRewardsModule {
    private market: LendMarketTemplate;
    private llamalend: Llamalend;

    constructor(market: LendMarketTemplate) {
        this.market = market;
        this.llamalend = market.getLlamalend();
    }

    private _getCallback = memoize(async (): Promise<string> => {
        if (this.market.version !== 'v2') return this.llamalend.constants.ZERO_ADDRESS;

        const ammContract = this.llamalend.contracts[this.market.addresses.amm].contract;
        if (!("liquidity_mining_callback" in ammContract)) return this.llamalend.constants.ZERO_ADDRESS;

        const callback: string = await ammContract.liquidity_mining_callback(this.llamalend.constantOptions);
        if (
            callback &&
            callback !== this.llamalend.constants.ZERO_ADDRESS &&
            !(callback in this.llamalend.contracts)
        ) {
            this.llamalend.setContract(callback, LMCallbackABI);
        }
        return callback;
    }, {
        promise: true,
        maxAge: 60 * 60 * 1000, // 1h
    });

    public async callbackAddress(): Promise<string> {
        return await this._getCallback();
    }

    public async isCollateralRewardEnable(): Promise<boolean> {
        return (await this._getCallback()) !== this.llamalend.constants.ZERO_ADDRESS;
    }

    public async totalCollateral(): Promise<string> {
        const callback = await this._getCallback();
        if (callback === this.llamalend.constants.ZERO_ADDRESS) {
            throw Error(`${this.market.name} has no collateral LM callback`);
        }
        const _amount = await this.llamalend.contracts[callback].contract.total_collateral(this.llamalend.constantOptions);
        return this.llamalend.formatUnits(_amount, this.market.collateral_token.decimals);
    }

    public async userCollateral(address = ""): Promise<string> {
        const callback = await this._getCallback();
        if (callback === this.llamalend.constants.ZERO_ADDRESS) {
            throw Error(`${this.market.name} has no collateral LM callback`);
        }
        address = address || this.llamalend.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const _amount = await this.llamalend.contracts[callback].contract.user_collateral(address, this.llamalend.constantOptions);
        return this.llamalend.formatUnits(_amount, this.market.collateral_token.decimals);
    }

    public async claimableCrv(address = ""): Promise<string> {
        const callback = await this._getCallback();
        if (callback === this.llamalend.constants.ZERO_ADDRESS) {
            throw Error(`${this.market.name} has no collateral LM callback`);
        }
        address = address || this.llamalend.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const _amount = await this.llamalend.contracts[callback].contract.claimable_tokens(address, this.llamalend.constantOptions);
        return this.llamalend.formatUnits(_amount);
    }

    private async _claimCrv(estimateGas: boolean): Promise<string | TGas> {
        const callback = await this._getCallback();
        if (callback === this.llamalend.constants.ZERO_ADDRESS) {
            throw Error(`${this.market.name} has no collateral LM callback`);
        }

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
