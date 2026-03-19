import { LoanBaseModule } from "../common/loanBase.js";
import { ILoanV1 } from "../../interfaces/v1/loanV1";
import {
    _getAddress,
    formatUnits,
    parseUnits,
    smartNumber,
    _mulBy1_3,
    DIGas,
} from "../../../utils";
import { TGas, TAmount } from "../../../interfaces";

export class LoanV1Module extends LoanBaseModule implements ILoanV1 {
    protected _maxBorrowable = async (collateralAmount: TAmount, range?: number): Promise<bigint> => {
        const { _collateral: _currentCollateral, _debt: _currentDebt, _N } = await this.market.userPosition.userStateBigInt();
        const _collateral = _currentCollateral + parseUnits(collateralAmount, this.market.collateral_token.decimals);
        const N = range ? BigInt(range) : _N;

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        return (await contract.max_borrowable(_collateral, N, _currentDebt, this.llamalend.constantOptions) - _currentDebt);
    }

    protected _getMaxBorrowableCall(_collateral: bigint, N: number): any {
        return this.llamalend.contracts[this.market.addresses.controller].multicallContract.max_borrowable(_collateral, N, 0);
    }

    protected async _calcN1(_collateral: bigint, _debt: bigint, range: number): Promise<bigint> {
        this._checkRange(range);

        return await this.llamalend.contracts[this.market.addresses.controller].contract.calculate_debt_n1(_collateral, _debt, range, this.llamalend.constantOptions);
    }

    protected async _calcN1AllRanges(_collateral: bigint, _debt: bigint, maxN: number): Promise<bigint[]> {
        const calls = [];

        for (let N = this.market.minBands; N <= maxN; N++) {
            calls.push(this.llamalend.contracts[this.market.addresses.controller].multicallContract.calculate_debt_n1(_collateral, _debt, N));
        }
        return await this.llamalend.multicallProvider.all(calls) as bigint[];
    }

    public async createLoanHealth(collateral: number | string, debt: number | string, range: number, full = true): Promise<string> {
        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _health = await contract.health_calculator(this.llamalend.constants.ZERO_ADDRESS, _collateral, _debt, full, range, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }

    public async borrowMoreHealth(collateral: number | string, debt: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _health = await contract.health_calculator(address, _collateral, _debt, full, 0, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }

    public async addCollateralHealth(collateral: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _health = await contract.health_calculator(address, _collateral, 0, full, 0, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }

    public async removeCollateralHealth(collateral: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals) * BigInt(-1);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _health = await contract.health_calculator(address, _collateral, 0, full, 0, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }

    protected async _repayBands({ debt, address }: { debt: number | string, address: string, shrink?: boolean }): Promise<[bigint, bigint]> {
        const { _collateral: _currentCollateral, _borrowed, _debt: _currentDebt, _N } = await this.market.userPosition.userStateBigInt(address);
        if (_currentDebt === BigInt(0)) throw Error(`Loan for ${address} does not exist`);
        if (_borrowed > BigInt(0)) return await this.market.userPosition.userBandsBigInt(address) as [bigint, bigint];
        const _debt = _currentDebt - parseUnits(debt, this.market.borrowed_token.decimals);
        const _n1 = await this._calcN1(_currentCollateral, _debt, Number(_N));
        const _n2 = _n1 + _N - BigInt(1);

        return [_n2, _n1];
    }

    public async repayBands({ debt, address = "" }: { debt: number | string; address?: string }): Promise<[number, number]> {
        const [_n2, _n1] = await this._repayBands({ debt, address });

        return [Number(_n2), Number(_n1)];
    }

    public async repayPrices({ debt, address = "" }: { debt: number | string; address?: string }): Promise<string[]> {
        const [_n2, _n1] = await this._repayBands({ debt, address });

        return await this.market.prices.getPrices(_n2, _n1);
    }

    protected async _repayContractCall(
        { _debt, address, n, estimateGas }: { _debt: bigint, address: string, n: number | bigint, estimateGas: boolean, shrink?: boolean }
    ): Promise<string | TGas> {
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.repay.estimateGas(_debt, address, n, this.llamalend.constantOptions);
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.repay(_debt, address, n, { ...this.llamalend.options, gasLimit })).hash;
    }

    protected async _createLoanContractCall(
        _collateral: bigint, _debt: bigint, range: number, estimateGas: boolean
    ): Promise<string | TGas> {
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.create_loan.estimateGas(_collateral, _debt, range, { ...this.llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.create_loan(_collateral, _debt, range, { ...this.llamalend.options, gasLimit })).hash;
    }

    protected async _borrowMoreContractCall(
        _collateral: bigint, _debt: bigint, estimateGas: boolean
    ): Promise<string | TGas> {
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.borrow_more.estimateGas(_collateral, _debt, { ...this.llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.borrow_more(_collateral, _debt, { ...this.llamalend.options, gasLimit })).hash;
    }

    protected async _partialLiquidateContractCall(
        address: string, _minAmount: bigint, frac: string, estimateGas: boolean
    ): Promise<string | TGas> {
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = (await contract.liquidate_extended.estimateGas(
            address,
            _minAmount,
            frac,
            this.llamalend.constants.ZERO_ADDRESS,
            [],
            this.llamalend.constantOptions
        ));

        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.liquidate_extended(
            address,
            _minAmount,
            frac,
            this.llamalend.constants.ZERO_ADDRESS,
            [],
            { ...this.llamalend.options, gasLimit }
        )).hash;
    }

    public async repayHealth({ debt, full = true, address = "" }: { debt: number | string; full?: boolean; address?: string }): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _debt = parseUnits(debt) * BigInt(-1);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _health = await contract.health_calculator(address, 0, _debt, full, 0, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }
}
