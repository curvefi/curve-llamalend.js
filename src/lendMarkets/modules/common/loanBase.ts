import memoize from "memoizee";
import {TAmount, TGas, IPartialFrac} from "../../../interfaces";
import type { LendMarketTemplate } from "../../LendMarketTemplate";
import {
    _getAddress,
    parseUnits,
    BN,
    ensureAllowance,
    hasAllowance,
    ensureAllowanceEstimateGas,
    formatUnits,
    smartNumber,
    _mulBy1_3,
    DIGas, calculateFutureLeverage, MAX_ACTIVE_BAND, fromBN,
} from "../../../utils";
import {Llamalend} from "../../../llamalend";
import BigNumber from "bignumber.js";
import {_getUserCollateral} from "../../../external-api";
export class LoanBaseModule {
    protected market: LendMarketTemplate;
    protected llamalend: Llamalend;

    constructor(market: LendMarketTemplate) {
        this.market = market;
        this.llamalend = market.getLlamalend();
    }

    public _checkRange(range: number): void {
        if (range < this.market.minBands) throw Error(`range must be >= ${this.market.minBands}`);
        if (range > this.market.maxBands) throw Error(`range must be <= ${this.market.maxBands}`);
    }

    public async createLoanMaxRecv(collateral: number | string, range: number): Promise<string> {
        this._checkRange(range);
        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;

        // TODO: currentDebt is no longer passed - now we pass user address or zero address, currentDebt is calculated under the hood
        return formatUnits(await contract.max_borrowable(_collateral, range, 0, this.llamalend.constantOptions), this.market.borrowed_token.decimals);
    }

    public createLoanMaxRecvAllRanges = memoize(async (collateral: number | string): Promise<{ [index: number]: string }> => {
        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);

        const calls = [];
        for (let N = this.market.minBands; N <= this.market.maxBands; N++) {
            // TODO: currentDebt is no longer passed - now we pass user address or zero address, currentDebt is calculated under the hood
            calls.push(this.llamalend.contracts[this.market.addresses.controller].multicallContract.max_borrowable(_collateral, N, 0));
        }
        const _amounts = await this.llamalend.multicallProvider.all(calls) as bigint[];

        const res: { [index: number]: string } = {};
        for (let N = this.market.minBands; N <= this.market.maxBands; N++) {
            res[N] = formatUnits(_amounts[N - this.market.minBands], this.market.borrowed_token.decimals);
        }

        return res;
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    });

    public async getMaxRange(collateral: number | string, debt: number | string): Promise<number> {
        const maxRecv = await this.createLoanMaxRecvAllRanges(collateral);
        for (let N = this.market.minBands; N <= this.market.maxBands; N++) {
            if (BN(debt).gt(BN(maxRecv[N]))) return N - 1;
        }

        return this.market.maxBands;
    }

    private async _calcN1(_collateral: bigint, _debt: bigint, range: number): Promise<bigint> {
        this._checkRange(range);
        // TODO: add 4th parameter - user address in calculate_debt_n1
        return await this.llamalend.contracts[this.market.addresses.controller].contract.calculate_debt_n1(_collateral, _debt, range, this.llamalend.constantOptions);
    }

    private async _calcN1AllRanges(_collateral: bigint, _debt: bigint, maxN: number): Promise<bigint[]> {
        const calls = [];
        // TODO: add 4th parameter - user address in calculate_debt_n1
        for (let N = this.market.minBands; N <= maxN; N++) {
            calls.push(this.llamalend.contracts[this.market.addresses.controller].multicallContract.calculate_debt_n1(_collateral, _debt, N));
        }
        return await this.llamalend.multicallProvider.all(calls) as bigint[];
    }

    private async _createLoanBands(collateral: number | string, debt: number | string, range: number): Promise<[bigint, bigint]> {
        const _n1 = await this._calcN1(parseUnits(collateral, this.market.collateral_token.decimals), parseUnits(debt, this.market.borrowed_token.decimals), range);
        const _n2 = _n1 + BigInt(range - 1);

        return [_n2, _n1];
    }

    private async _createLoanBandsAllRanges(collateral: number | string, debt: number | string): Promise<{ [index: number]: [bigint, bigint] }> {
        const maxN = await this.getMaxRange(collateral, debt);
        const _n1_arr = await this._calcN1AllRanges(parseUnits(collateral, this.market.collateral_token.decimals), parseUnits(debt, this.market.borrowed_token.decimals), maxN);
        const _n2_arr: bigint[] = [];
        for (let N = this.market.minBands; N <= maxN; N++) {
            _n2_arr.push(_n1_arr[N - this.market.minBands] + BigInt(N - 1));
        }

        const res: { [index: number]: [bigint, bigint] } = {};
        for (let N = this.market.minBands; N <= maxN; N++) {
            res[N] = [_n2_arr[N - this.market.minBands], _n1_arr[N - this.market.minBands]];
        }

        return res;
    }

    public async createLoanBands(collateral: number | string, debt: number | string, range: number): Promise<[number, number]> {
        const [_n2, _n1] = await this._createLoanBands(collateral, debt, range);

        return [Number(_n2), Number(_n1)];
    }

    public async createLoanBandsAllRanges(collateral: number | string, debt: number | string): Promise<{ [index: number]: [number, number] | null }> {
        const _bandsAllRanges = await this._createLoanBandsAllRanges(collateral, debt);

        const bandsAllRanges: { [index: number]: [number, number] | null } = {};
        for (let N = this.market.minBands; N <= this.market.maxBands; N++) {
            if (_bandsAllRanges[N]) {
                bandsAllRanges[N] = _bandsAllRanges[N].map(Number) as [number, number];
            } else {
                bandsAllRanges[N] = null
            }
        }

        return bandsAllRanges;
    }

    public async createLoanPrices(collateral: number | string, debt: number | string, range: number): Promise<string[]> {
        const [_n2, _n1] = await this._createLoanBands(collateral, debt, range);

        return await this.market.prices.getPrices(_n2, _n1);
    }

    public async createLoanPricesAllRanges(collateral: number | string, debt: number | string): Promise<{ [index: number]: [string, string] | null }> {
        const _bandsAllRanges = await this._createLoanBandsAllRanges(collateral, debt);

        const pricesAllRanges: { [index: number]: [string, string] | null } = {};
        for (let N = this.market.minBands; N <= this.market.maxBands; N++) {
            if (_bandsAllRanges[N]) {
                pricesAllRanges[N] = await this.market.prices.calcPrices(..._bandsAllRanges[N]);
            } else {
                pricesAllRanges[N] = null
            }
        }

        return pricesAllRanges;
    }

    public async createLoanHealth(collateral: number | string, debt: number | string, range: number, full = true): Promise<string> {
        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;

        const _health = await contract.health_calculator(this.llamalend.constants.ZERO_ADDRESS, _collateral, _debt, full, range, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }

    public async createLoanIsApproved(collateral: number | string): Promise<boolean> {
        return await hasAllowance.call(this.llamalend, [this.market.collateral_token.address], [collateral], this.llamalend.signerAddress, this.market.addresses.controller);
    }

    private async createLoanApproveEstimateGas (collateral: number | string): Promise<TGas> {
        return await ensureAllowanceEstimateGas.call(this.llamalend, [this.market.collateral_token.address], [collateral], this.market.addresses.controller);
    }

    public async createLoanApprove(collateral: number | string): Promise<string[]> {
        return await ensureAllowance.call(this.llamalend, [this.market.collateral_token.address], [collateral], this.market.addresses.controller);
    }

    private async _createLoan(collateral: number | string, debt: number | string, range: number, estimateGas: boolean): Promise<string | TGas> {
        if (await this.market.userPosition.userLoanExists()) throw Error("Loan already created");
        this._checkRange(range);

        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.create_loan.estimateGas(_collateral, _debt, range, { ...this.llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        // TODO: ABI has changed (see docs)
        return (await contract.create_loan(_collateral, _debt, range, { ...this.llamalend.options, gasLimit })).hash
    }

    public async createLoanEstimateGas(collateral: number | string, debt: number | string, range: number): Promise<TGas> {
        if (!(await this.createLoanIsApproved(collateral))) throw Error("Approval is needed for gas estimation");
        return await this._createLoan(collateral, debt,  range, true) as TGas;
    }

    public async createLoan(collateral: number | string, debt: number | string, range: number): Promise<string> {
        await this.createLoanApprove(collateral);
        return await this._createLoan(collateral, debt, range, false) as string;
    }

    // ---------------- BORROW MORE ----------------

    public async borrowMoreMaxRecv(collateralAmount: number | string): Promise<string> {
        const { _collateral: _currentCollateral, _debt: _currentDebt, _N } = await this.market.userPosition.userStateBigInt();
        const _collateral = _currentCollateral + parseUnits(collateralAmount, this.market.collateral_token.decimals);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _debt: bigint = await contract.max_borrowable(_collateral, _N, _currentDebt, this.llamalend.constantOptions);
        // TODO: max_borrowable(deltaCollateral, _N, user) - debt is now calculated under the hood, return as is
        return formatUnits(_debt - _currentDebt, this.market.borrowed_token.decimals);
    }

    private async _borrowMoreBands(collateral: number | string, debt: number | string): Promise<[bigint, bigint]> {
        const { _collateral: _currentCollateral, _debt: _currentDebt, _N } = await this.market.userPosition.userStateBigInt();
        if (_currentDebt === BigInt(0)) throw Error(`Loan for ${this.llamalend.signerAddress} does not exist`);

        const _collateral = _currentCollateral + parseUnits(collateral, this.market.collateral_token.decimals);
        const _debt = _currentDebt + parseUnits(debt, this.market.borrowed_token.decimals);

        const _n1 = await this._calcN1(_collateral, _debt, Number(_N));
        const _n2 = _n1 + _N - BigInt(1);

        return [_n2, _n1];
    }

    public async borrowMoreBands(collateral: number | string, debt: number | string): Promise<[number, number]> {
        const [_n2, _n1] = await this._borrowMoreBands(collateral, debt);

        return [Number(_n2), Number(_n1)];
    }

    public async borrowMorePrices(collateral: number | string, debt: number | string): Promise<string[]> {
        const [_n2, _n1] = await this._borrowMoreBands(collateral, debt);

        return await this.market.prices.getPrices(_n2, _n1);
    }

    public async borrowMoreHealth(collateral: number | string, debt: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _health = await contract.health_calculator(address, _collateral, _debt, full, 0, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }

    public async borrowMoreIsApproved(collateral: number | string): Promise<boolean> {
        return await hasAllowance.call(this.llamalend, [this.market.addresses.collateral_token], [collateral], this.llamalend.signerAddress, this.market.addresses.controller);
    }

    private async borrowMoreApproveEstimateGas (collateral: number | string): Promise<TGas> {
        return await ensureAllowanceEstimateGas.call(this.llamalend, [this.market.addresses.collateral_token], [collateral], this.market.addresses.controller);
    }

    public async borrowMoreApprove(collateral: number | string): Promise<string[]> {
        return await ensureAllowance.call(this.llamalend, [this.market.addresses.collateral_token], [collateral], this.market.addresses.controller);
    }

    private async _borrowMore(collateral: number | string, debt: number | string, estimateGas: boolean): Promise<string | TGas> {
        const { borrowed, debt: currentDebt } = await this.market.userPosition.userState();
        if (Number(currentDebt) === 0) throw Error(`Loan for ${this.llamalend.signerAddress} does not exist`);
        if (Number(borrowed) > 0) throw Error(`User ${this.llamalend.signerAddress} is already in liquidation mode`);

        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.borrow_more.estimateGas(_collateral, _debt, { ...this.llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.borrow_more(_collateral, _debt, { ...this.llamalend.options, gasLimit })).hash
    }

    public async borrowMoreEstimateGas(collateral: number | string, debt: number | string): Promise<TGas> {
        if (!(await this.borrowMoreIsApproved(collateral))) throw Error("Approval is needed for gas estimation");
        return await this._borrowMore(collateral, debt, true) as TGas;
    }

    public async borrowMore(collateral: number | string, debt: number | string): Promise<string> {
        await this.borrowMoreApprove(collateral);
        return await this._borrowMore(collateral, debt, false) as string;
    }

    public async borrowMoreFutureLeverage(collateral: number | string, debt: number | string, userAddress = ''): Promise<string> {
        userAddress = _getAddress.call(this.llamalend, userAddress);
        const { stateCollateral, totalDepositFromUser } = await this.market.userPosition.getCurrentLeverageParams(userAddress);

        const collateralFromDebt = await this.market.amm.swapExpected(0, 1, debt);

        const futureCollateralState = BN(stateCollateral).plus(collateralFromDebt);
        const futureTotalDepositFromUserPrecise = BN(totalDepositFromUser).plus(collateral);

        return futureCollateralState.div(futureTotalDepositFromUserPrecise).toString();
    }

    // ---------------- ADD COLLATERAL ----------------

    private async _addCollateralBands(collateral: number | string, address = ""): Promise<[bigint, bigint]> {
        address = _getAddress.call(this.llamalend, address);
        const { _collateral: _currentCollateral, _debt: _currentDebt, _N } = await this.market.userPosition.userStateBigInt(address);
        if (_currentDebt === BigInt(0)) throw Error(`Loan for ${address} does not exist`);

        const _collateral = _currentCollateral + parseUnits(collateral, this.market.collateral_token.decimals);
        const _n1 = await this._calcN1(_collateral, _currentDebt, Number(_N));
        const _n2 = _n1 + _N - BigInt(1);

        return [_n2, _n1];
    }

    public async addCollateralBands(collateral: number | string, address = ""): Promise<[number, number]> {
        const [_n2, _n1] = await this._addCollateralBands(collateral, address);

        return [Number(_n2), Number(_n1)];
    }

    public async addCollateralPrices(collateral: number | string, address = ""): Promise<string[]> {
        const [_n2, _n1] = await this._addCollateralBands(collateral, address);

        return await this.market.prices.getPrices(_n2, _n1);
    }

    public async addCollateralHealth(collateral: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _health = await contract.health_calculator(address, _collateral, 0, full, 0, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }

    public async addCollateralIsApproved(collateral: number | string): Promise<boolean> {
        return await hasAllowance.call(this.llamalend, [this.market.addresses.collateral_token], [collateral], this.llamalend.signerAddress, this.market.addresses.controller);
    }

    private async addCollateralApproveEstimateGas (collateral: number | string): Promise<TGas> {
        return await ensureAllowanceEstimateGas.call(this.llamalend, [this.market.addresses.collateral_token], [collateral], this.market.addresses.controller);
    }

    public async addCollateralApprove(collateral: number | string): Promise<string[]> {
        return await ensureAllowance.call(this.llamalend, [this.market.addresses.collateral_token], [collateral], this.market.addresses.controller);
    }

    private async _addCollateral(collateral: number | string, address: string, estimateGas: boolean): Promise<string | TGas> {
        const { borrowed, debt: currentDebt } = await this.market.userPosition.userState(address);
        if (Number(currentDebt) === 0) throw Error(`Loan for ${address} does not exist`);
        if (Number(borrowed) > 0) throw Error(`User ${address} is already in liquidation mode`);

        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.add_collateral.estimateGas(_collateral, address, { ...this.llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.add_collateral(_collateral, address, { ...this.llamalend.options, gasLimit })).hash
    }

    public async addCollateralEstimateGas(collateral: number | string, address = ""): Promise<TGas> {
        address = _getAddress.call(this.llamalend, address);
        if (!(await this.addCollateralIsApproved(collateral))) throw Error("Approval is needed for gas estimation");
        return await this._addCollateral(collateral, address, true) as TGas;
    }

    public async addCollateral(collateral: number | string, address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        await this.addCollateralApprove(collateral);
        return await this._addCollateral(collateral, address, false) as string;
    }

    public async addCollateralFutureLeverage(collateral: number | string, userAddress = ''): Promise<string> {
        userAddress = _getAddress.call(this.llamalend, userAddress);
        const [userCollateral, {collateral: currentCollateral}] = await Promise.all([
            _getUserCollateral(this.llamalend.constants.NETWORK_NAME, this.market.addresses.controller, userAddress),
            this.market.userPosition.userState(userAddress),
        ]);

        const total_deposit_from_user = userCollateral.total_deposit_from_user_precise;

        return calculateFutureLeverage(currentCollateral, total_deposit_from_user, collateral, 'add');
    }

    // ---------------- REMOVE COLLATERAL ----------------

    public async maxRemovable(): Promise<string> {
        const { _collateral: _currentCollateral, _debt: _currentDebt, _N } = await this.market.userPosition.userStateBigInt();
        const _requiredCollateral = await this.llamalend.contracts[this.market.addresses.controller].contract.min_collateral(_currentDebt, _N, this.llamalend.constantOptions)

        return formatUnits(_currentCollateral - _requiredCollateral, this.market.collateral_token.decimals);
    }

    private async _removeCollateralBands(collateral: number | string): Promise<[bigint, bigint]> {
        const { _collateral: _currentCollateral, _debt: _currentDebt, _N } = await this.market.userPosition.userStateBigInt();
        if (_currentDebt === BigInt(0)) throw Error(`Loan for ${this.llamalend.signerAddress} does not exist`);

        const _collateral = _currentCollateral - parseUnits(collateral, this.market.collateral_token.decimals);
        const _n1 = await this._calcN1(_collateral, _currentDebt, Number(_N));
        const _n2 = _n1 + _N - BigInt(1);

        return [_n2, _n1];
    }

    public async removeCollateralBands(collateral: number | string): Promise<[number, number]> {
        const [_n2, _n1] = await this._removeCollateralBands(collateral);

        return [Number(_n2), Number(_n1)];
    }

    public async removeCollateralPrices(collateral: number | string): Promise<string[]> {
        const [_n2, _n1] = await this._removeCollateralBands(collateral);

        return await this.market.prices.getPrices(_n2, _n1);
    }

    public async removeCollateralHealth(collateral: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals) * BigInt(-1);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _health = await contract.health_calculator(address, _collateral, 0, full, 0, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }

    private async _removeCollateral(collateral: number | string, estimateGas: boolean): Promise<string | TGas> {
        const { borrowed, debt: currentDebt } = await this.market.userPosition.userState();
        if (Number(currentDebt) === 0) throw Error(`Loan for ${this.llamalend.signerAddress} does not exist`);
        if (Number(borrowed) > 0) throw Error(`User ${this.llamalend.signerAddress} is already in liquidation mode`);

        const _collateral = parseUnits(collateral, this.market.collateral_token.decimals);
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.remove_collateral.estimateGas(_collateral, this.llamalend.constantOptions);
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.remove_collateral(_collateral, { ...this.llamalend.options, gasLimit })).hash
    }

    public async removeCollateralEstimateGas(collateral: number | string): Promise<TGas> {
        return await this._removeCollateral(collateral, true) as TGas;
    }

    public async removeCollateral(collateral: number | string): Promise<string> {
        return await this._removeCollateral(collateral, false) as string;
    }

    public async removeCollateralFutureLeverage(collateral: number | string, userAddress = ''): Promise<string> {
        userAddress = _getAddress.call(this.llamalend, userAddress);
        const [userCollateral, {collateral: currentCollateral}] = await Promise.all([
            _getUserCollateral(this.llamalend.constants.NETWORK_NAME, this.market.addresses.controller, userAddress),
            this.market.userPosition.userState(userAddress),
        ]);

        const total_deposit_from_user = userCollateral.total_deposit_from_user_precise;

        return calculateFutureLeverage(currentCollateral, total_deposit_from_user, collateral, 'remove');
    }

    // ---------------- REPAY ----------------
    // TODO: add shrink: bool parameter
    // If bool is true, _N = n2 - n1 + 1 -> _N = n2 - activeBand
    private async _repayBands(debt: number | string, address: string): Promise<[bigint, bigint]> {
        const { _collateral: _currentCollateral, _borrowed, _debt: _currentDebt, _N } = await this.market.userPosition.userStateBigInt(address);
        if (_currentDebt === BigInt(0)) throw Error(`Loan for ${address} does not exist`);
        // && shrink === false
        if (_borrowed > BigInt(0)) return await this.market.userPosition.userBandsBigInt(address) as [bigint, bigint];
        // If shrink == true, then _debt = _currentDebt - parseUnits(debt, this.market.borrowed_token.decimals) - _borrowed
        const _debt = _currentDebt - parseUnits(debt, this.market.borrowed_token.decimals);
        const _n1 = await this._calcN1(_currentCollateral, _debt, Number(_N));
        const _n2 = _n1 + _N - BigInt(1);

        return [_n2, _n1];
    }

    public async repayBands(debt: number | string, address = ""): Promise<[number, number]> {
        const [_n2, _n1] = await this._repayBands(debt, address);

        return [Number(_n2), Number(_n1)];
    }

    public async repayPrices(debt: number | string, address = ""): Promise<string[]> {
        const [_n2, _n1] = await this._repayBands(debt, address);

        return await this.market.prices.getPrices(_n2, _n1);
    }

    public async repayIsApproved(debt: number | string): Promise<boolean> {
        return await hasAllowance.call(this.llamalend, [this.market.borrowed_token.address], [debt], this.llamalend.signerAddress, this.market.addresses.controller);
    }

    private async repayApproveEstimateGas (debt: number | string): Promise<TGas> {
        return await ensureAllowanceEstimateGas.call(this.llamalend, [this.market.borrowed_token.address], [debt], this.market.addresses.controller);
    }

    public async repayApprove(debt: number | string): Promise<string[]> {
        return await ensureAllowance.call(this.llamalend, [this.market.borrowed_token.address], [debt], this.market.addresses.controller);
    }

    private async _repay(debt: number | string, address: string, estimateGas: boolean): Promise<string | TGas> {
        address = _getAddress.call(this.llamalend, address);
        const { debt: currentDebt } = await this.market.userPosition.userState(address);
        if (Number(currentDebt) === 0) throw Error(`Loan for ${address} does not exist`);

        const _debt = parseUnits(debt);
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const [, n1] = await this.market.userPosition.userBands(address);
        const { borrowed } = await this.market.userPosition.userState(address);
        const n = (BN(borrowed).gt(0)) ? MAX_ACTIVE_BAND : n1 - 1;  // In liquidation mode it doesn't matter if active band moves
        const gas = await contract.repay.estimateGas(_debt, address, n, this.llamalend.constantOptions);
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        // TODO: shrink parameter is added, which changes bands calculation
        return (await contract.repay(_debt, address, n, { ...this.llamalend.options, gasLimit })).hash
    }

    public async repayEstimateGas(debt: number | string, address = ""): Promise<TGas> {
        if (!(await this.repayIsApproved(debt))) throw Error("Approval is needed for gas estimation");
        return await this._repay(debt, address, true) as TGas;
    }

    public async repay(debt: number | string, address = ""): Promise<string> {
        await this.repayApprove(debt);
        return await this._repay(debt, address, false) as string;
    }

    public async repayFutureLeverage(debt: number | string, userAddress = ''): Promise<string> {
        userAddress = _getAddress.call(this.llamalend, userAddress);
        const { stateCollateral, totalDepositFromUser } = await this.market.userPosition.getCurrentLeverageParams(userAddress);

        const collateralFromDebt = await this.market.amm.swapExpected(0, 1, debt);

        const futureCollateralState = BN(stateCollateral);
        const futureTotalDepositFromUserPrecise = BN(totalDepositFromUser).plus(collateralFromDebt);

        return futureCollateralState.div(futureTotalDepositFromUserPrecise).toString();
    }

    // ---------------- FULL REPAY ----------------

    private async _fullRepayAmount(address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        // TODO: now debt is _borrowed
        const { debt } = await this.market.userPosition.userState(address);
        return BN(debt).times(1.0001).toString();
    }

    public async fullRepayIsApproved(address = ""): Promise<boolean> {
        address = _getAddress.call(this.llamalend, address);
        const fullRepayAmount = await this._fullRepayAmount(address);
        return await this.repayIsApproved(fullRepayAmount);
    }

    private async fullRepayApproveEstimateGas (address = ""): Promise<TGas> {
        address = _getAddress.call(this.llamalend, address);
        const fullRepayAmount = await this._fullRepayAmount(address);
        return await this.repayApproveEstimateGas(fullRepayAmount);
    }

    public async fullRepayApprove(address = ""): Promise<string[]> {
        address = _getAddress.call(this.llamalend, address);
        const fullRepayAmount = await this._fullRepayAmount(address);
        return await this.repayApprove(fullRepayAmount);
    }

    public async fullRepayEstimateGas(address = ""): Promise<TGas> {
        address = _getAddress.call(this.llamalend, address);
        const fullRepayAmount = await this._fullRepayAmount(address);
        if (!(await this.repayIsApproved(fullRepayAmount))) throw Error("Approval is needed for gas estimation");
        return await this._repay(fullRepayAmount, address, true) as TGas;
    }

    public async fullRepay(address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const fullRepayAmount = await this._fullRepayAmount(address);
        await this.repayApprove(fullRepayAmount);
        return await this._repay(fullRepayAmount, address, false) as string;
    }

    // ---------------- LIQUIDATE ----------------

    public async tokensToLiquidate(address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _tokens = await this.llamalend.contracts[this.market.addresses.controller].contract.tokens_to_liquidate(address, this.llamalend.constantOptions) as bigint;
        return formatUnits(_tokens, this.market.borrowed_token.decimals)
    }

    public async calcPartialFrac(amount: TAmount, address = ""): Promise<IPartialFrac> {
        address = _getAddress.call(this.llamalend, address);
        const tokensToLiquidate = await this.tokensToLiquidate(address);

        const amountBN = BN(amount);
        const tokensToLiquidateBN = BN(tokensToLiquidate);

        if (amountBN.gt(tokensToLiquidateBN)) throw Error("Amount cannot be greater than total tokens to liquidate");
        if (amountBN.lte(0)) throw Error("Amount must be greater than 0");

        // Calculate frac = amount / tokensToLiquidate * 10**18
        // 100% = 10**18
        const fracDecimalBN = amountBN.div(tokensToLiquidateBN);
        const frac = fromBN(fracDecimalBN);
        return {
            frac: frac.toString(),
            fracDecimal: fracDecimalBN.toString(),
            amount: amountBN.toString(),
        };
    }


    public async liquidateIsApproved(address = ""): Promise<boolean> {
        const tokensToLiquidate = await this.tokensToLiquidate(address);
        return await hasAllowance.call(this.llamalend, [this.market.addresses.borrowed_token], [tokensToLiquidate], this.llamalend.signerAddress, this.market.addresses.controller);
    }

    private async liquidateApproveEstimateGas (address = ""): Promise<TGas> {
        const tokensToLiquidate = await this.tokensToLiquidate(address);
        return await ensureAllowanceEstimateGas.call(this.llamalend, [this.market.addresses.borrowed_token], [tokensToLiquidate], this.market.addresses.controller);
    }

    public async liquidateApprove(address = ""): Promise<string[]> {
        const tokensToLiquidate = await this.tokensToLiquidate(address);
        return await ensureAllowance.call(this.llamalend, [this.market.addresses.borrowed_token], [tokensToLiquidate], this.market.addresses.controller);
    }

    private async _liquidate(address: string, slippage: number, estimateGas: boolean): Promise<string | TGas> {
        const { borrowed, debt: currentDebt } = await this.market.userPosition.userState(address);
        if (slippage <= 0) throw Error("Slippage must be > 0");
        if (slippage > 100) throw Error("Slippage must be <= 100");
        if (Number(currentDebt) === 0) throw Error(`Loan for ${address} does not exist`);
        if (Number(borrowed) === 0) throw Error(`User ${address} is not in liquidation mode`);

        const minAmountBN: BigNumber = BN(borrowed).times(100 - slippage).div(100);
        const _minAmount = fromBN(minAmountBN);
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = (await contract.liquidate.estimateGas(address, _minAmount, this.llamalend.constantOptions))
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.liquidate(address, _minAmount, { ...this.llamalend.options, gasLimit })).hash
    }

    private async _partialLiquidate(address: string, partialFrac: IPartialFrac, slippage: number, estimateGas: boolean): Promise<string | TGas> {
        const { borrowed, debt: currentDebt } = await this.market.userPosition.userState(address);
        if (slippage <= 0) throw Error("Slippage must be > 0");
        if (slippage > 100) throw Error("Slippage must be <= 100");
        if (Number(currentDebt) === 0) throw Error(`Loan for ${address} does not exist`);
        if (Number(borrowed) === 0) throw Error(`User ${address} is not in liquidation mode`);

        const frac = partialFrac.frac;
        const fracBN = BN(partialFrac.fracDecimal);

        const borrowedBN = BN(borrowed);
        const expectedBorrowedBN = borrowedBN.times(fracBN);
        const minAmountBN = expectedBorrowedBN.times(100 - slippage).div(100);
        const _minAmount = fromBN(minAmountBN);

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

    public async liquidateEstimateGas(address: string, slippage = 0.1): Promise<TGas> {
        if (!(await this.liquidateIsApproved(address))) throw Error("Approval is needed for gas estimation");
        return await this._liquidate(address, slippage, true) as TGas;
    }

    public async liquidate(address: string, slippage = 0.1): Promise<string> {
        await this.liquidateApprove(address);
        return await this._liquidate(address, slippage, false) as string;
    }

    // ---------------- SELF-LIQUIDATE ----------------

    public async selfLiquidateIsApproved(): Promise<boolean> {
        return await this.liquidateIsApproved()
    }

    private async selfLiquidateApproveEstimateGas (): Promise<TGas> {
        return this.liquidateApproveEstimateGas()
    }

    public async selfLiquidateApprove(): Promise<string[]> {
        return await this.liquidateApprove()
    }

    public async selfLiquidateEstimateGas(slippage = 0.1): Promise<TGas> {
        if (!(await this.selfLiquidateIsApproved())) throw Error("Approval is needed for gas estimation");
        return await this._liquidate(this.llamalend.signerAddress, slippage, true) as TGas;
    }

    public async selfLiquidate(slippage = 0.1): Promise<string> {
        await this.selfLiquidateApprove();
        return await this._liquidate(this.llamalend.signerAddress, slippage, false) as string;
    }

    // ---------------- PARTIAL SELF-LIQUIDATE ----------------

    public async partialSelfLiquidateIsApproved(partialFrac: IPartialFrac): Promise<boolean> {
        return await hasAllowance.call(this.llamalend, [this.market.addresses.borrowed_token], [partialFrac.amount], this.llamalend.signerAddress, this.market.addresses.controller);
    }

    private async partialSelfLiquidateApproveEstimateGas(partialFrac: IPartialFrac): Promise<TGas> {
        return await ensureAllowanceEstimateGas.call(this.llamalend, [this.market.addresses.borrowed_token], [partialFrac.amount], this.market.addresses.controller);
    }

    public async partialSelfLiquidateApprove(partialFrac: IPartialFrac): Promise<string[]> {
        return await ensureAllowance.call(this.llamalend, [this.market.addresses.borrowed_token], [partialFrac.amount], this.market.addresses.controller);
    }

    public async partialSelfLiquidateEstimateGas(partialFrac: IPartialFrac, slippage = 0.1): Promise<TGas> {
        if (!(await this.partialSelfLiquidateIsApproved(partialFrac))) throw Error("Approval is needed for gas estimation");
        return await this._partialLiquidate(this.llamalend.signerAddress, partialFrac, slippage, true) as TGas;
    }

    public async partialSelfLiquidate(partialFrac: IPartialFrac, slippage = 0.1): Promise<string> {
        await this.partialSelfLiquidateApprove(partialFrac);
        return await this._partialLiquidate(this.llamalend.signerAddress, partialFrac, slippage, false) as string;
    }

    public estimateGas = {
        createLoanApprove: this.createLoanApproveEstimateGas.bind(this),
        createLoan: this.createLoanEstimateGas.bind(this),
        borrowMoreApprove: this.borrowMoreApproveEstimateGas.bind(this),
        borrowMore: this.borrowMoreEstimateGas.bind(this),
        addCollateralApprove: this.addCollateralApproveEstimateGas.bind(this),
        addCollateral: this.addCollateralEstimateGas.bind(this),
        removeCollateral: this.removeCollateralEstimateGas.bind(this),
        repayApprove: this.repayApproveEstimateGas.bind(this),
        repay: this.repayEstimateGas.bind(this),
        fullRepayApprove: this.fullRepayApproveEstimateGas.bind(this),
        fullRepay: this.fullRepayEstimateGas.bind(this),
        liquidateApprove: this.liquidateApproveEstimateGas.bind(this),
        liquidate: this.liquidateEstimateGas.bind(this),
        selfLiquidateApprove: this.selfLiquidateApproveEstimateGas.bind(this),
        selfLiquidate: this.selfLiquidateEstimateGas.bind(this),
        partialSelfLiquidateApprove: this.partialSelfLiquidateApproveEstimateGas.bind(this),
        partialSelfLiquidate: this.partialSelfLiquidateEstimateGas.bind(this),
    };

}
