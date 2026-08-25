import memoize from "memoizee";
import BigNumber from "bignumber.js";
import type { TAmount, TGas, IDict, IQuote, ILeverageMetrics, GetExpectedFn } from "../../interfaces.js";
import type { MintMarketTemplate } from "../MintMarketTemplate.js";
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
    buildCalldataForLeverageZapV2,
} from "../../utils.js";
import {Llamalend} from "../../llamalend.js";
import FactoryABI from "../../constants/abis/crvUSD/Factory.json" with { type: "json" };

export class MintLeverageZapV2Module {
    private market: MintMarketTemplate;
    private llamalend: Llamalend;

    constructor(market: MintMarketTemplate) {
        this.market = market;
        this.llamalend = market.getLlamalend();
    }

    private _getLeverageZapAddress = (): string =>
        this.llamalend.constants.ALIASES.leverage_zap_v2_mint ?? this.llamalend.constants.ZERO_ADDRESS;

    private _getControllerId = memoize(async (): Promise<bigint> => {
        const factoryAddress = this.llamalend.constants.FACTORY;
        if (!this.llamalend.contracts[factoryAddress]) this.llamalend.setContract(factoryAddress, FactoryABI);
        const factory = this.llamalend.contracts[factoryAddress];
        const _n = await factory.contract.n_collaterals(this.llamalend.constantOptions) as bigint;
        const calls = [];
        for (let i = 0; i < Number(_n); i++) calls.push(factory.multicallContract.controllers(i));
        const controllers = (await this.llamalend.multicallProvider.all(calls) as string[]).map((c) => c.toLowerCase());
        const id = controllers.indexOf(this.market.controller.toLowerCase());
        if (id === -1) throw Error(`Controller ${this.market.controller} is not registered in the factory`);
        return BigInt(id);
    },
    {
        promise: true,
    });

    // ============ CREATE LOAN METHODS ============

    public async userLoanExists(address = ""): Promise<boolean> {
        address = _getAddress.call(this.llamalend, address);
        return await this.llamalend.contracts[this.market.controller].contract.loan_exists(address, this.llamalend.constantOptions);
    }

    public hasLeverage = (): boolean => {
        return this._getLeverageZapAddress() !== this.llamalend.constants.ZERO_ADDRESS && this.market.isDeleverageSupported
    }

    public _checkLeverageZap(): void {
        if (!this.hasLeverage()) {
            throw Error("This market does not support leverage");
        }
    }

    public async _get_k_effective_BN(N: number): Promise<BigNumber> {
        // d_k_effective: uint256 = (1 - loan_discount) * sqrt((A-1)/A) / N
        // k_effective = d_k_effective * sum_{0..N-1}(((A-1) / A)**k)
        const { loan_discount } = await this.market.statsParameters();
        const A = this.market.A;
        const A_BN = BN(A);
        const A_ratio_BN = A_BN.minus(1).div(A_BN);

        const d_k_effective_BN = BN(100).minus(loan_discount).div(100).times(A_ratio_BN.sqrt()).div(N);
        let S = BN(0);
        for (let n = 0; n < N; n++) {
            S = S.plus(A_ratio_BN.pow(n))
        }

        return d_k_effective_BN.times(S);
    }

    public async maxLeverage(N: number): Promise<string> {
        // max_leverage = 1 / (k_effective - 1)
        const k_effective_BN = await this._get_k_effective_BN(N);

        return BN(1).div(BN(1).minus(k_effective_BN)).toString()
    }

    public calcMinRecv(expected: TAmount, slippage: number): string {
        if (slippage < 0 || slippage > 100) throw Error("Slippage must be between 0 and 100");
        return BN(expected).times(BN(100).minus(slippage)).div(100).toString();
    }

    public async leverageCreateLoanMaxRecv({ userCollateral, range, getExpected }: {
        userCollateral: TAmount,
        range: number,
        getExpected: GetExpectedFn
    }): Promise<{
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
        if (range > 0) this.market._checkRange(range);
        const _userCollateral = parseUnits(userCollateral, this.market.coinDecimals[1]);

        const oraclePriceBand = await this.market.oraclePriceBand();
        let pAvgBN = BN(await this.market.calcTickPrice(oraclePriceBand)); // upper tick of oracle price band
        let maxBorrowablePrevBN = BN(0);
        let maxBorrowableBN = BN(0);
        let _userEffectiveCollateral = BigInt(0);
        let _maxLeverageCollateral = BigInt(0);

        const contract = this.llamalend.contracts[this._getLeverageZapAddress()].contract;
        for (let i = 0; i < 5; i++) {
            maxBorrowablePrevBN = maxBorrowableBN;
            _userEffectiveCollateral = _userCollateral;
            let _maxBorrowable = await contract.max_borrowable(this.market.controller, _userEffectiveCollateral, _maxLeverageCollateral, range, fromBN(pAvgBN));
            _maxBorrowable = _maxBorrowable * BigInt(970) / BigInt(1000)
            if (_maxBorrowable === BigInt(0)) break;
            maxBorrowableBN = toBN(_maxBorrowable, this.market.coinDecimals[0]);

            if (maxBorrowableBN.minus(maxBorrowablePrevBN).abs().div(maxBorrowablePrevBN).lt(0.0005)) {
                maxBorrowableBN = maxBorrowablePrevBN;
                break;
            }

            const [fromToken, toToken] = this.market.coinAddresses;
            const quote = await getExpected(fromToken, toToken, _maxBorrowable, this.market.address);
            if (quote === null) break;

            const _maxAdditionalCollateral = BigInt(quote.outAmount);

            pAvgBN = maxBorrowableBN.div(toBN(_maxAdditionalCollateral, this.market.coinDecimals[1]));
            _maxLeverageCollateral = _maxAdditionalCollateral;
        }

        const userEffectiveCollateralBN = maxBorrowableBN.gt(0) ? toBN(_userEffectiveCollateral, this.market.coinDecimals[1]) : BN(0);
        const maxLeverageCollateralBN = toBN(_maxLeverageCollateral, this.market.coinDecimals[1]);
        maxBorrowableBN = maxBorrowableBN.gt(0) ? maxBorrowableBN : BN(0);

        return {
            maxDebt: formatNumber(maxBorrowableBN.toString(), this.market.coinDecimals[0]),
            maxTotalCollateral: formatNumber(maxLeverageCollateralBN.plus(userEffectiveCollateralBN).toString(), this.market.coinDecimals[1]),
            userCollateral: formatNumber(userCollateral, this.market.coinDecimals[1]),
            collateralFromUserBorrowed: formatNumber(BN(0).toString(), this.market.coinDecimals[1]),
            collateralFromMaxDebt: formatNumber(maxLeverageCollateralBN.toString(), this.market.coinDecimals[1]),
            maxLeverage: maxLeverageCollateralBN.plus(userEffectiveCollateralBN).div(userEffectiveCollateralBN).toString(),
            avgPrice: pAvgBN.toString(),
        };
    }

    public leverageCreateLoanMaxRecvAllRanges = memoize(async ({ userCollateral, getExpected }: {
        userCollateral: TAmount,
        getExpected: GetExpectedFn
    }): Promise<IDict<{
            maxDebt: string,
            maxTotalCollateral: string,
            userCollateral: string,
            collateralFromUserBorrowed: string,
            collateralFromMaxDebt: string,
            maxLeverage: string,
            avgPrice: string,
        }>> => {
        this._checkLeverageZap();
        const _userCollateral = parseUnits(userCollateral, this.market.coinDecimals[1]);
        const contract = this.llamalend.contracts[this._getLeverageZapAddress()].multicallContract;

        const oraclePriceBand = await this.market.oraclePriceBand();
        const pAvgApproxBN = BN(await this.market.calcTickPrice(oraclePriceBand)); // upper tick of oracle price band
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
            const _userEffectiveCollateral: bigint = _userCollateral;
            const calls = [];
            for (let N = this.market.minBands; N <= this.market.maxBands; N++) {
                const j = N - this.market.minBands;
                calls.push(contract.max_borrowable(this.market.controller, _userEffectiveCollateral, _maxLeverageCollateral[j], N, fromBN(pBN)));
            }
            _maxBorrowable = (await this.llamalend.multicallProvider.all(calls) as bigint[]).map((_mb) => _mb * BigInt(970) / BigInt(1000));
            maxBorrowableBN = _maxBorrowable.map((_mb) => toBN(_mb, this.market.coinDecimals[0]));

            const deltaBN = maxBorrowableBN.map((mb, l) => mb.minus(maxBorrowablePrevBN[l]).abs().div(mb));
            if (BigNumber.max(...deltaBN).lt(0.0005)) {
                maxBorrowableBN = maxBorrowablePrevBN;
                break;
            }

            if (pAvgBN === null){
                const [fromToken, toToken] = this.market.coinAddresses;
                const quote = await getExpected(fromToken, toToken, _maxBorrowable[0], this.market.address);
                if (quote === null) break;

                const _y = BigInt(quote.outAmount);
                const yBN = toBN(_y, this.market.coinDecimals[1]);
                pAvgBN = maxBorrowableBN[0].div(yBN);
            }

            maxLeverageCollateralBN = maxBorrowableBN.map((mb) => mb.div(pAvgBN as BigNumber));
            _maxLeverageCollateral = maxLeverageCollateralBN.map((mlc) => fromBN(mlc, this.market.coinDecimals[1]));
        }

        const userEffectiveCollateralBN = BN(userCollateral);

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
                maxDebt: formatNumber(maxBorrowableBN[j].toString(), this.market.coinDecimals[0]),
                maxTotalCollateral: formatNumber(maxLeverageCollateralBN[j].plus(userEffectiveCollateralBN).toString(), this.market.coinDecimals[1]),
                userCollateral: formatNumber(userCollateral, this.market.coinDecimals[1]),
                collateralFromUserBorrowed: formatNumber(BN(0).toString(), this.market.coinDecimals[1]),
                collateralFromMaxDebt: formatNumber(maxLeverageCollateralBN[j].toString(), this.market.coinDecimals[1]),
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

    private _leverageExpectedCollateral = async (userCollateral: TAmount, debt: TAmount, quote: IQuote, user?: string):
        Promise<{ _futureStateCollateral: bigint, _totalCollateral: bigint, _userCollateral: bigint,
            _collateralFromUserBorrowed: bigint, _collateralFromDebt: bigint, avgPrice: string }> => {
        const _userCollateral = parseUnits(userCollateral, this.market.coinDecimals[1]);
        const _debt = parseUnits(debt, this.market.coinDecimals[0]);
        const _additionalCollateral = BigInt(quote.outAmount);
        const _collateralFromDebt = _additionalCollateral;
        const _collateralFromUserBorrowed = BigInt(0);
        let _stateCollateral = BigInt(0);
        if (user) {
            const { _collateral, _stablecoin: _borrowed } = await this.market._userState(user);
            if (_borrowed > BigInt(0)) throw Error(`User ${user} is already in liquidation mode`);
            _stateCollateral = _collateral;
        }
        const _totalCollateral = _userCollateral + _additionalCollateral;
        const _futureStateCollateral = _stateCollateral + _totalCollateral;
        const avgPrice = toBN(_debt, this.market.coinDecimals[0]).div(toBN(_additionalCollateral, this.market.coinDecimals[1])).toString();

        return { _futureStateCollateral, _totalCollateral, _userCollateral, _collateralFromUserBorrowed, _collateralFromDebt, avgPrice };
    };

    public async leverageCreateLoanExpectedCollateral({ userCollateral, debt, quote }: {
        userCollateral: TAmount,
        debt: TAmount,
        quote: IQuote
    }): Promise<{ totalCollateral: string, userCollateral: string, collateralFromUserBorrowed: string, collateralFromDebt: string, leverage: string, avgPrice: string }> {
        this._checkLeverageZap();

        const { _totalCollateral, _userCollateral, _collateralFromUserBorrowed, _collateralFromDebt, avgPrice } =
            await this._leverageExpectedCollateral(userCollateral, debt, quote);
        return {
            totalCollateral: formatUnits(_totalCollateral, this.market.coinDecimals[1]),
            userCollateral: formatUnits(_userCollateral, this.market.coinDecimals[1]),
            collateralFromUserBorrowed: formatUnits(_collateralFromUserBorrowed, this.market.coinDecimals[1]),
            collateralFromDebt: formatUnits(_collateralFromDebt, this.market.coinDecimals[1]),
            leverage: toBN(_collateralFromDebt + _userCollateral + _collateralFromUserBorrowed, this.market.coinDecimals[1])
                .div(toBN(_userCollateral + _collateralFromUserBorrowed, this.market.coinDecimals[1])).toString(),
            avgPrice,
        }
    }

    public async leverageCreateLoanExpectedMetrics({ userCollateral, debt, range, quote, healthIsFull = true }: {
        userCollateral: TAmount,
        debt: TAmount,
        range: number,
        quote: IQuote,
        healthIsFull?: boolean
    }): Promise<ILeverageMetrics> {
        this._checkLeverageZap();

        const [_n2, _n1] = await this._leverageBands(userCollateral, debt, range, quote);

        const prices = await this.market._getPrices(_n2, _n1);
        const health = await this._leverageHealth(userCollateral, debt, range, quote, healthIsFull);

        return {
            priceImpact: quote.priceImpact,
            bands: [Number(_n2), Number(_n1)],
            prices,
            health,
        }
    }

    public async leverageCreateLoanMaxRange({ userCollateral, debt, getExpected }: {
        userCollateral: TAmount,
        debt: TAmount,
        getExpected: GetExpectedFn
    }): Promise<number> {
        this._checkLeverageZap();
        const maxRecv = await this.leverageCreateLoanMaxRecvAllRanges({ userCollateral, getExpected });
        for (let N = this.market.minBands; N <= this.market.maxBands; N++) {
            if (BN(debt).gt(maxRecv[N].maxDebt)) return N - 1;
        }

        return this.market.maxBands;
    }

    private _leverageCalcN1 = memoize(async (userCollateral: TAmount, debt: TAmount, range: number, quote: IQuote, user?: string): Promise<bigint> => {
        if (range > 0) this.market._checkRange(range);
        let _stateDebt = BigInt(0);
        if (user) {
            const { _debt, _stablecoin: _borrowed } = await this.market._userState(user);
            if (_borrowed > BigInt(0)) throw Error(`User ${user} is already in liquidation mode`);
            _stateDebt = _debt;
            if (range < 0) range = await this.market.userRange(user);
        }
        const { _futureStateCollateral } = await this._leverageExpectedCollateral(userCollateral, debt, quote, user);
        const _debt = _stateDebt + parseUnits(debt, this.market.coinDecimals[0]);
        return await this.llamalend.contracts[this.market.controller].contract.calculate_debt_n1(_futureStateCollateral, _debt, range, this.llamalend.constantOptions);
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    private _leverageCalcN1AllRanges = memoize(async (userCollateral: TAmount, debt: TAmount, maxN: number, quote: IQuote): Promise<bigint[]> => {
        const { _futureStateCollateral } = await this._leverageExpectedCollateral(userCollateral, debt, quote);
        const _debt = parseUnits(debt, this.market.coinDecimals[0]);
        const calls = [];
        for (let N = this.market.minBands; N <= maxN; N++) {
            calls.push(this.llamalend.contracts[this.market.controller].multicallContract.calculate_debt_n1(_futureStateCollateral, _debt, N));
        }
        return await this.llamalend.multicallProvider.all(calls) as bigint[];
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    private async _leverageBands(userCollateral: TAmount, debt: TAmount, range: number, quote: IQuote, user?: string): Promise<[bigint, bigint]> {
        const _n1 = await this._leverageCalcN1(userCollateral, debt, range, quote, user);
        if (range < 0) {
            range = await this.market.userRange(user);
        }
        const _n2 = _n1 + BigInt(range - 1);

        return [_n2, _n1];
    }

    private async _leverageCreateLoanBandsAllRanges(userCollateral: TAmount, debt: TAmount, getExpected: GetExpectedFn, quote: IQuote): Promise<IDict<[bigint, bigint]>> {
        const maxN = await this.leverageCreateLoanMaxRange({ userCollateral, debt, getExpected });
        const _n1_arr = await this._leverageCalcN1AllRanges(userCollateral, debt, maxN, quote);
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

    public async leverageCreateLoanBandsAllRanges({ userCollateral, debt, getExpected, quote }: {
        userCollateral: TAmount,
        debt: TAmount,
        getExpected: GetExpectedFn,
        quote: IQuote
    }): Promise<IDict<[number, number] | null>> {
        this._checkLeverageZap();
        const _bands = await this._leverageCreateLoanBandsAllRanges(userCollateral, debt, getExpected, quote);

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

    public async leverageCreateLoanPricesAllRanges({ userCollateral, debt, getExpected, quote }: {
        userCollateral: TAmount,
        debt: TAmount,
        getExpected: GetExpectedFn,
        quote: IQuote
    }): Promise<IDict<[string, string] | null>> {
        this._checkLeverageZap();
        const _bands = await this._leverageCreateLoanBandsAllRanges(userCollateral, debt, getExpected, quote);

        const prices: { [index: number]: [string, string] | null } = {};
        for (let N = this.market.minBands; N <= this.market.maxBands; N++) {
            if (_bands[N]) {
                prices[N] = await this.market._calcPrices(..._bands[N]);
            } else {
                prices[N] = null
            }
        }

        return prices;
    }

    private async _leverageHealth(
        userCollateral: TAmount,
        dDebt: TAmount,
        range: number,
        quote: IQuote,
        full: boolean,
        user = this.llamalend.constants.ZERO_ADDRESS
    ): Promise<string> {
        if (range > 0) this.market._checkRange(range);
        const { _totalCollateral } = await this._leverageExpectedCollateral(userCollateral, dDebt, quote, user);
        const { _stablecoin: _borrowed } = await this.market._userState(user);
        if (_borrowed > BigInt(0)) throw Error(`User ${user} is already in liquidation mode`);
        if (range < 0) range = await this.market.userRange(user);
        const _dDebt = parseUnits(dDebt, this.market.coinDecimals[0]);

        const contract = this.llamalend.contracts[this.market.controller].contract;
        let _health = await contract.health_calculator(user, _totalCollateral, _dDebt, full, range, this.llamalend.constantOptions) as bigint;
        _health = _health * BigInt(100);

        return formatUnits(_health);
    }

    public async leverageCreateLoanIsApproved({ userCollateral }: {
        userCollateral: TAmount
    }): Promise<boolean> {
        this._checkLeverageZap();
        return await hasAllowance.call(this.llamalend,
            [this.market.coinAddresses[1]], [userCollateral], this.llamalend.signerAddress, this.market.controller);
    }

    public async leverageCreateLoanApproveEstimateGas ({ userCollateral, isMax = false }: {
        userCollateral: TAmount,
        isMax?: boolean,
    }): Promise<TGas> {
        this._checkLeverageZap();
        return await ensureAllowanceEstimateGas.call(this.llamalend,
            [this.market.coinAddresses[1]], [userCollateral], this.market.controller, isMax);
    }

    public async leverageCreateLoanApprove({ userCollateral, isMax = false }: {
        userCollateral: TAmount,
        isMax?: boolean,
    }): Promise<string[]> {
        this._checkLeverageZap();
        return await ensureAllowance.call(this.llamalend,
            [this.market.coinAddresses[1]], [userCollateral], this.market.controller, isMax);
    }

    private async _leverageCreateLoan(
        userCollateral: TAmount,
        debt: TAmount,
        range: number,
        minRecv: TAmount,
        router: string,
        calldata: string,
        estimateGas: boolean
    ): Promise<string | TGas>  {
        if (await this.userLoanExists()) throw Error("Loan already created");
        this.market._checkRange(range);

        const _userCollateral = parseUnits(userCollateral, this.market.coinDecimals[1]);
        const _debt = parseUnits(debt, this.market.coinDecimals[0]);
        const _minRecv = parseUnits(minRecv, this.market.coinDecimals[1]);

        const zapCalldata = buildCalldataForLeverageZapV2({ controllerId: await this._getControllerId(), _minRecv, router, exchangeCalldata: calldata });
        const contract = this.llamalend.contracts[this.market.controller].contract;
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
        )).hash
    }

    public async leverageCreateLoanEstimateGas({ userCollateral, debt, range, minRecv, router, calldata }: {
        userCollateral: TAmount,
        debt: TAmount,
        range: number,
        minRecv: TAmount,
        router: string,
        calldata: string
    }): Promise<number> {
        this._checkLeverageZap();
        if (!(await this.leverageCreateLoanIsApproved({ userCollateral }))) throw Error("Approval is needed for gas estimation");
        return await this._leverageCreateLoan(userCollateral, debt, range, minRecv, router, calldata,  true) as number;
    }

    public async leverageCreateLoan({ userCollateral, debt, range, minRecv, router, calldata, isMax = false }: {
        userCollateral: TAmount,
        debt: TAmount,
        range: number,
        minRecv: TAmount,
        router: string,
        calldata: string,
        isMax?: boolean,
    }): Promise<string> {
        this._checkLeverageZap();
        await this.leverageCreateLoanApprove({ userCollateral, isMax });
        return await this._leverageCreateLoan(userCollateral, debt, range, minRecv, router, calldata, false) as string;
    }

    // ---------------- LEVERAGE BORROW MORE ----------------

    private async _getMaxAdditionalBorrowable(_stateCollateral: bigint, _dCollateral: bigint, N: number, _stateDebt: bigint): Promise<bigint> {
        const result = await this.llamalend.contracts[this.market.controller].contract.max_borrowable(
            _stateCollateral + _dCollateral, N, _stateDebt, this.llamalend.constantOptions
        );
        return result - _stateDebt;
    }

    public async leverageBorrowMoreMaxRecv({ userCollateral, getExpected, address = "" }: {
        userCollateral: TAmount,
        getExpected: GetExpectedFn,
        address?: string
    }): Promise<{
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
        const { _collateral: _stateCollateral, _stablecoin: _stateBorrowed, _debt: _stateDebt } = await this.market._userState(address);
        const N = await this.market.userRange(address);
        if (_stateBorrowed > BigInt(0)) throw Error(`User ${address} is already in liquidation mode`);
        const _userCollateral = parseUnits(userCollateral, this.market.coinDecimals[1]);
        const _borrowedFromStateCollateral = await this._getMaxAdditionalBorrowable(_stateCollateral, BigInt(0), N, _stateDebt);
        const _userBorrowed = _borrowedFromStateCollateral;
        const userBorrowed = formatUnits(_userBorrowed, this.market.coinDecimals[0]);

        const oraclePriceBand = await this.market.oraclePriceBand();
        let pAvgBN = BN(await this.market.calcTickPrice(oraclePriceBand)); // upper tick of oracle price band
        let maxBorrowablePrevBN = BN(0);
        let maxBorrowableBN = BN(0);
        let _userEffectiveCollateral = BigInt(0);
        let _maxLeverageCollateral = BigInt(0);

        const contract = this.llamalend.contracts[this._getLeverageZapAddress()].contract;
        for (let i = 0; i < 5; i++) {
            maxBorrowablePrevBN = maxBorrowableBN;
            _userEffectiveCollateral = _userCollateral + fromBN(BN(userBorrowed).div(pAvgBN), this.market.coinDecimals[1]);
            let _maxBorrowable = await contract.max_borrowable(this.market.controller, _userEffectiveCollateral, _maxLeverageCollateral, N, fromBN(pAvgBN));
            _maxBorrowable = _maxBorrowable * BigInt(970) / BigInt(1000);
            if (_maxBorrowable === BigInt(0)) break;
            maxBorrowableBN = toBN(_maxBorrowable, this.market.coinDecimals[0]);

            if (maxBorrowableBN.minus(maxBorrowablePrevBN).abs().div(maxBorrowablePrevBN).lt(0.0005)) {
                maxBorrowableBN = maxBorrowablePrevBN;
                break;
            }

            // additionalCollateral = (userBorrowed / p) + leverageCollateral
            const [fromToken, toToken] = this.market.coinAddresses;
            const quote = await getExpected(fromToken, toToken, _maxBorrowable + _userBorrowed, this.market.address);
            if (quote === null) break;

            const _maxAdditionalCollateral = BigInt(quote.outAmount);
            pAvgBN = maxBorrowableBN.plus(userBorrowed).div(toBN(_maxAdditionalCollateral, this.market.coinDecimals[1]));
            _maxLeverageCollateral = _maxAdditionalCollateral - fromBN(BN(userBorrowed).div(pAvgBN), this.market.coinDecimals[1]);
        }

        if (maxBorrowableBN.eq(0)) _userEffectiveCollateral = BigInt(0);
        const _maxTotalCollateral = _userEffectiveCollateral + _maxLeverageCollateral
        let _maxBorrowable = await this._getMaxAdditionalBorrowable(_stateCollateral, _maxTotalCollateral, N, _stateDebt);
        _maxBorrowable = _maxBorrowable * BigInt(970) / BigInt(1000);

        return {
            maxDebt: formatUnits(_maxBorrowable, this.market.coinDecimals[0]),
            maxTotalCollateral: formatUnits(_maxTotalCollateral, this.market.coinDecimals[1]),
            userCollateral: formatNumber(userCollateral, this.market.coinDecimals[1]),
            collateralFromUserBorrowed: formatNumber(BN(userBorrowed).div(pAvgBN).toString(), this.market.coinDecimals[1]),
            collateralFromMaxDebt: formatUnits(_maxLeverageCollateral, this.market.coinDecimals[1]),
            avgPrice: pAvgBN.toString(),
        };
    }

    public async leverageBorrowMoreExpectedCollateral({ userCollateral, dDebt, quote, address = "" }: {
        userCollateral: TAmount,
        dDebt: TAmount,
        quote: IQuote,
        address?: string
    }): Promise<{ totalCollateral: string, userCollateral: string, collateralFromUserBorrowed: string, collateralFromDebt: string, avgPrice: string }> {
        this._checkLeverageZap();
        address = _getAddress.call(this.llamalend, address);

        const { _totalCollateral, _userCollateral, _collateralFromUserBorrowed, _collateralFromDebt, avgPrice } =
            await this._leverageExpectedCollateral(userCollateral, dDebt, quote, address);
        return {
            totalCollateral: formatUnits(_totalCollateral, this.market.coinDecimals[1]),
            userCollateral: formatUnits(_userCollateral, this.market.coinDecimals[1]),
            collateralFromUserBorrowed: formatUnits(_collateralFromUserBorrowed, this.market.coinDecimals[1]),
            collateralFromDebt: formatUnits(_collateralFromDebt, this.market.coinDecimals[1]),
            avgPrice,
        }
    }

    public async leverageBorrowMoreExpectedMetrics({ userCollateral, debt, quote, healthIsFull = true, address = "" }: {
        userCollateral: TAmount,
        debt: TAmount,
        quote: IQuote,
        healthIsFull?: boolean,
        address?: string
    }): Promise<ILeverageMetrics> {
        this._checkLeverageZap();
        address = _getAddress.call(this.llamalend, address);

        const [_n2, _n1] = await this._leverageBands(userCollateral, debt, -1, quote, address);

        const prices = await this.market._getPrices(_n2, _n1);
        const health = await this._leverageHealth(userCollateral, debt, -1, quote, healthIsFull, address);

        return {
            priceImpact: quote.priceImpact,
            bands: [Number(_n2), Number(_n1)],
            prices,
            health,
        }
    }

    private async _leverageBorrowMore(
        userCollateral: TAmount,
        debt: TAmount,
        minRecv: TAmount,
        router: string,
        calldata: string,
        estimateGas: boolean
    ): Promise<string | TGas>  {
        if (!(await this.userLoanExists())) throw Error("Loan does not exist");
        const _userCollateral = parseUnits(userCollateral, this.market.coinDecimals[1]);
        const _debt = parseUnits(debt, this.market.coinDecimals[0]);
        const _minRecv = parseUnits(minRecv, this.market.coinDecimals[1]);

        const zapCalldata = buildCalldataForLeverageZapV2({ controllerId: await this._getControllerId(), _minRecv, router, exchangeCalldata: calldata });
        const contract = this.llamalend.contracts[this.market.controller].contract;
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
        )).hash
    }

    public async leverageBorrowMoreIsApproved({ userCollateral }: {
        userCollateral: TAmount
    }): Promise<boolean> {
        return await this.leverageCreateLoanIsApproved({ userCollateral });
    }

    public async leverageBorrowMoreApprove({ userCollateral, isMax = false }: {
        userCollateral: TAmount,
        isMax?: boolean,
    }): Promise<string[]> {
        return await this.leverageCreateLoanApprove({ userCollateral, isMax });
    }

    public async leverageBorrowMoreEstimateGas({ userCollateral, debt, minRecv, router, calldata }: {
        userCollateral: TAmount,
        debt: TAmount,
        minRecv: TAmount,
        router: string,
        calldata: string
    }): Promise<number> {
        this._checkLeverageZap();
        if (!(await this.leverageCreateLoanIsApproved({ userCollateral }))) throw Error("Approval is needed for gas estimation");
        return await this._leverageBorrowMore(userCollateral, debt, minRecv, router, calldata,  true) as number;
    }

    public async leverageBorrowMore({ userCollateral, debt, minRecv, router, calldata, isMax = false }: {
        userCollateral: TAmount,
        debt: TAmount,
        minRecv: TAmount,
        router: string,
        calldata: string,
        isMax?: boolean,
    }): Promise<string> {
        this._checkLeverageZap();
        await this.leverageCreateLoanApprove({ userCollateral, isMax });
        return await this._leverageBorrowMore(userCollateral, debt, minRecv, router, calldata, false) as string;
    }

    public async leverageBorrowMoreFutureLeverage({ userCollateral, debt, quote, address = "" }: {
        userCollateral: TAmount,
        debt: TAmount,
        quote: IQuote,
        address?: string
    }): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        this._checkLeverageZap();

        const { stateCollateral, totalDepositFromUser } = await this.market._getCurrentLeverageParams(address);

        const expected = await this.leverageBorrowMoreExpectedCollateral({
            userCollateral,
            dDebt: debt,
            quote,
            address,
        });

        const futureCollateralState = BN(stateCollateral).plus(expected.totalCollateral);
        const futureTotalDepositFromUserPrecise = BN(totalDepositFromUser).plus(userCollateral).plus(expected.collateralFromUserBorrowed);

        return futureCollateralState.div(futureTotalDepositFromUserPrecise).toString();
    }

    // ---------------- LEVERAGE REPAY ----------------

    private _leverageRepayExpectedBorrowed = (stateCollateral: TAmount, userCollateral: TAmount, quote: IQuote):
        { _totalBorrowed: bigint, _borrowedFromStateCollateral: bigint, _borrowedFromUserCollateral: bigint, avgPrice: string } => {
        this._checkLeverageZap();
        const _stateCollateral = parseUnits(stateCollateral, this.market.coinDecimals[1]);
        const _userCollateral = parseUnits(userCollateral, this.market.coinDecimals[1]);
        let _borrowedExpected = BigInt(0);
        let _borrowedFromStateCollateral = BigInt(0);
        let _borrowedFromUserCollateral = BigInt(0);
        if (_stateCollateral + _userCollateral > BigInt(0)) {
            _borrowedExpected = BigInt(quote.outAmount);
            _borrowedFromStateCollateral = _stateCollateral * BigInt(10 ** 18) / (_stateCollateral + _userCollateral) * _borrowedExpected / BigInt(10 ** 18);
            _borrowedFromUserCollateral = _borrowedExpected - _borrowedFromStateCollateral;
        }
        const _totalBorrowed = _borrowedExpected;
        const avgPrice = toBN(_borrowedExpected, this.market.coinDecimals[0]).div(toBN(_stateCollateral + _userCollateral, this.market.coinDecimals[1])).toString();

        return { _totalBorrowed, _borrowedFromStateCollateral, _borrowedFromUserCollateral, avgPrice }
    };

    public leverageRepayExpectedBorrowed = async ({ stateCollateral, userCollateral, quote }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        quote: IQuote
    }): Promise<{ totalBorrowed: string, borrowedFromStateCollateral: string, borrowedFromUserCollateral: string, userBorrowed: string, avgPrice: string }> => {
        this._checkLeverageZap();

        const { _totalBorrowed, _borrowedFromStateCollateral, _borrowedFromUserCollateral, avgPrice } =
            this._leverageRepayExpectedBorrowed(stateCollateral, userCollateral, quote);

        return {
            totalBorrowed: formatUnits(_totalBorrowed, this.market.coinDecimals[0]),
            borrowedFromStateCollateral: formatUnits(_borrowedFromStateCollateral, this.market.coinDecimals[0]),
            borrowedFromUserCollateral: formatUnits(_borrowedFromUserCollateral, this.market.coinDecimals[0]),
            userBorrowed: formatNumber(0, this.market.coinDecimals[0]),
            avgPrice,
        }
    };

    public async leverageRepayIsFull({ stateCollateral, userCollateral, quote, address = "" }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        quote: IQuote,
        address?: string
    }): Promise<boolean> {
        this._checkLeverageZap();
        address = _getAddress.call(this.llamalend, address);
        const { _stablecoin: _stateBorrowed, _debt } = await this.market._userState(address);
        const { _totalBorrowed } = this._leverageRepayExpectedBorrowed(stateCollateral, userCollateral, quote);

        return _stateBorrowed + _totalBorrowed > _debt;
    }

    public async leverageRepayIsAvailable({ stateCollateral, userCollateral, quote, address = "" }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        quote: IQuote,
        address?: string
    }): Promise<boolean> {
        // 0. const { collateral, stablecoin, debt } = await this.userState(address);
        // 1. maxCollateral for deleverage is collateral from line above.
        // 2. If user is underwater (stablecoin > 0), only full repayment is available:
        //    await this.deleverageRepayStablecoins(deleverageCollateral) + stablecoin > debt
        this._checkLeverageZap();
        address = _getAddress.call(this.llamalend, address);
        const { collateral, stablecoin: borrowed, debt } = await this.market.userState(address);
        // Loan does not exist
        if (BN(debt).eq(0)) return false;
        // Can't spend more than user has
        if (BN(stateCollateral).gt(collateral)) return false;
        // Only full repayment and closing the position is available if user is underwater+
        if (BN(borrowed).gt(0)) return await this.leverageRepayIsFull({ stateCollateral, userCollateral, quote, address });

        return true;
    }

    public async leverageRepayExpectedMetrics({ stateCollateral, userCollateral, healthIsFull, quote, address }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        healthIsFull: boolean,
        quote: IQuote,
        address: string
    }): Promise<ILeverageMetrics> {
        this._checkLeverageZap();
        address = _getAddress.call(this.llamalend, address);

        const [_n2, _n1] = await this._leverageRepayBands(stateCollateral, userCollateral, quote, address);
        const prices = await this.market._getPrices(_n2, _n1);
        const health = await this._leverageRepayHealth(stateCollateral, userCollateral, quote, healthIsFull, address);

        const _stateCollateral = parseUnits(stateCollateral, this.market.coinDecimals[1]);
        const _userCollateral = parseUnits(userCollateral, this.market.coinDecimals[1]);
        const priceImpact = _stateCollateral + _userCollateral > BigInt(0) ? quote.priceImpact : null;

        return {
            priceImpact,
            bands: [Number(_n2), Number(_n1)],
            prices,
            health,
        }
    }

    private _leverageRepayBands = memoize( async (stateCollateral: TAmount, userCollateral: TAmount, quote: IQuote, address: string): Promise<[bigint, bigint]> => {
        address = _getAddress.call(this.llamalend, address);
        if (!(await this.leverageRepayIsAvailable({ stateCollateral, userCollateral, quote, address }))) return [parseUnits(0, 0), parseUnits(0, 0)];

        const _stateRepayCollateral = parseUnits(stateCollateral, this.market.coinDecimals[1]);
        const { _collateral: _stateCollateral, _debt: _stateDebt } = await this.market._userState(address);
        const N = await this.market.userRange(address);
        if (_stateDebt == BigInt(0)) throw Error(`Loan for ${address} does not exist`);
        if (_stateCollateral < _stateRepayCollateral) throw Error(`Can't use more collateral than user's position has (${_stateRepayCollateral}) > ${_stateCollateral})`);

        let _n1 = parseUnits(0, 0);
        let _n2 = parseUnits(0, 0);
        const { _totalBorrowed: _repayExpected } = this._leverageRepayExpectedBorrowed(stateCollateral, userCollateral, quote);
        try {
            _n1 = await this.llamalend.contracts[this.market.controller].contract.calculate_debt_n1(_stateCollateral - _stateRepayCollateral, _stateDebt - _repayExpected, N);
            _n2 = _n1 + BigInt(N - 1);
            return [_n2, _n1];
        } catch {
            return [_n2, _n1];
        }
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    });

    private async _leverageRepayHealth(stateCollateral: TAmount, userCollateral: TAmount, quote: IQuote, full = true, address = ""): Promise<string> {
        this._checkLeverageZap();
        address = _getAddress.call(this.llamalend, address);
        const { _stablecoin: _stateBorrowed, _debt } = await this.market._userState(address);
        const N = await this.market.userRange(address);
        if (_stateBorrowed > BigInt(0)) return "0.0";
        if (!(await this.leverageRepayIsAvailable({ stateCollateral, userCollateral, quote, address }))) return "0.0";

        const { _totalBorrowed } = this._leverageRepayExpectedBorrowed(stateCollateral, userCollateral, quote);
        const _dCollateral = parseUnits(stateCollateral, this.market.coinDecimals[1]) * BigInt(-1);
        const _dDebt = _totalBorrowed * BigInt(-1);

        if (_debt + _dDebt <= BigInt(0)) return "0.0";
        const contract = this.llamalend.contracts[this.market.controller].contract;
        let _health = await contract.health_calculator(address, _dCollateral, _dDebt, full, N, this.llamalend.constantOptions) as bigint;
        _health = _health * BigInt(100);

        return this.llamalend.formatUnits(_health);
    }

    public async leverageRepayIsApproved({ userCollateral }: {
        userCollateral: TAmount
    }): Promise<boolean> {
        this._checkLeverageZap();
        return await hasAllowance.call(this.llamalend,
            [this.market.coinAddresses[1]],
            [userCollateral],
            this.llamalend.signerAddress,
            this._getLeverageZapAddress()
        );
    }

    public async leverageRepayApproveEstimateGas ({ userCollateral, isMax = false }: {
        userCollateral: TAmount,
        isMax?: boolean,
    }): Promise<TGas> {
        this._checkLeverageZap();
        return await ensureAllowanceEstimateGas.call(this.llamalend,
            [this.market.coinAddresses[1]],
            [userCollateral],
            this._getLeverageZapAddress(),
            isMax
        );
    }

    public async leverageRepayApprove({ userCollateral, isMax = false }: {
        userCollateral: TAmount,
        isMax?: boolean,
    }): Promise<string[]> {
        this._checkLeverageZap();
        return await ensureAllowance.call(this.llamalend,
            [this.market.coinAddresses[1]],
            [userCollateral],
            this._getLeverageZapAddress(),
            isMax
        );
    }

    private async _leverageRepay(
        stateCollateral: TAmount,
        userCollateral: TAmount,
        minRecv: TAmount,
        router: string,
        calldata: string,
        estimateGas: boolean
    ): Promise<string | TGas>  {
        if (!(await this.userLoanExists())) throw Error("Loan does not exist");
        const _stateCollateral = parseUnits(stateCollateral, this.market.coinDecimals[1]);
        const _userCollateral = parseUnits(userCollateral, this.market.coinDecimals[1]);
        const _minRecv = parseUnits(minRecv, this.market.coinDecimals[0]);

        const exchangeCalldata = _stateCollateral + _userCollateral > BigInt(0) ? calldata : "0x";
        const zapCalldata = buildCalldataForLeverageZapV2({ controllerId: await this._getControllerId(), _minRecv, router, exchangeCalldata });
        const contract = this.llamalend.contracts[this.market.controller].contract;
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
        )).hash
    }

    public async leverageRepayEstimateGas({ stateCollateral, userCollateral, minRecv, router, calldata }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        minRecv: TAmount,
        router: string,
        calldata: string,
    }): Promise<number> {
        this._checkLeverageZap();
        if (!(await this.leverageRepayIsApproved({ userCollateral }))) throw Error("Approval is needed for gas estimation");
        return await this._leverageRepay(stateCollateral, userCollateral, minRecv, router, calldata, true) as number;
    }

    public async leverageRepay({ stateCollateral, userCollateral, minRecv, router, calldata, isMax = false }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        minRecv: TAmount,
        router: string,
        calldata: string,
        isMax?: boolean,
    }): Promise<string> {
        this._checkLeverageZap();
        await this.leverageRepayApprove({ userCollateral, isMax });
        return await this._leverageRepay(stateCollateral, userCollateral, minRecv, router, calldata, false) as string;
    }

    public async leverageRepayFutureLeverage({ stateCollateral, userCollateral, address = "" }: {
        stateCollateral: TAmount,
        userCollateral: TAmount,
        address?: string
    }): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        this._checkLeverageZap();

        const { stateCollateral: currentStateCollateral, totalDepositFromUser } = await this.market._getCurrentLeverageParams(address);

        const futureCollateralState = BN(currentStateCollateral).minus(stateCollateral);
        const futureTotalDepositFromUserPrecise = BN(totalDepositFromUser).plus(userCollateral);

        return futureCollateralState.div(futureTotalDepositFromUserPrecise).toString();
    }
}
