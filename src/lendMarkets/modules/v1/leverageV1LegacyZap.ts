import { LeverageV1BaseModule } from "./leverageV1Base.js";
import type { TGas } from "../../../interfaces";
import {
    parseUnits,
    smartNumber,
    _mulBy1_3,
    DIGas,
    buildCalldataForLeverageZapV2,
} from "../../../utils";

export class LeverageV1LegacyZapModule extends LeverageV1BaseModule {
    protected override _getLeverageZapAddress(): string {
        return this.llamalend.constants.ALIASES.leverage_zap_v2;
    }

    protected override async _createLoanContractCall(
        _userCollateral: bigint,
        _debt: bigint,
        _minRecv: bigint,
        range: number,
        router: string,
        exchangeCalldata: string,
        estimateGas: boolean
    ): Promise<string | TGas> {
        const zapCalldata = buildCalldataForLeverageZapV2({controllerId: parseUnits(this._getMarketId(), 0), _minRecv ,router, exchangeCalldata});
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.create_loan_extended.estimateGas(
            _userCollateral,
            _debt,
            range,
            this._getLeverageZapAddress(),
            [],
            zapCalldata,
            { ...this.llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.create_loan_extended(
            _userCollateral,
            _debt,
            range,
            this._getLeverageZapAddress(),
            [],
            zapCalldata,
            { ...this.llamalend.options, gasLimit }
        )).hash;
    }

    protected override async _borrowMoreContractCall(
        _userCollateral: bigint,
        _debt: bigint,
        _minRecv: bigint,
        router: string,
        exchangeCalldata: string,
        estimateGas: boolean
    ): Promise<string | TGas> {
        const zapCalldata = buildCalldataForLeverageZapV2({controllerId: parseUnits(this._getMarketId(), 0), _minRecv,router, exchangeCalldata});
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.borrow_more_extended.estimateGas(
            _userCollateral,
            _debt,
            this._getLeverageZapAddress(),
            [],
            zapCalldata,
            { ...this.llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.borrow_more_extended(
            _userCollateral,
            _debt,
            this._getLeverageZapAddress(),
            [],
            zapCalldata,
            { ...this.llamalend.options, gasLimit }
        )).hash;
    }

    protected override async _repayContractCall(
        _stateCollateral: bigint,
        _userCollateral: bigint,
        _minRecv: bigint,
        router: string,
        exchangeCalldata: string,
        estimateGas: boolean
    ): Promise<string | TGas> {
        const zapCalldata = buildCalldataForLeverageZapV2({controllerId: parseUnits(this._getMarketId(), 0), _minRecv ,router, exchangeCalldata});
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.repay_extended.estimateGas(
            this._getLeverageZapAddress(),
            [],
            zapCalldata
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.repay_extended(
            this._getLeverageZapAddress(),
            [],
            zapCalldata,
            { ...this.llamalend.options, gasLimit }
        )).hash;
    }
}
