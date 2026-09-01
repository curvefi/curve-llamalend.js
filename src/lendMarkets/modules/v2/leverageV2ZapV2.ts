import { LeverageZapV2BaseModule } from "../common/leverageZapV2Base.js";
import type { TAmount, TGas } from "../../../interfaces";
import {
    _getAddress,
    smartNumber,
    _mulBy1_3,
    DIGas,
    MAX_ACTIVE_BAND,
    hasAllowance,
    ensureAllowance,
    ensureAllowanceEstimateGas,
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
        _debt: bigint,
        _minRecv: bigint,
        range: number,
        router: string,
        exchangeCalldata: string,
        estimateGas: boolean
    ): Promise<string | TGas> {
        const contract = this.llamalend.contracts[this._getLeverageZapAddress()].contract;
        const controllerId = this._getMarketId();

        const gas = await contract.create_loan.estimateGas(
            controllerId,
            _userCollateral,
            _debt,
            range,
            _minRecv,
            router,
            exchangeCalldata,
            { ...this.llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.create_loan(
            controllerId,
            _userCollateral,
            _debt,
            range,
            _minRecv,
            router,
            exchangeCalldata,
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
        const contract = this.llamalend.contracts[this._getLeverageZapAddress()].contract;
        const controllerId = this._getMarketId();

        const gas = await contract.borrow_more.estimateGas(
            controllerId,
            _userCollateral,
            _debt,
            _minRecv,
            router,
            exchangeCalldata,
            { ...this.llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.borrow_more(
            controllerId,
            _userCollateral,
            _debt,
            _minRecv,
            router,
            exchangeCalldata,
            { ...this.llamalend.options, gasLimit }
        )).hash;
    }

    protected override async _repayContractCall(
        _userCollateral: bigint,
        _minRecv: bigint,
        router: string,
        exchangeCalldata: string,
        estimateGas: boolean
    ): Promise<string | TGas> {
        const contract = this.llamalend.contracts[this._getLeverageZapAddress()].contract;
        const controllerId = this._getMarketId();
        const _walletDDebt = BigInt(0);
        const _shrink = false;

        const gas = await contract.repay.estimateGas(
            controllerId,
            _walletDDebt,
            _minRecv,
            router,
            exchangeCalldata,
            MAX_ACTIVE_BAND,
            _shrink,
            { ...this.llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.repay(
            controllerId,
            _walletDDebt,
            _minRecv,
            router,
            exchangeCalldata,
            MAX_ACTIVE_BAND,
            _shrink,
            { ...this.llamalend.options, gasLimit }
        )).hash;
    }

    public override async leverageCreateLoanIsApproved({ userCollateral }: { userCollateral: TAmount }): Promise<boolean> {
        this._checkLeverageZap();
        return await hasAllowance.call(this.llamalend,
            [this.market.collateral_token.address], [userCollateral], this.llamalend.signerAddress, this._getLeverageZapAddress());
    }

    public override async leverageCreateLoanApprove({ userCollateral, isMax = false }: { userCollateral: TAmount, isMax?: boolean }): Promise<string[]> {
        this._checkLeverageZap();
        return await ensureAllowance.call(this.llamalend,
            [this.market.collateral_token.address], [userCollateral], this._getLeverageZapAddress(), isMax);
    }

    public override async leverageCreateLoanApproveEstimateGas({ userCollateral, isMax = false }: { userCollateral: TAmount, isMax?: boolean }): Promise<TGas> {
        this._checkLeverageZap();
        return await ensureAllowanceEstimateGas.call(this.llamalend,
            [this.market.collateral_token.address], [userCollateral], this._getLeverageZapAddress(), isMax);
    }

    public override async leverageRepayIsApproved(): Promise<boolean> {
        this._checkLeverageZap();
        return true;
    }

    public override async leverageRepayApprove(): Promise<string[]> {
        this._checkLeverageZap();
        return [];
    }

    public override async leverageRepayApproveEstimateGas(): Promise<TGas> {
        this._checkLeverageZap();
        return 0;
    }

    public override async leverageIsControllerApproved(address = ""): Promise<boolean> {
        this._checkLeverageZap();
        const owner = _getAddress.call(this.llamalend, address);
        return await this.llamalend.contracts[this.market.addresses.controller].contract.approval(
            owner, this._getLeverageZapAddress(), this.llamalend.constantOptions
        ) as boolean;
    }

    public override async leverageSetControllerApproval(): Promise<string[]> {
        this._checkLeverageZap();
        if (await this.leverageIsControllerApproved()) return [];
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        await this.llamalend.updateFeeData();
        const gas = await contract.approve.estimateGas(this._getLeverageZapAddress(), true, { ...this.llamalend.constantOptions });
        const gasLimit = _mulBy1_3(DIGas(gas));
        return [(await contract.approve(this._getLeverageZapAddress(), true, { ...this.llamalend.options, gasLimit })).hash];
    }

    public override async leverageSetControllerApprovalEstimateGas(): Promise<TGas> {
        this._checkLeverageZap();
        if (await this.leverageIsControllerApproved()) return 0;
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        return smartNumber(await contract.approve.estimateGas(this._getLeverageZapAddress(), true, { ...this.llamalend.constantOptions }));
    }
}
