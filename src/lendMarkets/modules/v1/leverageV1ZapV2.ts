import { LeverageZapV2BaseModule } from "../common/leverageZapV2Base.js";
import type { TGas } from "../../../interfaces";
import {
    parseUnits,
    smartNumber,
    _mulBy1_3,
    DIGas,
    buildCalldataForLeverageZapV2,
} from "../../../utils";

export class LeverageV1ZapV2Module extends LeverageZapV2BaseModule {
    protected override _getLeverageZapAddress(): string {
        return this.llamalend.constants.ALIASES.leverage_zap_v2;
    }

    protected override async _getMaxAdditionalBorrowable(
        _stateCollateral: bigint, _dCollateral: bigint, _N: bigint, _stateDebt: bigint
    ): Promise<bigint> {
        const result = await this.llamalend.contracts[this.market.addresses.controller].contract.max_borrowable(
            _stateCollateral + _dCollateral, _N, _stateDebt, this.llamalend.constantOptions
        );
        return result - _stateDebt;
    }

    protected override async _calcDebtN1Call(_collateral: bigint, _debt: bigint, N: number | bigint): Promise<bigint> {
        return await this.llamalend.contracts[this.market.addresses.controller].contract.calculate_debt_n1(
            _collateral, _debt, N, this.llamalend.constantOptions
        );
    }

    protected override _calcDebtN1MulticallCall(_collateral: bigint, _debt: bigint, N: number | bigint): any {
        return this.llamalend.contracts[this.market.addresses.controller].multicallContract.calculate_debt_n1(
            _collateral, _debt, N
        );
    }

    protected override async _calcCreateLoanHealthCall(
        _collateral: bigint, _dDebt: bigint, N: number | bigint, full: boolean
    ): Promise<bigint> {
        return await this.llamalend.contracts[this.market.addresses.controller].contract.health_calculator(
            this.llamalend.constants.ZERO_ADDRESS, _collateral, _dDebt, full, N, this.llamalend.constantOptions
        ) as bigint;
    }

    protected override async _calcBorrowMoreHealthCall(
        _collateral: bigint, _dDebt: bigint, N: number | bigint, user: string, full: boolean
    ): Promise<bigint> {
        return await this.llamalend.contracts[this.market.addresses.controller].contract.health_calculator(
            user, _collateral, _dDebt, full, N, this.llamalend.constantOptions
        ) as bigint;
    }

    protected override async _calcRepayHealthCall(
        _dCollateral: bigint, _dDebt: bigint, N: number | bigint, user: string, full: boolean
    ): Promise<bigint> {
        return await this.llamalend.contracts[this.market.addresses.controller].contract.health_calculator(
            user, _dCollateral, _dDebt, full, N, this.llamalend.constantOptions
        ) as bigint;
    }

    protected override async _createLoanContractCall(
        _userCollateral: bigint,
        _userBorrowed: bigint,
        _debt: bigint,
        _minRecv: bigint,
        range: number,
        router: string,
        exchangeCalldata: string,
        estimateGas: boolean
    ): Promise<string | TGas> {
        const zapCalldata = buildCalldataForLeverageZapV2(router, exchangeCalldata);
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.create_loan_extended.estimateGas(
            _userCollateral,
            _debt,
            range,
            this._getLeverageZapAddress(),
            [0, parseUnits(this._getMarketId(), 0), _userBorrowed, _minRecv],
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
            [0, parseUnits(this._getMarketId(), 0), _userBorrowed, _minRecv],
            zapCalldata,
            { ...this.llamalend.options, gasLimit }
        )).hash;
    }

    protected override async _borrowMoreContractCall(
        _userCollateral: bigint,
        _userBorrowed: bigint,
        _debt: bigint,
        _minRecv: bigint,
        router: string,
        exchangeCalldata: string,
        estimateGas: boolean
    ): Promise<string | TGas> {
        const zapCalldata = buildCalldataForLeverageZapV2(router, exchangeCalldata);
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.borrow_more_extended.estimateGas(
            _userCollateral,
            _debt,
            this._getLeverageZapAddress(),
            [0, parseUnits(this._getMarketId(), 0), _userBorrowed, _minRecv],
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
            [0, parseUnits(this._getMarketId(), 0), _userBorrowed, _minRecv],
            zapCalldata,
            { ...this.llamalend.options, gasLimit }
        )).hash;
    }

    protected override async _repayContractCall(
        _userCollateral: bigint,
        _userBorrowed: bigint,
        _minRecv: bigint,
        router: string,
        exchangeCalldata: string,
        estimateGas: boolean
    ): Promise<string | TGas> {
        const zapCalldata = buildCalldataForLeverageZapV2(router, exchangeCalldata);
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.repay_extended.estimateGas(
            this._getLeverageZapAddress(),
            [0, parseUnits(this._getMarketId(), 0), _userCollateral, _userBorrowed, _minRecv],
            zapCalldata
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.repay_extended(
            this._getLeverageZapAddress(),
            [0, parseUnits(this._getMarketId(), 0), _userCollateral, _userBorrowed, _minRecv],
            zapCalldata,
            { ...this.llamalend.options, gasLimit }
        )).hash;
    }
}
