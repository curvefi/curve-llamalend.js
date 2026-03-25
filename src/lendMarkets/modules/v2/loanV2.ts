import { LoanBaseModule } from "../common/loanBase.js";
import { ILoanV2 } from "../../interfaces/v2";
import { TGas, TAmount } from "../../../interfaces";
import {
    _getAddress,
    formatUnits,
    parseUnits,
    smartNumber,
    _mulBy1_3,
    DIGas,
} from "../../../utils";

export class LoanV2Module extends LoanBaseModule implements ILoanV2 {
    public async createLoanHealth(collateral: number | string, debt: number | string, range: number, full = true): Promise<string> {
        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);
        const address = _getAddress.call(this.llamalend, '');

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;

        const _health = await contract.create_loan_health_preview(_collateral, _debt, range, address, full, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }

    public async addCollateralHealth(collateral: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _health = await contract.add_collateral_health_preview(_collateral, address, address, full, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }

    public async removeCollateralHealth(collateral: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _health = await contract.remove_collateral_health_preview(_collateral, address, full, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }

    public async borrowMoreHealth(collateral: number | string, debt: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _health = await contract.borrow_more_health_preview(_collateral, _debt, address, full, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }

    public async repayHealth({ debt, shrink = false, full = true, address = "" }: { debt: number | string; shrink?: boolean; full?: boolean; address?: string }): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _debt = parseUnits(debt);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _health = await contract.repay_health_preview(0, _debt, address, address, shrink, full, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }

    protected _maxBorrowable = async (collateralAmount: TAmount, range?: number): Promise<bigint> => {
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const collateral = parseUnits(collateralAmount, this.market.collateral_token.decimals)
        const address = _getAddress.call(this.llamalend, '');
        const N = range ? BigInt(range) : BigInt(0);

        return contract.max_borrowable(collateral, N, address, this.llamalend.constantOptions);
    }

    protected async _calcN1(_collateral: bigint, _debt: bigint, range: number): Promise<bigint> {
        this._checkRange(range);
        const address = _getAddress.call(this.llamalend, '');

        return await this.llamalend.contracts[this.market.addresses.controller].contract.calculate_debt_n1(_collateral, _debt, range, address, this.llamalend.constantOptions);
    }

    protected async _calcN1AllRanges(_collateral: bigint, _debt: bigint, maxN: number): Promise<bigint[]> {
        const calls = [];
        const address = _getAddress.call(this.llamalend, '');

        for (let N = this.market.minBands; N <= maxN; N++) {
            calls.push(this.llamalend.contracts[this.market.addresses.controller].multicallContract.calculate_debt_n1(_collateral, _debt, N, address));
        }
        return await this.llamalend.multicallProvider.all(calls) as bigint[];
    }

    protected _getMaxBorrowableCall(_collateral: bigint, N: number): any {
        const address = _getAddress.call(this.llamalend, '');
        return this.llamalend.contracts[this.market.addresses.controller].multicallContract.max_borrowable(_collateral, N, address);
    }

    protected async _repayBands({ debt, address, shrink = false }: { debt: number | string, address: string, shrink?: boolean }): Promise<[bigint, bigint]> {
        const { _collateral: _currentCollateral, _borrowed, _debt: _currentDebt, _N } = await this.market.userPosition.userStateBigInt(address);
        if (_currentDebt === BigInt(0)) throw Error(`Loan for ${address} does not exist`);

        if (_borrowed > BigInt(0) && !shrink) {
            return await this.market.userPosition.userBandsBigInt(address) as [bigint, bigint];
        }

        const _debtRepaid = parseUnits(debt, this.market.borrowed_token.decimals);

        let newN = _N;
        let _debt: bigint;

        if (shrink) {
            _debt = _currentDebt - _debtRepaid - _borrowed;
            const [n2] = await this.market.userPosition.userBandsBigInt(address) as [bigint, bigint];
            const { activeBand } = await this.market.stats.bandsInfo();
            newN = n2 - BigInt(activeBand);
        } else {
            _debt = _currentDebt - _debtRepaid;
        }

        const _n1 = await this._calcN1(_currentCollateral, _debt, Number(newN));
        const _n2 = _n1 + newN - BigInt(1);

        return [_n2, _n1];
    }

    public async repayBands({ debt, address = "", shrink = false }: { debt: number | string; address?: string; shrink?: boolean }): Promise<[number, number]> {
        const [_n2, _n1] = await this._repayBands({ debt, address, shrink });

        return [Number(_n2), Number(_n1)];
    }

    public async repayPrices({ debt, address = "", shrink = false }: { debt: number | string; address?: string; shrink?: boolean }): Promise<string[]> {
        const [_n2, _n1] = await this._repayBands({ debt, address, shrink });

        return await this.market.prices.getPrices(_n2, _n1);
    }

    protected async _createLoanContractCall(
        _collateral: bigint, _debt: bigint, range: number, estimateGas: boolean
    ): Promise<string | TGas> {
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _for = _getAddress.call(this.llamalend, '');
        const gas = await contract.create_loan.estimateGas(
            _collateral, _debt, range, _for,
            this.llamalend.constants.ZERO_ADDRESS, "0x",
            { ...this.llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.create_loan(
            _collateral, _debt, range, _for,
            this.llamalend.constants.ZERO_ADDRESS, "0x",
            { ...this.llamalend.options, gasLimit }
        )).hash;
    }

    protected async _borrowMoreContractCall(
        _collateral: bigint, _debt: bigint, estimateGas: boolean
    ): Promise<string | TGas> {
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _for = _getAddress.call(this.llamalend, '');
        const gas = await contract.borrow_more.estimateGas(
            _collateral, _debt, _for,
            this.llamalend.constants.ZERO_ADDRESS, "0x",
            { ...this.llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.borrow_more(
            _collateral, _debt, _for,
            this.llamalend.constants.ZERO_ADDRESS, "0x",
            { ...this.llamalend.options, gasLimit }
        )).hash;
    }

    protected async _repayContractCall(
        { _debt, address, n, estimateGas, shrink = false }: { _debt: bigint, address: string, n: number | bigint, estimateGas: boolean, shrink?: boolean }
    ): Promise<string | TGas> {
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.repay.estimateGas(
            _debt, address, n,
            this.llamalend.constants.ZERO_ADDRESS, "0x", shrink,
            { ...this.llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.repay(
            _debt, address, n,
            this.llamalend.constants.ZERO_ADDRESS, "0x", shrink,
            { ...this.llamalend.options, gasLimit }
        )).hash;
    }

    protected async _partialLiquidateContractCall(
        address: string, _minAmount: bigint, frac: string, estimateGas: boolean
    ): Promise<string | TGas> {
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.liquidate.estimateGas(
            address, _minAmount, frac,
            this.llamalend.constants.ZERO_ADDRESS, "0x",
            this.llamalend.constantOptions
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.liquidate(
            address, _minAmount, frac,
            this.llamalend.constants.ZERO_ADDRESS, "0x",
            { ...this.llamalend.options, gasLimit }
        )).hash;
    }

}
