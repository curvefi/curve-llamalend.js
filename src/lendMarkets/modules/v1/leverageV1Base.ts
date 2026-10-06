import { LeverageZapV2BaseModule } from "../common/leverageZapV2Base.js";

export abstract class LeverageV1BaseModule extends LeverageZapV2BaseModule {
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
}
