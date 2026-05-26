import { LeverageZapV2BaseModule } from "../common/leverageZapV2Base.js";
import type { TGas } from "../../../interfaces";
import {
    _getAddress,
    smartNumber,
    _mulBy1_3,
    DIGas,
    MAX_ACTIVE_BAND,
    buildCalldataForLeverageZapV2Llv2,
} from "../../../utils";

export class LeverageV2ZapV2Module extends LeverageZapV2BaseModule {
    protected override _getLeverageZapAddress(): string {
        return this.llamalend.constants.ALIASES.leverage_zap_v2_llv2;
    }

    protected override async _getMaxAdditionalBorrowable(
        _stateCollateral: bigint, _dCollateral: bigint, _N: bigint, _stateDebt: bigint, address: string
    ): Promise<bigint> {
        return await this.llamalend.contracts[this.market.addresses.controller].contract.max_borrowable(
            _dCollateral, _N, address, this.llamalend.constantOptions
        );
    }

    protected override async _calcDebtN1Call(_collateral: bigint, _debt: bigint, N: number | bigint): Promise<bigint> {
        const address = _getAddress.call(this.llamalend, '');
        return await this.llamalend.contracts[this.market.addresses.controller].contract.calculate_debt_n1(
            _collateral, _debt, N, address, this.llamalend.constantOptions
        );
    }

    protected override _calcDebtN1MulticallCall(_collateral: bigint, _debt: bigint, N: number | bigint): any {
        const address = _getAddress.call(this.llamalend, '');
        return this.llamalend.contracts[this.market.addresses.controller].multicallContract.calculate_debt_n1(
            _collateral, _debt, N, address
        );
    }

    protected override async _calcCreateLoanHealthCall(
        _collateral: bigint, _dDebt: bigint, N: number | bigint, full: boolean
    ): Promise<bigint> {
        const _for = _getAddress.call(this.llamalend, '');
        return await this.llamalend.contracts[this.market.addresses.controller].contract.create_loan_health_preview(
            _collateral, _dDebt, N, _for, full, this.llamalend.constantOptions
        ) as bigint;
    }

    protected override async _calcBorrowMoreHealthCall(
        _collateral: bigint, _dDebt: bigint, _N: number | bigint, user: string, full: boolean
    ): Promise<bigint> {
        return await this.llamalend.contracts[this.market.addresses.controller].contract.borrow_more_health_preview(
            _collateral, _dDebt, user, full, this.llamalend.constantOptions
        ) as bigint;
    }

    protected override async _calcRepayHealthCall(
        _dCollateral: bigint, _dDebt: bigint, _N: number | bigint, user: string, full: boolean
    ): Promise<bigint> {
        const _dCollateralAbs = _dCollateral < BigInt(0) ? -_dCollateral : _dCollateral;
        const _dDebtAbs = _dDebt < BigInt(0) ? -_dDebt : _dDebt;
        const _shrink = false;
        return await this.llamalend.contracts[this.market.addresses.controller].contract.repay_health_preview(
            _dCollateralAbs, _dDebtAbs, user, _shrink, full, this.llamalend.constantOptions
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
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _for = _getAddress.call(this.llamalend, '');
        const _callbacker = this._getLeverageZapAddress();
        const zapCalldata = buildCalldataForLeverageZapV2Llv2({
            op: 'create_loan',
            controllerId: this._getMarketId(),
            userBorrowed: _userBorrowed,
            minRecv: _minRecv,
            router,
            exchangeCalldata,
        });

        const gas = await contract.create_loan.estimateGas(
            _userCollateral,
            _debt,
            range,
            _for,
            _callbacker,
            zapCalldata,
            { ...this.llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.create_loan(
            _userCollateral,
            _debt,
            range,
            _for,
            _callbacker,
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
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _for = _getAddress.call(this.llamalend, '');
        const _callbacker = this._getLeverageZapAddress();
        const zapCalldata = buildCalldataForLeverageZapV2Llv2({
            op: 'borrow_more',
            controllerId: this._getMarketId(),
            userBorrowed: _userBorrowed,
            minRecv: _minRecv,
            router,
            exchangeCalldata,
        });

        const gas = await contract.borrow_more.estimateGas(
            _userCollateral,
            _debt,
            _for,
            _callbacker,
            zapCalldata,
            { ...this.llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.borrow_more(
            _userCollateral,
            _debt,
            _for,
            _callbacker,
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
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _for = _getAddress.call(this.llamalend, '');
        const _callbacker = this._getLeverageZapAddress();
        const zapCalldata = buildCalldataForLeverageZapV2Llv2({
            op: 'repay',
            controllerId: this._getMarketId(),
            userCollateral: _userCollateral,
            userBorrowed: _userBorrowed,
            minRecv: _minRecv,
            router,
            exchangeCalldata,
        });

        const _walletDDebt = BigInt(0);

        const gas = await contract.repay.estimateGas(
            _walletDDebt,
            _for,
            MAX_ACTIVE_BAND,
            _callbacker,
            zapCalldata,
            false,
            { ...this.llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.repay(
            _walletDDebt,
            _for,
            MAX_ACTIVE_BAND,
            _callbacker,
            zapCalldata,
            false,
            { ...this.llamalend.options, gasLimit }
        )).hash;
    }
}
