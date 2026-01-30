import memoize from "memoizee";
import {TAmount, TGas, IDict, IQuoteOdos} from "../../../interfaces";
import type { LendMarketTemplate } from "../../LendMarketTemplate";
import {
    _getAddress,
    parseUnits,
    BN,
    toBN,
    fromBN,
    ensureAllowance,
    hasAllowance,
    ensureAllowanceEstimateGas,
    formatUnits,
    smartNumber,
    formatNumber,
    _mulBy1_3,
    DIGas,
} from "../../../utils";
import {Llamalend} from "../../../llamalend";
import BigNumber from "bignumber.js";
import {_assembleTxOdos, _getExpectedOdos, _getQuoteOdos} from "../../../external-api";

/**
 * LeverageZapV2 module for LendMarketTemplate
 */
export class LeverageZapV2Module {
    private market: LendMarketTemplate;
    private llamalend: Llamalend;

    constructor(market: LendMarketTemplate) {
        this.market = market;
        this.llamalend = market.getLlamalend();
    }

    private _getMarketId = (): number => Number(this.market.id.split("-").slice(-1)[0]);

    // ============ CREATE LOAN METHODS ============

    private hasLeverage = (): boolean => {
        return this.llamalend.constants.ALIASES.leverage_zap !== this.llamalend.constants.ZERO_ADDRESS &&
            this._getMarketId() >= Number(this.llamalend.constants.ALIASES["leverage_markets_start_id"]);
    }

    private _checkLeverageZap(): void {
        if (!this.hasLeverage()) {
            throw Error("This market does not support leverage");
        }
    }

    private async _get_k_effective_BN(N: number): Promise<BigNumber> {
        // d_k_effective: uint256 = (1 - loan_discount) * sqrt((A-1)/A) / N
        // k_effective = d_k_effective * sum_{0..N-1}(((A-1) / A)**k)
        const { loan_discount, A } = await this.statsParameters();
        const A_BN = BN(A);
        const A_ratio_BN = A_BN.minus(1).div(A_BN);

        const d_k_effective_BN = BN(100).minus(loan_discount).div(100).times(A_ratio_BN.sqrt()).div(N);
        let S = BN(0);
        for (let n = 0; n < N; n++) {
            S = S.plus(A_ratio_BN.pow(n))
        }

        return d_k_effective_BN.times(S);
    }

    private async maxLeverage(N: number): Promise<string> {
        // max_leverage = 1 / (k_effective - 1)
        const k_effective_BN = await this._get_k_effective_BN(N);

        return BN(1).div(BN(1).minus(k_effective_BN)).toString()
    }

    private async leverageCreateLoanMaxRecv(userCollateral: TAmount, userBorrowed: TAmount, range: number):
        Promise<{
            maxDebt: string,
            maxTotalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromMaxDebt: string,
            maxLeverage: string,
            avgPrice: string,
        }> {
        // max_borrowable = userCollateral / (1 / (k_effective * max_p_base) - 1 / p_avg)
        this._checkLeverageZap();
        if (range > 0) this._checkRange(range);
        const _userCollateral = parseUnits(userCollateral, this.market.collateral_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.market.borrowed_token.decimals);

        const oraclePriceBand = await this.oraclePriceBand();
        let pAvgBN = BN(await this.calcTickPrice(oraclePriceBand)); // upper tick of oracle price band
        let maxBorrowablePrevBN = BN(0);
        let maxBorrowableBN = BN(0);
        let _userEffectiveCollateral = BigInt(0);
        let _maxLeverageCollateral = BigInt(0);

        const contract = this.llamalend.contracts[this.llamalend.constants.ALIASES.leverage_zap].contract;
        for (let i = 0; i < 5; i++) {
            maxBorrowablePrevBN = maxBorrowableBN;
            _userEffectiveCollateral = _userCollateral + fromBN(BN(userBorrowed).div(pAvgBN), this.market.collateral_token.decimals);
            let _maxBorrowable = await contract.max_borrowable(this.market.addresses.controller, _userEffectiveCollateral, _maxLeverageCollateral, range, fromBN(pAvgBN));
            _maxBorrowable = _maxBorrowable * BigInt(998) / BigInt(1000)
            if (_maxBorrowable === BigInt(0)) break;
            maxBorrowableBN = toBN(_maxBorrowable, this.market.borrowed_token.decimals);

            if (maxBorrowableBN.minus(maxBorrowablePrevBN).abs().div(maxBorrowablePrevBN).lt(0.0005)) {
                maxBorrowableBN = maxBorrowablePrevBN;
                break;
            }

            // additionalCollateral = (userBorrowed / p) + leverageCollateral
            const _maxAdditionalCollateral = BigInt(await _getExpectedOdos.call(this.llamalend,
                this.market.addresses.borrowed_token, this.market.addresses.collateral_token, _maxBorrowable + _userBorrowed, this.market.addresses.amm));
            pAvgBN = maxBorrowableBN.plus(userBorrowed).div(toBN(_maxAdditionalCollateral, this.market.collateral_token.decimals));
            _maxLeverageCollateral = _maxAdditionalCollateral - fromBN(BN(userBorrowed).div(pAvgBN), this.market.collateral_token.decimals);
        }

        const userEffectiveCollateralBN = maxBorrowableBN.gt(0) ? toBN(_userEffectiveCollateral, this.market.collateral_token.decimals) : BN(0);
        const maxLeverageCollateralBN = toBN(_maxLeverageCollateral, this.market.collateral_token.decimals);

        return {
            maxDebt: formatNumber(maxBorrowableBN.toString(), this.market.borrowed_token.decimals),
            maxTotalCollateral: formatNumber(maxLeverageCollateralBN.plus(userEffectiveCollateralBN).toString(), this.market.collateral_token.decimals),
            userCollateral: formatNumber(userCollateral, this.market.collateral_token.decimals),
            collateralFromUserBorrowed: formatNumber(BN(userBorrowed).div(pAvgBN).toString(), this.market.collateral_token.decimals),
            collateralFromMaxDebt: formatNumber(maxLeverageCollateralBN.toString(), this.market.collateral_token.decimals),
            maxLeverage: maxLeverageCollateralBN.plus(userEffectiveCollateralBN).div(userEffectiveCollateralBN).toString(),
            avgPrice: pAvgBN.toString(),
        };
    }

    private leverageCreateLoanMaxRecvAllRanges = memoize(async (userCollateral: TAmount, userBorrowed: TAmount):
        Promise<IDict<{
            maxDebt: string,
            maxTotalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromMaxDebt: string,
            maxLeverage: string,
            avgPrice: string,
        }>> => {
        this._checkLeverageZap();
        const _userCollateral = parseUnits(userCollateral, this.market.collateral_token.decimals);
        const contract = this.llamalend.contracts[this.llamalend.constants.ALIASES.leverage_zap].multicallContract;

        const oraclePriceBand = await this.oraclePriceBand();
        const pAvgApproxBN = BN(await this.calcTickPrice(oraclePriceBand)); // upper tick of oracle price band
        let pAvgBN: BigNumber | null = null;
        const arrLength = this.market.maxBands - this.market.minBands + 1;
        let maxLeverageCollateralBN: BigNumber[] = new Array(arrLength).fill(BN(0));
        let _maxLeverageCollateral: bigint[] = new Array(arrLength).fill(BigInt(0));
        let maxBorrowablePrevBN: BigNumber[] = new Array(arrLength).fill(BN(0));
        let maxBorrowableBN: BigNumber[] = new Array(arrLength).fill(BN(0));
        let _maxBorrowable: bigint[] = new Array(arrLength).fill(BigInt(0));

        for (let i = 0; i < 5; i++) {
            const pBN = pAvgBN ?? pAvgApproxBN;
            maxBorrowablePrevBN = maxBorrowableBN;
            const _userEffectiveCollateral: bigint = _userCollateral + fromBN(BN(userBorrowed).div(pBN), this.market.collateral_token.decimals);
            const calls = [];
            for (let N = this.market.minBands; N <= this.market.maxBands; N++) {
                const j = N - this.market.minBands;
                calls.push(contract.max_borrowable(this.market.addresses.controller, _userEffectiveCollateral, _maxLeverageCollateral[j], N, fromBN(pBN)));
            }
            _maxBorrowable = (await this.llamalend.multicallProvider.all(calls) as bigint[]).map((_mb) => _mb * BigInt(998) / BigInt(1000));
            maxBorrowableBN = _maxBorrowable.map((_mb) => toBN(_mb, this.market.borrowed_token.decimals));

            const deltaBN = maxBorrowableBN.map((mb, l) => mb.minus(maxBorrowablePrevBN[l]).abs().div(mb));
            if (BigNumber.max(...deltaBN).lt(0.0005)) {
                maxBorrowableBN = maxBorrowablePrevBN;
                break;
            }

            if (pAvgBN === null){
                const _y = BigInt(await _getExpectedOdos.call(this.llamalend, this.market.addresses.borrowed_token, this.market.addresses.collateral_token, _maxBorrowable[0], this.market.addresses.amm));
                const yBN = toBN(_y, this.market.collateral_token.decimals);
                pAvgBN = maxBorrowableBN[0].div(yBN);
            }

            maxLeverageCollateralBN = maxBorrowableBN.map((mb) => mb.div(pAvgBN as BigNumber));
            _maxLeverageCollateral = maxLeverageCollateralBN.map((mlc) => fromBN(mlc, this.market.collateral_token.decimals));
        }

        const userEffectiveCollateralBN = BN(userCollateral).plus(BN(userBorrowed).div(pAvgBN as BigNumber));

        const res: IDict<{
                maxDebt: string,
                maxTotalCollateral: string,
                userCollateral: string,
                collateralFromUserBorrowed: string,
                collateralFromMaxDebt: string,
                maxLeverage: string,
                avgPrice: string,
            }> = {};
        for (let N = this.market.minBands; N <= this.market.maxBands; N++) {
            const j = N - this.market.minBands;
            res[N] = {
                maxDebt: formatNumber(maxBorrowableBN[j].toString(), this.market.borrowed_token.decimals),
                maxTotalCollateral: formatNumber(maxLeverageCollateralBN[j].plus(userEffectiveCollateralBN).toString(), this.market.collateral_token.decimals),
                userCollateral: formatNumber(userCollateral, this.market.collateral_token.decimals),
                collateralFromUserBorrowed: formatNumber(BN(userBorrowed).div(pAvgBN as BigNumber).toString(), this.market.collateral_token.decimals),
                collateralFromMaxDebt: formatNumber(maxLeverageCollateralBN[j].toString(), this.market.collateral_token.decimals),
                maxLeverage: maxLeverageCollateralBN[j].plus(userEffectiveCollateralBN).div(userEffectiveCollateralBN).toString(),
                avgPrice: (pAvgBN as BigNumber).toString(),
            };
        }

        return res;
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    private _setSwapDataToCache = async (inputCoinAddress: string, outputCoinAddress: string, _amount: bigint, slippage: number) => {
        let swapData = await _getQuoteOdos.call(this.llamalend, inputCoinAddress, outputCoinAddress, _amount, this.market.addresses.amm, true, slippage);
        while (swapData.pathId == null) {
            swapData = await _getQuoteOdos.call(this.llamalend, inputCoinAddress, outputCoinAddress, _amount, this.market.addresses.amm, true, slippage);
        }
        const key = `${inputCoinAddress}-${_amount}`;
        this.swapDataCache[key] = { ...swapData, slippage };
    }

    private _getSwapDataFromCache = (inputCoinAddress: string, _amount: bigint): IQuoteOdos => {
        const key = `${inputCoinAddress}-${_amount}`;
        if (!(key in this.swapDataCache)) throw Error(
            "You must call corresponding `expected` method first " +
            "(leverage.createLoanExpectedCollateral, leverage.borrowMoreExpectedCollateral or leverage.repayExpectedBorrowed)"
        );

        return this.swapDataCache[key]
    }

    private _leverageExpectedCollateral = async (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, user?: string):
        Promise<{ _futureStateCollateral: bigint, _totalCollateral: bigint, _userCollateral: bigint,
            _collateralFromUserBorrowed: bigint, _collateralFromDebt: bigint, avgPrice: string }> => {
        const _userCollateral = parseUnits(userCollateral, this.market.collateral_token.decimals);
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.market.borrowed_token.decimals);
        // additionalCollateral = (userBorrowed / p) + leverageCollateral
        const _additionalCollateral = BigInt(this._getSwapDataFromCache(this.market.addresses.borrowed_token, _debt + _userBorrowed).outAmounts[0]);
        const _collateralFromDebt = _debt * BigInt(10**18) / (_debt + _userBorrowed) * _additionalCollateral / BigInt(10**18);
        const _collateralFromUserBorrowed = _additionalCollateral - _collateralFromDebt;
        let _stateCollateral = BigInt(0);
        if (user) {
            const { _collateral, _borrowed } = await this._userState(user);
            if (_borrowed > BigInt(0)) throw Error(`User ${user} is already in liquidation mode`);
            _stateCollateral = _collateral;
        }
        const _totalCollateral = _userCollateral + _additionalCollateral;
        const _futureStateCollateral = _stateCollateral + _totalCollateral;
        const avgPrice = toBN(_debt + _userBorrowed, this.market.borrowed_token.decimals).div(toBN(_additionalCollateral, this.market.collateral_token.decimals)).toString();

        return { _futureStateCollateral, _totalCollateral, _userCollateral, _collateralFromUserBorrowed, _collateralFromDebt, avgPrice };
    };

    private async leverageCreateLoanExpectedCollateral(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, slippage = 0.1):
        Promise<{ totalCollateral: string, userCollateral: string, collateralFromUserBorrowed: string, collateralFromDebt: string, leverage: string, avgPrice: string }> {
        this._checkLeverageZap();
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.market.borrowed_token.decimals);
        await this._setSwapDataToCache(this.market.addresses.borrowed_token, this.market.addresses.collateral_token, _debt + _userBorrowed, slippage);
        const { _totalCollateral, _userCollateral, _collateralFromUserBorrowed, _collateralFromDebt, avgPrice } =
            await this._leverageExpectedCollateral(userCollateral, userBorrowed, debt);
        return {
            totalCollateral: formatUnits(_totalCollateral, this.market.collateral_token.decimals),
            userCollateral: formatUnits(_userCollateral, this.market.collateral_token.decimals),
            collateralFromUserBorrowed: formatUnits(_collateralFromUserBorrowed, this.market.collateral_token.decimals),
            collateralFromDebt: formatUnits(_collateralFromDebt, this.market.collateral_token.decimals),
            leverage: toBN(_collateralFromDebt + _userCollateral + _collateralFromUserBorrowed, this.market.collateral_token.decimals)
                .div(toBN(_userCollateral + _collateralFromUserBorrowed, this.market.collateral_token.decimals)).toString(),
            avgPrice,
        }
    }

    private async leverageCreateLoanPriceImpact(userBorrowed: TAmount, debt: TAmount): Promise<string> {
        this._checkLeverageZap();
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.market.borrowed_token.decimals);
        return this._getSwapDataFromCache(this.market.addresses.borrowed_token, _debt + _userBorrowed).priceImpact.toString();
    }

    private async leverageCreateLoanMaxRange(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount): Promise<number> {
        this._checkLeverageZap();
        const maxRecv = await this.leverageCreateLoanMaxRecvAllRanges(userCollateral, userBorrowed);
        for (let N = this.market.minBands; N <= this.market.maxBands; N++) {
            if (BN(debt).gt(maxRecv[N].maxDebt)) return N - 1;
        }

        return this.market.maxBands;
    }

    private _leverageCalcN1 = memoize(async (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, user?: string): Promise<bigint> => {
        if (range > 0) this._checkRange(range);
        let _stateDebt = BigInt(0);
        if (user) {
            const { _debt, _borrowed, _N } = await this._userState(user);
            if (_borrowed > BigInt(0)) throw Error(`User ${user} is already in liquidation mode`);
            _stateDebt = _debt;
            if (range < 0) range = Number(this.llamalend.formatUnits(_N, 0));
        }
        const { _futureStateCollateral } = await this._leverageExpectedCollateral(userCollateral, userBorrowed, debt, user);
        const _debt = _stateDebt + parseUnits(debt, this.market.borrowed_token.decimals);
        return await this.llamalend.contracts[this.market.addresses.controller].contract.calculate_debt_n1(_futureStateCollateral, _debt, range, this.llamalend.constantOptions);
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    private _leverageCalcN1AllRanges = memoize(async (userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, maxN: number): Promise<bigint[]> => {
        const { _futureStateCollateral } = await this._leverageExpectedCollateral(userCollateral, userBorrowed, debt);
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);
        const calls = [];
        for (let N = this.market.minBands; N <= maxN; N++) {
            calls.push(this.llamalend.contracts[this.market.addresses.controller].multicallContract.calculate_debt_n1(_futureStateCollateral, _debt, N));
        }
        return await this.llamalend.multicallProvider.all(calls) as bigint[];
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    private async _leverageBands(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, user?: string): Promise<[bigint, bigint]> {
        const _n1 = await this._leverageCalcN1(userCollateral, userBorrowed, debt, range, user);
        if (range < 0) {
            const { N } = await this.userState(user);
            range = Number(N);
        }
        const _n2 = _n1 + BigInt(range - 1);

        return [_n2, _n1];
    }

    private async _leverageCreateLoanBandsAllRanges(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount): Promise<IDict<[bigint, bigint]>> {
        const maxN = await this.leverageCreateLoanMaxRange(userCollateral, userBorrowed, debt);
        const _n1_arr = await this._leverageCalcN1AllRanges(userCollateral, userBorrowed, debt, maxN);
        const _n2_arr: bigint[] = [];
        for (let N = this.market.minBands; N <= maxN; N++) {
            _n2_arr.push(_n1_arr[N - this.market.minBands] + BigInt(N - 1));
        }

        const _bands: IDict<[bigint, bigint]> = {};
        for (let N = this.market.minBands; N <= maxN; N++) {
            _bands[N] = [_n2_arr[N - this.market.minBands], _n1_arr[N - this.market.minBands]];
        }

        return _bands;
    }

    private async leverageCreateLoanBands(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number): Promise<[number, number]> {
        this._checkLeverageZap();
        const [_n2, _n1] = await this._leverageBands(userCollateral, userBorrowed, debt, range);

        return [Number(_n2), Number(_n1)];
    }

    private async leverageCreateLoanBandsAllRanges(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount): Promise<IDict<[number, number] | null>> {
        this._checkLeverageZap();
        const _bands = await this._leverageCreateLoanBandsAllRanges(userCollateral, userBorrowed, debt);

        const bands: { [index: number]: [number, number] | null } = {};
        for (let N = this.market.minBands; N <= this.market.maxBands; N++) {
            if (_bands[N]) {
                bands[N] = _bands[N].map(Number) as [number, number];
            } else {
                bands[N] = null
            }
        }

        return bands;
    }

    private async leverageCreateLoanPrices(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number): Promise<string[]> {
        this._checkLeverageZap();
        const [_n2, _n1] = await this._leverageBands(userCollateral, userBorrowed, debt, range);

        return await this._getPrices(_n2, _n1);
    }

    private async leverageCreateLoanPricesAllRanges(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount): Promise<IDict<[string, string] | null>> {
        this._checkLeverageZap();
        const _bands = await this._leverageCreateLoanBandsAllRanges(userCollateral, userBorrowed, debt);

        const prices: { [index: number]: [string, string] | null } = {};
        for (let N = this.market.minBands; N <= this.market.maxBands; N++) {
            if (_bands[N]) {
                prices[N] = await this._calcPrices(..._bands[N]);
            } else {
                prices[N] = null
            }
        }

        return prices;
    }

    private async _leverageHealth(
        userCollateral: TAmount,
        userBorrowed: TAmount,
        dDebt: TAmount,
        range: number,
        full: boolean,
        user = this.llamalend.constants.ZERO_ADDRESS
    ): Promise<string> {
        if (range > 0) this._checkRange(range);
        const { _totalCollateral } = await this._leverageExpectedCollateral(userCollateral, userBorrowed, dDebt, user);
        const { _borrowed, _N } = await this._userState(user);
        if (_borrowed > BigInt(0)) throw Error(`User ${user} is already in liquidation mode`);
        if (range < 0) range = Number(this.llamalend.formatUnits(_N, 0));
        const _dDebt = parseUnits(dDebt, this.market.borrowed_token.decimals);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        let _health = await contract.health_calculator(user, _totalCollateral, _dDebt, full, range, this.llamalend.constantOptions) as bigint;
        _health = _health * BigInt(100);

        return formatUnits(_health);
    }

    private async leverageCreateLoanHealth(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, full = true): Promise<string> {
        this._checkLeverageZap();
        return await this._leverageHealth(userCollateral, userBorrowed, debt, range, full);
    }

    private async leverageCreateLoanIsApproved(userCollateral: TAmount, userBorrowed: TAmount): Promise<boolean> {
        this._checkLeverageZap();
        const collateralAllowance = await hasAllowance.call(this.llamalend,
            [this.market.collateral_token.address], [userCollateral], this.llamalend.signerAddress, this.market.addresses.controller);
        const borrowedAllowance = await hasAllowance.call(this.llamalend,
            [this.market.borrowed_token.address], [userBorrowed], this.llamalend.signerAddress, this.llamalend.constants.ALIASES.leverage_zap);

        return collateralAllowance && borrowedAllowance
    }

    private async leverageCreateLoanApproveEstimateGas (userCollateral: TAmount, userBorrowed: TAmount): Promise<TGas> {
        this._checkLeverageZap();
        const collateralGas = await ensureAllowanceEstimateGas.call(this.llamalend,
            [this.market.collateral_token.address], [userCollateral], this.market.addresses.controller);
        const borrowedGas = await ensureAllowanceEstimateGas.call(this.llamalend,
            [this.market.borrowed_token.address], [userBorrowed], this.llamalend.constants.ALIASES.leverage_zap);

        if(Array.isArray(collateralGas) && Array.isArray(borrowedGas)) {
            return [collateralGas[0] + borrowedGas[0], collateralGas[1] + borrowedGas[1]]
        } else {
            return (collateralGas as number) + (borrowedGas as number)
        }
    }

    private async leverageCreateLoanApprove(userCollateral: TAmount, userBorrowed: TAmount): Promise<string[]> {
        this._checkLeverageZap();
        const collateralApproveTx = await ensureAllowance.call(this.llamalend,
            [this.market.collateral_token.address], [userCollateral], this.market.addresses.controller);
        const borrowedApproveTx = await ensureAllowance.call(this.llamalend,
            [this.market.borrowed_token.address], [userBorrowed], this.llamalend.constants.ALIASES.leverage_zap);

        return [...collateralApproveTx, ...borrowedApproveTx]
    }

    private async leverageCreateLoanRouteImage(userBorrowed: TAmount, debt: TAmount): Promise<string> {
        this._checkLeverageZap();
        const _userBorrowed = parseUnits(userBorrowed, this.market.borrowed_token.decimals);
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);

        return this._getSwapDataFromCache(this.market.addresses.borrowed_token, _debt + _userBorrowed).pathVizImage;
    }

    private async _leverageCreateLoan(
        userCollateral: TAmount,
        userBorrowed: TAmount,
        debt: TAmount,
        range: number,
        slippage: number,
        estimateGas: boolean
    ): Promise<string | TGas>  {
        if (await this.userLoanExists()) throw Error("Loan already created");
        this._checkRange(range);

        const _userCollateral = parseUnits(userCollateral, this.market.collateral_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.market.borrowed_token.decimals);
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);
        const swapData = this._getSwapDataFromCache(this.market.addresses.borrowed_token, _debt + _userBorrowed);
        if (slippage !== swapData.slippage) throw Error(`You must call leverage.createLoanExpectedCollateral() with slippage=${slippage} first`);
        const calldata = await _assembleTxOdos.call(this.llamalend, swapData.pathId as string);
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.create_loan_extended.estimateGas(
            _userCollateral,
            _debt,
            range,
            this.llamalend.constants.ALIASES.leverage_zap,
            [0, parseUnits(this._getMarketId(), 0), _userBorrowed],
            calldata,
            { ...this.llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.create_loan_extended(
            _userCollateral,
            _debt,
            range,
            this.llamalend.constants.ALIASES.leverage_zap,
            [0, parseUnits(this._getMarketId(), 0), _userBorrowed],
            calldata,
            { ...this.llamalend.options, gasLimit }
        )).hash
    }

    private async leverageCreateLoanEstimateGas(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, slippage = 0.1): Promise<number> {
        this._checkLeverageZap();
        if (!(await this.leverageCreateLoanIsApproved(userCollateral, userBorrowed))) throw Error("Approval is needed for gas estimation");
        return await this._leverageCreateLoan(userCollateral, userBorrowed, debt, range, slippage,  true) as number;
    }

    private async leverageCreateLoan(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, range: number, slippage = 0.1): Promise<string> {
        this._checkLeverageZap();
        await this.leverageCreateLoanApprove(userCollateral, userBorrowed);
        return await this._leverageCreateLoan(userCollateral, userBorrowed, debt, range, slippage, false) as string;
    }

    // ---------------- LEVERAGE BORROW MORE ----------------

    private async leverageBorrowMoreMaxRecv(userCollateral: TAmount, userBorrowed: TAmount, address = ""):
        Promise<{
            maxDebt: string,
            maxTotalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromMaxDebt: string,
            avgPrice: string,
        }> {
        // max_borrowable = userCollateral / (1 / (k_effective * max_p_base) - 1 / p_avg)
        this._checkLeverageZap();
        address = _getAddress.call(this.llamalend, address);
        const { _collateral: _stateCollateral, _borrowed: _stateBorrowed, _debt: _stateDebt, _N } = await this._userState(address);
        if (_stateBorrowed > BigInt(0)) throw Error(`User ${address} is already in liquidation mode`);
        const _userCollateral = parseUnits(userCollateral, this.market.collateral_token.decimals);
        const controllerContract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _borrowedFromStateCollateral = await controllerContract.max_borrowable(_stateCollateral, _N, _stateDebt, this.llamalend.constantOptions) - _stateDebt;
        const _userBorrowed = _borrowedFromStateCollateral + parseUnits(userBorrowed, this.market.borrowed_token.decimals);
        userBorrowed = formatUnits(_userBorrowed, this.market.borrowed_token.decimals);

        const oraclePriceBand = await this.oraclePriceBand();
        let pAvgBN = BN(await this.calcTickPrice(oraclePriceBand)); // upper tick of oracle price band
        let maxBorrowablePrevBN = BN(0);
        let maxBorrowableBN = BN(0);
        let _userEffectiveCollateral = BigInt(0);
        let _maxLeverageCollateral = BigInt(0);

        const contract = this.llamalend.contracts[this.llamalend.constants.ALIASES.leverage_zap].contract;
        for (let i = 0; i < 5; i++) {
            maxBorrowablePrevBN = maxBorrowableBN;
            _userEffectiveCollateral = _userCollateral + fromBN(BN(userBorrowed).div(pAvgBN), this.market.collateral_token.decimals);
            let _maxBorrowable = await contract.max_borrowable(this.market.addresses.controller, _userEffectiveCollateral, _maxLeverageCollateral, _N, fromBN(pAvgBN));
            _maxBorrowable = _maxBorrowable * BigInt(998) / BigInt(1000);
            if (_maxBorrowable === BigInt(0)) break;
            maxBorrowableBN = toBN(_maxBorrowable, this.market.borrowed_token.decimals);

            if (maxBorrowableBN.minus(maxBorrowablePrevBN).abs().div(maxBorrowablePrevBN).lt(0.0005)) {
                maxBorrowableBN = maxBorrowablePrevBN;
                break;
            }

            // additionalCollateral = (userBorrowed / p) + leverageCollateral
            const _maxAdditionalCollateral = BigInt(await _getExpectedOdos.call(this.llamalend,
                this.market.addresses.borrowed_token, this.market.addresses.collateral_token, _maxBorrowable + _userBorrowed, this.market.addresses.amm));
            pAvgBN = maxBorrowableBN.plus(userBorrowed).div(toBN(_maxAdditionalCollateral, this.market.collateral_token.decimals));
            _maxLeverageCollateral = _maxAdditionalCollateral - fromBN(BN(userBorrowed).div(pAvgBN), this.market.collateral_token.decimals);
        }

        if (maxBorrowableBN.eq(0)) _userEffectiveCollateral = BigInt(0);
        const _maxTotalCollateral = _userEffectiveCollateral + _maxLeverageCollateral
        let _maxBorrowable = await controllerContract.max_borrowable(_stateCollateral + _maxTotalCollateral, _N, _stateDebt, this.llamalend.constantOptions) - _stateDebt;
        _maxBorrowable = _maxBorrowable * BigInt(998) / BigInt(1000);

        return {
            maxDebt: formatUnits(_maxBorrowable, this.market.borrowed_token.decimals),
            maxTotalCollateral: formatUnits(_maxTotalCollateral, this.market.collateral_token.decimals),
            userCollateral: formatNumber(userCollateral, this.market.collateral_token.decimals),
            collateralFromUserBorrowed: formatNumber(BN(userBorrowed).div(pAvgBN).toString(), this.market.collateral_token.decimals),
            collateralFromMaxDebt: formatUnits(_maxLeverageCollateral, this.market.collateral_token.decimals),
            avgPrice: pAvgBN.toString(),
        };
    }

    private async leverageBorrowMoreExpectedCollateral(userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, slippage = 0.1, address = ""):
        Promise<{ totalCollateral: string, userCollateral: string, collateralFromUserBorrowed: string, collateralFromDebt: string, avgPrice: string }> {
        this._checkLeverageZap();
        address = _getAddress.call(this.llamalend, address);
        const _dDebt = parseUnits(dDebt, this.market.borrowed_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.market.borrowed_token.decimals);
        await this._setSwapDataToCache(this.market.addresses.borrowed_token, this.market.addresses.collateral_token, _dDebt + _userBorrowed, slippage);
        const { _totalCollateral, _userCollateral, _collateralFromUserBorrowed, _collateralFromDebt, avgPrice } =
            await this._leverageExpectedCollateral(userCollateral, userBorrowed, dDebt, address);
        return {
            totalCollateral: formatUnits(_totalCollateral, this.market.collateral_token.decimals),
            userCollateral: formatUnits(_userCollateral, this.market.collateral_token.decimals),
            collateralFromUserBorrowed: formatUnits(_collateralFromUserBorrowed, this.market.collateral_token.decimals),
            collateralFromDebt: formatUnits(_collateralFromDebt, this.market.collateral_token.decimals),
            avgPrice,
        }
    }

    private async leverageBorrowMorePriceImpact(userBorrowed: TAmount, dDebt: TAmount): Promise<string> {
        this._checkLeverageZap();
        const _dDebt = parseUnits(dDebt, this.market.borrowed_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.market.borrowed_token.decimals);
        return this._getSwapDataFromCache(this.market.addresses.borrowed_token, _dDebt + _userBorrowed).priceImpact.toString();
    }

    private async leverageBorrowMoreBands(userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, address = ""): Promise<[number, number]> {
        address = _getAddress.call(this.llamalend, address);
        this._checkLeverageZap();
        const [_n2, _n1] = await this._leverageBands(userCollateral, userBorrowed, dDebt, -1, address);

        return [Number(_n2), Number(_n1)];
    }

    private async leverageBorrowMorePrices(userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, address = ""): Promise<string[]> {
        address = _getAddress.call(this.llamalend, address);
        this._checkLeverageZap();
        const [_n2, _n1] = await this._leverageBands(userCollateral, userBorrowed, dDebt, -1, address);

        return await this._getPrices(_n2, _n1);
    }

    private async leverageBorrowMoreHealth(userCollateral: TAmount, userBorrowed: TAmount, dDebt: TAmount, full = true, address = ""): Promise<string> {
        this._checkLeverageZap();
        address = _getAddress.call(this.llamalend, address);
        return await this._leverageHealth(userCollateral, userBorrowed, dDebt, -1, full, address);
    }

    private async leverageBorrowMoreRouteImage(userBorrowed: TAmount, debt: TAmount): Promise<string> {
        this._checkLeverageZap();
        const _userBorrowed = parseUnits(userBorrowed, this.market.borrowed_token.decimals);
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);

        return this._getSwapDataFromCache(this.market.addresses.borrowed_token, _debt + _userBorrowed).pathVizImage;
    }

    private async _leverageBorrowMore(
        userCollateral: TAmount,
        userBorrowed: TAmount,
        debt: TAmount,
        slippage: number,
        estimateGas: boolean
    ): Promise<string | TGas>  {
        if (!(await this.userLoanExists())) throw Error("Loan does not exist");
        const _userCollateral = parseUnits(userCollateral, this.market.collateral_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.market.borrowed_token.decimals);
        const _debt = parseUnits(debt, this.market.borrowed_token.decimals);
        const swapData = this._getSwapDataFromCache(this.market.addresses.borrowed_token, _debt + _userBorrowed);
        if (slippage !== swapData.slippage) throw Error(`You must call leverage.borrowMoreExpectedCollateral() with slippage=${slippage} first`)
        const calldata = await _assembleTxOdos.call(this.llamalend, swapData.pathId as string);
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.borrow_more_extended.estimateGas(
            _userCollateral,
            _debt,
            this.llamalend.constants.ALIASES.leverage_zap,
            [0, parseUnits(this._getMarketId(), 0), _userBorrowed],
            calldata,
            { ...this.llamalend.constantOptions }
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));

        return (await contract.borrow_more_extended(
            _userCollateral,
            _debt,
            this.llamalend.constants.ALIASES.leverage_zap,
            [0, parseUnits(this._getMarketId(), 0), _userBorrowed],
            calldata,
            { ...this.llamalend.options, gasLimit }
        )).hash
    }

    private async leverageBorrowMoreEstimateGas(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, slippage = 0.1): Promise<number> {
        this._checkLeverageZap();
        if (!(await this.leverageCreateLoanIsApproved(userCollateral, userBorrowed))) throw Error("Approval is needed for gas estimation");
        return await this._leverageBorrowMore(userCollateral, userBorrowed, debt, slippage,  true) as number;
    }

    private async leverageBorrowMore(userCollateral: TAmount, userBorrowed: TAmount, debt: TAmount, slippage = 0.1): Promise<string> {
        this._checkLeverageZap();
        await this.leverageCreateLoanApprove(userCollateral, userBorrowed);
        return await this._leverageBorrowMore(userCollateral, userBorrowed, debt, slippage, false) as string;
    }

    // ---------------- LEVERAGE REPAY ----------------

    private _leverageRepayExpectedBorrowed = (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount):
        { _totalBorrowed: bigint, _borrowedFromStateCollateral: bigint, _borrowedFromUserCollateral: bigint, avgPrice: string } => {
        this._checkLeverageZap();
        const _stateCollateral = parseUnits(stateCollateral, this.market.collateral_token.decimals);
        const _userCollateral = parseUnits(userCollateral, this.market.collateral_token.decimals);
        let _borrowedExpected = BigInt(0);
        let _borrowedFromStateCollateral = BigInt(0);
        let _borrowedFromUserCollateral = BigInt(0);
        if (_stateCollateral + _userCollateral > BigInt(0)) {
            _borrowedExpected = BigInt(this._getSwapDataFromCache(this.market.addresses.collateral_token, _stateCollateral + _userCollateral).outAmounts[0]);
            _borrowedFromStateCollateral = _stateCollateral * BigInt(10 ** 18) / (_stateCollateral + _userCollateral) * _borrowedExpected / BigInt(10 ** 18);
            _borrowedFromUserCollateral = _borrowedExpected - _borrowedFromStateCollateral;
        }
        const _totalBorrowed = _borrowedExpected + parseUnits(userBorrowed, this.market.borrowed_token.decimals);
        const avgPrice = toBN(_borrowedExpected, this.market.borrowed_token.decimals).div(toBN(_stateCollateral + _userCollateral, this.market.collateral_token.decimals)).toString();

        return { _totalBorrowed, _borrowedFromStateCollateral, _borrowedFromUserCollateral, avgPrice }
    };

    private leverageRepayExpectedBorrowed = async (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, slippage = 0.1):
        Promise<{ totalBorrowed: string, borrowedFromStateCollateral: string, borrowedFromUserCollateral: string, userBorrowed: string, avgPrice: string }> => {
        this._checkLeverageZap();
        const _stateCollateral = parseUnits(stateCollateral, this.market.collateral_token.decimals);
        const _userCollateral = parseUnits(userCollateral, this.market.collateral_token.decimals);
        if (_stateCollateral + _userCollateral > BigInt(0)) {
            await this._setSwapDataToCache(this.market.addresses.collateral_token, this.market.addresses.borrowed_token, _stateCollateral + _userCollateral, slippage);
        }
        const { _totalBorrowed, _borrowedFromStateCollateral, _borrowedFromUserCollateral, avgPrice } =
            this._leverageRepayExpectedBorrowed(stateCollateral, userCollateral, userBorrowed);

        return {
            totalBorrowed: formatUnits(_totalBorrowed, this.market.borrowed_token.decimals),
            borrowedFromStateCollateral: formatUnits(_borrowedFromStateCollateral, this.market.borrowed_token.decimals),
            borrowedFromUserCollateral: formatUnits(_borrowedFromUserCollateral, this.market.borrowed_token.decimals),
            userBorrowed: formatNumber(userBorrowed, this.market.borrowed_token.decimals),
            avgPrice,
        }
    };

    private async leverageRepayPriceImpact(stateCollateral: TAmount, userCollateral: TAmount): Promise<string> {
        this._checkLeverageZap();
        const _stateCollateral = parseUnits(stateCollateral, this.market.collateral_token.decimals);
        const _userCollateral = parseUnits(userCollateral, this.market.collateral_token.decimals);
        if (_stateCollateral + _userCollateral > BigInt(0)) {
            return this._getSwapDataFromCache(this.market.addresses.collateral_token, _stateCollateral + _userCollateral).priceImpact.toString();
        } else {
            return "0.0"
        }
    }

    private async leverageRepayIsFull(stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address = ""): Promise<boolean> {
        this._checkLeverageZap();
        address = _getAddress.call(this.llamalend, address);
        const { _borrowed: _stateBorrowed, _debt } = await this._userState(address);
        const { _totalBorrowed } = this._leverageRepayExpectedBorrowed(stateCollateral, userCollateral, userBorrowed);

        return _stateBorrowed + _totalBorrowed > _debt;
    }

    private async leverageRepayIsAvailable(stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address = ""): Promise<boolean> {
        // 0. const { collateral, stablecoin, debt } = await this.userState(address);
        // 1. maxCollateral for deleverage is collateral from line above.
        // 2. If user is underwater (stablecoin > 0), only full repayment is available:
        //    await this.deleverageRepayStablecoins(deleverageCollateral) + stablecoin > debt
        this._checkLeverageZap();
        address = _getAddress.call(this.llamalend, address);
        const { collateral, borrowed, debt } = await this.userState(address);
        // Loan does not exist
        if (BN(debt).eq(0)) return false;
        // Can't spend more than user has
        if (BN(stateCollateral).gt(collateral)) return false;
        // Only full repayment and closing the position is available if user is underwater+
        if (BN(borrowed).gt(0)) return await this.leverageRepayIsFull(stateCollateral, userCollateral, userBorrowed, address);

        return true;
    }

    private _leverageRepayBands = memoize( async (stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address: string): Promise<[bigint, bigint]> => {
        address = _getAddress.call(this.llamalend, address);
        if (!(await this.leverageRepayIsAvailable(stateCollateral, userCollateral, userBorrowed, address))) return [parseUnits(0, 0), parseUnits(0, 0)];

        const _stateRepayCollateral = parseUnits(stateCollateral, this.market.collateral_token.decimals);
        const { _collateral: _stateCollateral, _debt: _stateDebt, _N } = await this._userState(address);
        if (_stateDebt == BigInt(0)) throw Error(`Loan for ${address} does not exist`);
        if (_stateCollateral < _stateRepayCollateral) throw Error(`Can't use more collateral than user's position has (${_stateRepayCollateral}) > ${_stateCollateral})`);

        let _n1 = parseUnits(0, 0);
        let _n2 = parseUnits(0, 0);
        const { _totalBorrowed: _repayExpected } = this._leverageRepayExpectedBorrowed(stateCollateral, userCollateral, userBorrowed);
        try {
            _n1 = await this.llamalend.contracts[this.market.addresses.controller].contract.calculate_debt_n1(_stateCollateral - _stateRepayCollateral, _stateDebt - _repayExpected, _N);
            _n2 = _n1 + (_N - BigInt(1));
        } catch {
            console.log("Full repayment");
        }

        return [_n2, _n1];
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    });

    private async leverageRepayBands(stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address = ""): Promise<[number, number]> {
        this._checkLeverageZap();
        const [_n2, _n1] = await this._leverageRepayBands(stateCollateral, userCollateral, userBorrowed, address);

        return [Number(_n2), Number(_n1)];
    }

    private async leverageRepayPrices(stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, address = ""): Promise<string[]> {
        this._checkLeverageZap();
        const [_n2, _n1] = await this._leverageRepayBands(stateCollateral, userCollateral, userBorrowed, address);

        return await this._getPrices(_n2, _n1);
    }

    private async leverageRepayHealth(stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, full = true, address = ""): Promise<string> {
        this._checkLeverageZap();
        address = _getAddress.call(this.llamalend, address);
        const { _borrowed: _stateBorrowed, _debt, _N } = await this._userState(address);
        if (_stateBorrowed > BigInt(0)) return "0.0";
        if (!(await this.leverageRepayIsAvailable(stateCollateral, userCollateral, userBorrowed, address))) return "0.0";

        const { _totalBorrowed } = this._leverageRepayExpectedBorrowed(stateCollateral, userCollateral, userBorrowed);
        const _dCollateral = parseUnits(stateCollateral, this.market.collateral_token.decimals) * BigInt(-1);
        const _dDebt = _totalBorrowed * BigInt(-1);

        if (_debt + _dDebt <= BigInt(0)) return "0.0";
        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        let _health = await contract.health_calculator(address, _dCollateral, _dDebt, full, _N, this.llamalend.constantOptions) as bigint;
        _health = _health * BigInt(100);

        return this.llamalend.formatUnits(_health);
    }

    private async leverageRepayIsApproved(userCollateral: TAmount, userBorrowed: TAmount): Promise<boolean> {
        this._checkLeverageZap();
        return await hasAllowance.call(this.llamalend,
            [this.market.collateral_token.address, this.market.borrowed_token.address],
            [userCollateral, userBorrowed],
            this.llamalend.signerAddress,
            this.llamalend.constants.ALIASES.leverage_zap
        );
    }

    private async leverageRepayApproveEstimateGas (userCollateral: TAmount, userBorrowed: TAmount): Promise<TGas> {
        this._checkLeverageZap();
        return await ensureAllowanceEstimateGas.call(this.llamalend,
            [this.market.collateral_token.address, this.market.borrowed_token.address],
            [userCollateral, userBorrowed],
            this.llamalend.constants.ALIASES.leverage_zap
        );
    }

    private async leverageRepayApprove(userCollateral: TAmount, userBorrowed: TAmount): Promise<string[]> {
        this._checkLeverageZap();
        return await ensureAllowance.call(this.llamalend,
            [this.market.collateral_token.address, this.market.borrowed_token.address],
            [userCollateral, userBorrowed],
            this.llamalend.constants.ALIASES.leverage_zap
        );
    }

    private async leverageRepayRouteImage(stateCollateral: TAmount, userCollateral: TAmount): Promise<string> {
        this._checkLeverageZap();
        const _stateCollateral = parseUnits(stateCollateral, this.market.collateral_token.decimals);
        const _userCollateral = parseUnits(userCollateral, this.market.collateral_token.decimals);

        return this._getSwapDataFromCache(this.market.addresses.collateral_token, _stateCollateral + _userCollateral).pathVizImage;
    }

    private async _leverageRepay(
        stateCollateral: TAmount,
        userCollateral: TAmount,
        userBorrowed: TAmount,
        slippage: number,
        estimateGas: boolean
    ): Promise<string | TGas>  {
        if (!(await this.userLoanExists())) throw Error("Loan does not exist");
        const _stateCollateral = parseUnits(stateCollateral, this.market.collateral_token.decimals);
        const _userCollateral = parseUnits(userCollateral, this.market.collateral_token.decimals);
        const _userBorrowed = parseUnits(userBorrowed, this.market.borrowed_token.decimals);
        let calldata = "0x";
        if (_stateCollateral + _userCollateral > BigInt(0)) {
            const swapData = this._getSwapDataFromCache(this.market.addresses.collateral_token, _stateCollateral + _userCollateral);
            if (slippage !== swapData.slippage) throw Error(`You must call leverage.repayExpectedBorrowed() with slippage=${slippage} first`)
            calldata = await _assembleTxOdos.call(this.llamalend, swapData.pathId as string);
        }

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const gas = await contract.repay_extended.estimateGas(
            this.llamalend.constants.ALIASES.leverage_zap,
            [0, parseUnits(this._getMarketId(), 0), _userCollateral, _userBorrowed],
            calldata
        );
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));

        return (await contract.repay_extended(
            this.llamalend.constants.ALIASES.leverage_zap,
            [0, parseUnits(this._getMarketId(), 0), _userCollateral, _userBorrowed],
            calldata,
            { ...this.llamalend.options, gasLimit }
        )).hash
    }

    private async leverageRepayEstimateGas(stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, slippage = 0.1): Promise<number> {
        this._checkLeverageZap();
        if (!(await this.leverageRepayIsApproved(userCollateral, userBorrowed))) throw Error("Approval is needed for gas estimation");
        return await this._leverageRepay(stateCollateral, userCollateral, userBorrowed, slippage,  true) as number;
    }

    private async leverageRepay(stateCollateral: TAmount, userCollateral: TAmount, userBorrowed: TAmount, slippage = 0.1): Promise<string> {
        this._checkLeverageZap();
        await this.leverageRepayApprove(userCollateral, userBorrowed);
        return await this._leverageRepay(stateCollateral, userCollateral, userBorrowed, slippage, false) as string;
    }
}