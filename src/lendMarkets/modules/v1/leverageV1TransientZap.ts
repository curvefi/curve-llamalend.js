import { LeverageV1BaseModule } from "./leverageV1Base.js";
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

export class LeverageV1TransientZapModule extends LeverageV1BaseModule {
    protected override _getLeverageZapAddress(): string {
        return this.llamalend.constants.ALIASES.leverage_zap_v2_transient;
    }

    protected override _zapMaxBorrowableCall(
        _userCollateral: bigint, _leverageCollateral: bigint, N: number | bigint, _pAvg: bigint
    ): Promise<bigint> {
        const contract = this.llamalend.contracts[this._getLeverageZapAddress()].contract;
        const _user = this.llamalend.signerAddress || this.llamalend.constants.ZERO_ADDRESS;
        return contract.max_borrowable(this.market.addresses.controller, _userCollateral, _leverageCollateral, N, _pAvg, _user);
    }

    protected override _zapMaxBorrowableMulticallCall(
        _userCollateral: bigint, _leverageCollateral: bigint, N: number | bigint, _pAvg: bigint
    ): any {
        const contract = this.llamalend.contracts[this._getLeverageZapAddress()].multicallContract;
        const _user = this.llamalend.signerAddress || this.llamalend.constants.ZERO_ADDRESS;
        return contract.max_borrowable(this.market.addresses.controller, _userCollateral, _leverageCollateral, N, _pAvg, _user);
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
        _stateCollateral: bigint,
        _userCollateral: bigint,
        _minRecv: bigint,
        router: string,
        exchangeCalldata: string,
        estimateGas: boolean
    ): Promise<string | TGas> {
        const contract = this.llamalend.contracts[this._getLeverageZapAddress()].contract;
        const controllerId = this._getMarketId();
        const _walletDDebt = BigInt(0);
        const _collateralToSpend = _stateCollateral;

        const gas = await contract.repay.estimateGas(
            controllerId,
            _walletDDebt,
            _collateralToSpend,
            _minRecv,
            router,
            exchangeCalldata,
            MAX_ACTIVE_BAND,
            { ...this.llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.repay(
            controllerId,
            _walletDDebt,
            _collateralToSpend,
            _minRecv,
            router,
            exchangeCalldata,
            MAX_ACTIVE_BAND,
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
