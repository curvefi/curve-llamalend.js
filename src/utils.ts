import { ethers,  BigNumberish, Numeric } from "ethers";
import { Call } from "@curvefi/ethcall";
import BigNumber from 'bignumber.js';
import { ICurveContract, IDict, TGas } from "./interfaces.js";
import { _getUsdPricesFromApi, _getOraclePricesFromApi } from "./external-api.js";
import type { Llamalend } from "./llamalend.js";
import { JsonFragment } from "ethers/lib.esm";
import { L2Networks } from "./constants/L2Networks.js";
import memoize from "memoizee";

export const MAX_ALLOWANCE = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");  // 2**256 - 1
export const MAX_ACTIVE_BAND = BigInt("57896044618658097711785492504343953926634992332820282019728792003956564819967");  // 2**255 - 1

// Common

export const createCall = (contract: ICurveContract, name: string, params: any[]): Call => {
    const _abi = contract.abi;
    const _name = name.split('-')[0];
    const func = _abi.find((f: JsonFragment) => f.name === _name)
    const inputs = func?.inputs || [];
    const outputs = func?.outputs || [];

    return {
        contract: {
            address: contract.address,
        },
        name: _name,
        inputs,
        outputs,
        params,
    }
}

// Formatting numbers

export const _cutZeros = (strn: string): string => {
    return strn.replace(/0+$/gi, '').replace(/\.$/gi, '');
}

export const checkNumber = (n: number | string): number | string => {
    if (Number(n) !== Number(n)) throw Error(`${n} is not a number`); // NaN
    return n
}

export const formatNumber = (n: number | string, decimals = 18): string => {
    n = checkNumber(n);
    const [integer, fractional] = String(n).split(".");

    return !fractional ? integer : integer + "." + fractional.slice(0, decimals);
}

export const formatUnits = (value: BigNumberish, unit?: string | Numeric): string => {
    return ethers.formatUnits(value, unit);
}

export const parseUnits = (n: number | string, decimals = 18): bigint => {
    return ethers.parseUnits(formatNumber(n, decimals), decimals);
}

// bignumber.js

export const BN = (val: number | string): BigNumber => new BigNumber(checkNumber(val));

export const toBN = (n: bigint, decimals = 18): BigNumber => {
    return BN(formatUnits(n, decimals));
}

export const toStringFromBN = (bn: BigNumber, decimals = 18): string => {
    return bn.toFixed(decimals);
}

export const fromBN = (bn: BigNumber, decimals = 18): bigint => {
    return parseUnits(toStringFromBN(bn, decimals), decimals)
}

// -----------------------------------------------------------------------------------------------


export const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
export const isEth = (address: string): boolean => address.toLowerCase() === ETH_ADDRESS.toLowerCase();
export const getEthIndex = (addresses: string[]): number => addresses.map((address: string) => address.toLowerCase()).indexOf(ETH_ADDRESS.toLowerCase());
export const _mulBy1_3 = (n: bigint): bigint => n * parseUnits("130", 0) / parseUnits("100", 0);


export const smartNumber = (abstractNumber: bigint | bigint[]): number | number[] => {
    if(Array.isArray(abstractNumber)) {
        return [Number(abstractNumber[0]), Number(abstractNumber[1])];
    } else {
        return Number(abstractNumber);
    }
}

export const DIGas = (gas: bigint | Array<bigint>): bigint => {
    if(Array.isArray(gas)) {
        return gas[0];
    } else {
        return gas;
    }
}

export const getGasFromArray = (gas: number[]): number | number[] => {
    if(gas[1] === 0) {
        return gas[0];
    } else {
        return gas;
    }
}

export const gasSum = (gas: number[], currentGas: number | number[]): number[] => {
    if(Array.isArray(currentGas)) {
        gas[0] = gas[0] + currentGas[0];
        gas[1] = gas[1] + currentGas[1];
    } else {
        gas[0] = gas[0] + currentGas;
    }
    return gas;
}

export const _getAddress = function (this: Llamalend, address: string): string {
    address = address || this.signerAddress;
    if (!address) throw Error("Need to connect wallet or pass address into args");

    return address
}

export const handleMultiCallResponse = (callsMap: string[], response: any[]) => {
    const result: Record<string, any> = {};
    const responseLength = callsMap.length;
    for(let i = 0; i < responseLength; i++) {
        result[callsMap[i]] = response.filter((a, j) => j % responseLength === i) as string[];
    }
    return result;
}

// coins can be either addresses or symbols
export const _getCoinAddressesNoCheck = function (this: Llamalend, ...coins: string[] | string[][]): string[] {
    if (coins.length == 1 && Array.isArray(coins[0])) coins = coins[0];
    coins = coins as string[];
    return coins.map((c) => c.toLowerCase()).map((c) => this.constants.COINS[c] || c);
}

export const _getCoinAddresses = function (this: Llamalend, coins: string[]): string[] {
    const coinAddresses = _getCoinAddressesNoCheck.call(this, coins);
    const availableAddresses = Object.keys(this.constants.DECIMALS);
    for (const coinAddr of coinAddresses) {
        if (!availableAddresses.includes(coinAddr)) throw Error(`Coin with address '${coinAddr}' is not available`);
    }

    return coinAddresses
}

export const _getCoinDecimals = function (this: Llamalend, coinAddresses: string[]): number[] {
    return coinAddresses.map((coinAddr) => this.constants.DECIMALS[coinAddr.toLowerCase()] ?? 18);
}


// --- BALANCES ---

export const _getBalances = async function (this: Llamalend, coinAddresses: string[], address = ""): Promise<bigint[]> {
    address = _getAddress.call(this, address);
    const _coinAddresses = [...coinAddresses];
    const ethIndex = getEthIndex(_coinAddresses);
    if (ethIndex !== -1) {
        _coinAddresses.splice(ethIndex, 1);
    }

    const contractCalls = [];
    for (const coinAddr of _coinAddresses) {
        contractCalls.push(this.contracts[coinAddr].multicallContract.balanceOf(address));
    }
    const _balances: bigint[] = await this.multicallProvider.all(contractCalls);

    if (ethIndex !== -1) {
        const ethBalance: bigint = await this.provider.getBalance(address);
        _balances.splice(ethIndex, 0, ethBalance);
    }

    return _balances
}

export const getBalances = async function (this: Llamalend, coins: string[], address = ""): Promise<string[]> {
    const coinAddresses = _getCoinAddresses.call(this, coins);
    const decimals = _getCoinDecimals.call(this, coinAddresses).map((item) => Number(item));
    const _balances = await _getBalances.call(this, coinAddresses, address);

    return _balances.map((_b, i: number ) => formatUnits(_b, decimals[i]));
}

const _getAllowanceMemoized = memoize(async function (coins: string[], address: string, spender: string, contracts: any, multicallProvider: any, constantOptions: any): Promise<bigint[]> {
    const _coins = [...coins]
    const ethIndex = getEthIndex(_coins);
    if (ethIndex !== -1) {
        _coins.splice(ethIndex, 1);
    }

    let allowance: bigint[];
    if (_coins.length === 1) {
        allowance = [await contracts[_coins[0]].contract.allowance(address, spender, constantOptions)];
    } else {
        const contractCalls = _coins.map((coinAddr) => contracts[coinAddr].multicallContract.allowance(address, spender));
        allowance = await multicallProvider.all(contractCalls);
    }

    if (ethIndex !== -1) {
        allowance.splice(ethIndex, 0, MAX_ALLOWANCE);
    }

    return allowance;
}, {
    promise: true,
    maxAge: 5 * 1000, // 5s
    primitive: true,
    length: 6,
});

export async function _getAllowance(this: Llamalend, coins: string[], address: string, spender: string): Promise<bigint[]> {
    return _getAllowanceMemoized(coins, address, spender, this.contracts, this.multicallProvider, this.constantOptions);
}

// coins can be either addresses or symbols
export const getAllowance = async function (this: Llamalend, coins: string[], address: string, spender: string): Promise<string[]> {
    const coinAddresses = _getCoinAddresses.call(this, coins);
    const decimals = _getCoinDecimals.call(this, coinAddresses).map((item) => Number(item));
    const _allowance = await _getAllowance.call(this, coinAddresses, address, spender);

    return _allowance.map((a, i) => this.formatUnits(a, decimals[i]))
}

// coins can be either addresses or symbols
export const hasAllowance = async function (this: Llamalend, coins: string[], amounts: (number | string)[], address: string, spender: string): Promise<boolean> {
    const coinAddresses = _getCoinAddresses.call(this, coins);
    const decimals = _getCoinDecimals.call(this, coinAddresses).map((item) => Number(item));
    const _allowance = await _getAllowance.call(this, coinAddresses, address, spender);
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));

    return _allowance.map((a, i) => a >= _amounts[i]).reduce((a, b) => a && b);
}

export const _ensureAllowance = async function (this: Llamalend, coins: string[], _amounts: bigint[], spender: string, isMax = true): Promise<string[]> {
    const address = this.signerAddress;
    const _allowance: bigint[] = await _getAllowance.call(this, coins, address, spender);

    const txHashes: string[] = []
    for (let i = 0; i < _allowance.length; i++) {
        if (_allowance[i] < _amounts[i]) {
            const contract = this.contracts[coins[i]].contract;
            const _approveAmount = isMax ? MAX_ALLOWANCE : _amounts[i];
            await this.updateFeeData();
            const gasLimit = _mulBy1_3(DIGas(await contract.approve.estimateGas(spender, _approveAmount, this.constantOptions)));
            txHashes.push((await contract.approve(spender, _approveAmount, { ...this.options, gasLimit })).hash);
        }
    }

    return txHashes;
}

// coins can be either addresses or symbols
export const ensureAllowanceEstimateGas = async function (this: Llamalend, coins: string[], amounts: (number | string)[], spender: string, isMax = true): Promise<TGas> {
    const coinAddresses = _getCoinAddresses.call(this, coins);
    const decimals = _getCoinDecimals.call(this, coinAddresses).map((item) => Number(item));
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));
    const _allowance: bigint[] = await _getAllowance.call(this, coinAddresses, this.signerAddress, spender);

    let gas = [0,0];
    for (let i = 0; i < _allowance.length; i++) {
        if (_allowance[i] < _amounts[i]) {
            const contract = this.contracts[coinAddresses[i]].contract;
            const _approveAmount = isMax ? MAX_ALLOWANCE : _amounts[i];
            const currentGas = smartNumber(await contract.approve.estimateGas(spender, _approveAmount, this.constantOptions));
            gas = gasSum(gas, currentGas);
        }
    }

    return getGasFromArray(gas);
}

// coins can be either addresses or symbols
export const ensureAllowance = async function (this: Llamalend, coins: string[], amounts: (number | string)[], spender: string, isMax = true): Promise<string[]> {
    const coinAddresses = _getCoinAddresses.call(this, coins);
    const decimals = _getCoinDecimals.call(this, coinAddresses).map((item) => Number(item));
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));

    return await _ensureAllowance.call(this, coinAddresses, _amounts, spender, isMax)
}

const _usdRatesCache: IDict<{ rate: number, time: number }> = {}
export const _getUsdRate = async function (this: Llamalend, assetId: string): Promise<number> {
    if (this.chainId === 1 && assetId.toLowerCase() === '0x8762db106b2c2a0bccb3a80d1ed41273552616e8') return 0; // RSR
    const pricesFromApi = await _getUsdPricesFromApi.call(this);
    if (assetId.toLowerCase() in pricesFromApi) return pricesFromApi[assetId.toLowerCase()];

    if (assetId === 'USD' || (this.chainId === 137 && (assetId.toLowerCase() === this.constants.COINS.am3crv.toLowerCase()))) return 1

    let chainName = {
        1: 'ethereum',
        10: 'optimistic-ethereum',
        56: "binance-smart-chain",
        100: 'xdai',
        137: 'polygon-pos',
        146: 'sonic',
        196: 'x-layer',
        250: 'fantom',
        252: 'fraxtal',
        324: 'zksync',
        1284: 'moonbeam',
        2222: 'kava',
        5000: 'mantle',
        8453: 'base',
        42220: 'celo',
        43114: 'avalanche',
        42161: 'arbitrum-one',
        1313161554: 'aurora',
    }[this.chainId];

    const nativeTokenName = {
        1: 'ethereum',
        10: 'ethereum',
        56: 'binancecoin',
        100: 'xdai',
        137: 'matic-network',
        146: 'sonic-3',
        196: 'okb',
        250: 'fantom',
        252: 'frax-ether',
        324: 'ethereum',
        1284: 'moonbeam',
        2222: 'kava',
        5000: 'mantle',
        8453: 'ethereum',
        42220: 'celo',
        43114: 'avalanche-2',
        42161: 'ethereum',
        1313161554: 'ethereum',
    }[this.chainId] as string;

    if (chainName === undefined) {
        throw Error('curve object is not initialized')
    }

    assetId = {
        'CRV': 'curve-dao-token',
        'EUR': 'stasis-eurs',
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'LINK': 'link',
    }[assetId.toUpperCase()] || assetId
    assetId = isEth(assetId) ? nativeTokenName : assetId.toLowerCase();

    // No EURT on Coingecko Polygon
    if (this.chainId === 137 && assetId.toLowerCase() === this.constants.COINS.eurt) {
        chainName = 'ethereum';
        assetId = '0xC581b735A1688071A1746c968e0798D642EDE491'.toLowerCase(); // EURT Ethereum
    }

    // CRV
    if (assetId.toLowerCase() === this.constants.ALIASES.crv) {
        assetId = 'curve-dao-token';
    }

    if ((_usdRatesCache[assetId]?.time || 0) + 600000 < Date.now()) {
        const url = [nativeTokenName, 'ethereum', 'bitcoin', 'link', 'curve-dao-token', 'stasis-eurs'].includes(assetId.toLowerCase()) ?
            `https://api.coingecko.com/api/v3/simple/price?ids=${assetId}&vs_currencies=usd` :
            `https://api.coingecko.com/api/v3/simple/token_price/${chainName}?contract_addresses=${assetId}&vs_currencies=usd`
        const response = await fetch(url);
        const data = await response.json() as Record<string, { usd: number }>;
        try {
            _usdRatesCache[assetId] = {'rate': data[assetId]['usd'] ?? 0, 'time': Date.now()};
        } catch { // TODO pay attention!
            _usdRatesCache[assetId] = {'rate': 0, 'time': Date.now()};
        }
    }

    if (_usdRatesCache[assetId]['rate'] === 0) {
        const originalAssetId = arguments[0];
        const oraclePrices = await _getOraclePricesFromApi.call(this, this.constants.NETWORK_NAME);
        
        if (originalAssetId.toLowerCase() in oraclePrices) {
            const oraclePriceInCrvUsd = oraclePrices[originalAssetId.toLowerCase()];
            
            if (oraclePriceInCrvUsd > 0) {
                const crvUsdAddress = this.constants.ALIASES.crvUSD;
                const crvUsdPrice = assetId.toLowerCase() === crvUsdAddress.toLowerCase() ? 1 :
                    await _getUsdRate.call(this, crvUsdAddress);
                
                _usdRatesCache[assetId] = {'rate': oraclePriceInCrvUsd * crvUsdPrice, 'time': Date.now()};
            }
        }
    }

    return _usdRatesCache[assetId]['rate']
}

export const getUsdRate = async function (this: Llamalend, coin: string): Promise<number> {
    const [coinAddress] = _getCoinAddressesNoCheck.call(this, coin);
    return await _getUsdRate.call(this, coinAddress);
}

export const getBaseFeeByLastBlock = async function (this: Llamalend): Promise<number> {
    const provider = this.provider;

    try {
        const block = await provider.getBlock('latest');
        if(!block) {
            return 0.01
        }

        return Number(block.baseFeePerGas) / (10**9);
    } catch (error: any) {
        throw new Error(error)
    }
}

export const getGasPriceFromL1 = async function (this: Llamalend): Promise<number> {
    if(L2Networks.includes(this.chainId) && this.L1WeightedGasPrice) {
        return this.L1WeightedGasPrice + 1e9; // + 1 gwei
    } else {
        throw Error("This method exists only for L2 networks");
    }
}

export async function getGasPriceFromL2(this: Llamalend): Promise<number> {
    if(this.chainId === 42161) {
        try {
            return await getBaseFeeByLastBlock.call(this)
        } catch (e: any) {
            throw Error(e)
        }
    } else {
        throw Error("This method exists only for ARBITRUM network");
    }
}

export const getGasInfoForL2 = async function (this: Llamalend): Promise<Record<string, number>> {
    if(this.chainId === 42161) {
        try {
            const baseFee = await getBaseFeeByLastBlock.call(this)

            return  {
                maxFeePerGas: Number(((baseFee * 1.1) + 0.01).toFixed(2)),
                maxPriorityFeePerGas: 0.01,
            }
        } catch (e: any) {
            throw Error(e)
        }
    } else {
        throw Error("This method exists only for ARBITRUM network");
    }
}

export const totalSupply = async function (this: Llamalend): Promise<{ total: string, minted: string, pegKeepersDebt: string }> {
    const calls = [];
    for (const llammaId of this.getMintMarketList()) {
        const controllerAddress = this.constants.LLAMMAS[llammaId].controller_address;
        const controllerContract = this.contracts[controllerAddress].multicallContract;
        calls.push(controllerContract.minted(), controllerContract.redeemed());
    }
    for (const pegKeeper of this.constants.PEG_KEEPERS) {
        calls.push(this.contracts[pegKeeper].multicallContract.debt());
    }
    const res: bigint[] = await this.multicallProvider.all(calls);

    let mintedBN = BN(0);
    for (let i = 0; i < this.getMintMarketList().length; i++) {
        const [_minted, _redeemed] = res.splice(0, 2);
        mintedBN = toBN(_minted).minus(toBN(_redeemed)).plus(mintedBN);
    }
    let pegKeepersBN = BN(0);
    for (const _pegKeeperDebt of res) {
        pegKeepersBN = pegKeepersBN.plus(toBN(_pegKeeperDebt));
    }

    return { total: mintedBN.plus(pegKeepersBN).toString(), minted: mintedBN.toString(), pegKeepersDebt: pegKeepersBN.toString() };
}

export const getLsdApy = memoize(async(name: 'wstETH' | 'sfrxETH'): Promise<{
        apy: number,
        baseApy: number,
        apyMean30d: number,
    }> => {
    const response = await fetch('https://yields.llama.fi/pools');
    const {data} = await response.json() as { data: { chain: string, project: string, symbol: string, apy: number, apyBase: number, apyMean30d: number }[] };

    const params = {
        'wstETH': {
            project: 'lido',
            symbol: 'STETH',
        },
        'sfrxETH': {
            project: 'frax-ether',
            symbol: 'SFRXETH',
        },
    }

    const result = data.find(({
        chain,
        project,
        symbol,
    }) => (
        chain === 'Ethereum' &&
            project === params[name].project &&
            symbol === params[name].symbol
    ));

    if(result) {
        return {
            apy: result.apy,
            baseApy: result.apyBase,
            apyMean30d: result.apyMean30d,
        };
    }

    throw new Error('Pool not found')
},
{
    promise: true,
    maxAge: 60 * 1000, // 1m
});