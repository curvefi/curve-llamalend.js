import { type TransactionRequest, ethers, Contract, Networkish, BigNumberish, Numeric, AbstractProvider, BrowserProvider, Signer, JsonRpcProvider } from "ethers";
import { Provider as MulticallProvider, Contract as MulticallContract, Call } from '@curvefi/ethcall';
import {
    IChainId,
    ILlamalend,
    ILlamma,
    IDict,
    INetworkName,
    ICurveContract,
    IOneWayMarket,
    ICoin,
} from "./interfaces.js";
// OneWayMarket ABIs
import OneWayLendingFactoryABI from "./constants/abis/OneWayLendingFactoryABI.json" with {type: 'json'};
import OneWayLendingFactoryV2ABI from "./constants/abis/OneWayLendingFactoryV2ABI.json" with {type: 'json'};
import ERC20ABI from './constants/abis/ERC20.json' with {type: 'json'};
import ERC4626ABI from './constants/abis/ERC4626.json' with {type: 'json'};
import GaugeControllerABI from './constants/abis/GaugeController.json' with {type: 'json'};
import GaugeFactoryMainnetABI from './constants/abis/GaugeFactoryMainnet.json' with {type: 'json'};
import GaugeFactorySidechainABI from './constants/abis/GaugeFactorySidechain.json' with {type: 'json'};
import MinterABI from './constants/abis/Minter.json' with {type: 'json'};
import LeverageZapABI from './constants/abis/LeverageZap.json' with {type: 'json'};
import gasOracleABI from './constants/abis/gas_oracle_optimism.json' with {type: 'json'};
import gasOracleBlobABI from './constants/abis/gas_oracle_optimism_blob.json' with {type: 'json'};
// crvUSD ABIs
import llammaABI from "./constants/abis/crvUSD/llamma.json" with {type: 'json'};
import controllerABI from "./constants/abis/crvUSD/controller.json" with {type: 'json'};
import PegKeeper from "./constants/abis/crvUSD/PegKeeper.json" with {type: 'json'};
import HealthCalculatorZapABI from "./constants/abis/crvUSD/HealthCalculatorZap.json" with {type: 'json'};
import LeverageZapCrvUSDABI from "./constants/abis/crvUSD/LeverageZap.json" with {type: 'json'};
import DeleverageZapABI from "./constants/abis/crvUSD/DeleverageZap.json" with {type: 'json'};

import {
    ALIASES_ETHEREUM,
    ALIASES_OPTIMISM,
    ALIASES_ARBITRUM,
    ALIASES_FRAXTAL,
    ALIASES_SONIC,
} from "./constants/aliases.js";
import {
    COINS_ETHEREUM,
    COINS_OPTIMISM,
    COINS_ARBITRUM,
    COINS_FRAXTAL,
    COINS_SONIC,
} from "./constants/coins.js";
import {LLAMMAS} from "./constants/llammas.js";
import {resolveMonetaryPolicyAbi} from "./mintMarkets/monetaryPolicyAbi.js";
import {L2Networks} from "./constants/L2Networks.js";
import {createCall, handleMultiCallResponse} from "./utils.js";
import {_getMarketsData, _getCrvUsdMarketsData} from "./external-api.js";
import {MintMarketTemplate} from "./mintMarkets";
import {LendMarketTemplate} from "./lendMarkets";
import {fetchOneWayMarketsByBlockchain, fetchOneWayMarketsByAPI} from "./lendMarkets/fetch/fetchLendMarkets.js";
import {fetchMintMarketsByBlockchain, fetchMintMarketsByAPI} from "./mintMarkets/fetch/fetchMintMarkets.js";

const memoizeByAddress = <T, Args extends unknown[]>(
    factory: (address: string, abi: any, ...args: Args) => T
): () => (address: string, abi: any, ...args: Args) => T => {
    return () => {
        const cache: Record<string, T> = {};
        return (address: string, abi: any, ...args: Args): T => {
            if (address in cache) {
                return cache[address];
            }
            const result = factory(address, abi, ...args);
            cache[address] = result;
            return result;
        };
    };
};

const memoizedContract = memoizeByAddress(
    (address, abi, provider: BrowserProvider | JsonRpcProvider | Signer) => new Contract(address, abi, provider)
);

const memoizedMulticallContract = memoizeByAddress(
    (address, abi) => new MulticallContract(address, abi)
);

export const NETWORK_CONSTANTS: { [index: number]: any } = {
    1: {
        NAME: 'ethereum',
        ALIASES: ALIASES_ETHEREUM,
        COINS: COINS_ETHEREUM,
        EXCLUDED_PROTOCOLS_1INCH: "CURVE_V2_LLAMMA",
    },
    10: {
        NAME: 'optimism',
        ALIASES: ALIASES_OPTIMISM,
        COINS: COINS_OPTIMISM,
    },
    146: {
        NAME: 'sonic',
        ALIASES: ALIASES_SONIC,
        COINS: COINS_SONIC,
    },
    252: {
        NAME: 'fraxtal',
        ALIASES: ALIASES_FRAXTAL,
        COINS: COINS_FRAXTAL,
    },
    42161: {
        NAME: 'arbitrum',
        ALIASES: ALIASES_ARBITRUM,
        COINS: COINS_ARBITRUM,
        EXCLUDED_PROTOCOLS_1INCH: "",
    },
}


class Llamalend implements ILlamalend {
    address: string;
    crvUsdAddress: string;
    provider: ethers.BrowserProvider | ethers.JsonRpcProvider;
    multicallProvider: MulticallProvider;
    signer: ethers.Signer | null;
    signerAddress: string;
    chainId: IChainId;
    contracts: { [index: string]: ICurveContract };
    mintMarkets: { [addres: string]: MintMarketTemplate };
    lendMarkets: { [address: string]: LendMarketTemplate<'v1'> | LendMarketTemplate<'v2'> };
    feeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number };
    constantOptions: { gasLimit: number };
    options: { gasPrice?: number | bigint, maxFeePerGas?: number | bigint, maxPriorityFeePerGas?: number | bigint };
    L1WeightedGasPrice?: number;
    constants: {
        ONE_WAY_MARKETS: IDict<IOneWayMarket>,
        ONE_WAY_MARKETS_V2: IDict<IOneWayMarket>,
        DECIMALS: IDict<number>;
        NETWORK_NAME: INetworkName;
        ALIASES: Record<string, string>;
        COINS: Record<string, string>;
        ZERO_ADDRESS: string,
        EXCLUDED_PROTOCOLS_1INCH: string,
        LLAMMAS: IDict<ILlamma>,
        FACTORY: string,
        PEG_KEEPERS: string[],
        WETH: string,
    };

    constructor() {
        this.address = '00000'
        this.crvUsdAddress = COINS_ETHEREUM.crvusd;
        this.provider = null as unknown as ethers.BrowserProvider | ethers.JsonRpcProvider;
        this.signer = null;
        this.signerAddress = "";
        this.chainId = 1;
        this.multicallProvider = null as unknown as MulticallProvider;
        this.contracts = {};
        this.mintMarkets = {};
        this.lendMarkets = {};
        this.feeData = {}
        this.constantOptions = { gasLimit: 12000000 }
        this.options = {};
        this.constants = {
            ONE_WAY_MARKETS: {},
            ONE_WAY_MARKETS_V2: {},
            LLAMMAS: {},
            COINS: {},
            DECIMALS: {},
            NETWORK_NAME: 'ethereum',
            ALIASES: {},
            ZERO_ADDRESS: '0x000',
            EXCLUDED_PROTOCOLS_1INCH: "",
            FACTORY: "0xC9332fdCB1C491Dcc683bAe86Fe3cb70360738BC".toLowerCase(),
            PEG_KEEPERS: [
                '0x9201da0d97caaaff53f01b2fb56767c7072de340'.toLowerCase(),
                '0xfb726f57d251ab5c731e5c64ed4f5f94351ef9f3'.toLowerCase(),
                '0x3fa20eaa107de08b38a8734063d605d5842fe09c'.toLowerCase(),
                '0x0a05ff644878b908ef8eb29542aa88c07d9797d3'.toLowerCase(),
                '0x503E1Bf274e7a6c64152395aE8eB57ec391F91F8'.toLowerCase(),
            ],
            WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toLowerCase(),
        };
    }

    async init(
        providerType: 'JsonRpc' | 'Web3' | 'Infura' | 'Alchemy',
        providerSettings: { url?: string, privateKey?: string, batchMaxCount? : number } | { externalProvider: ethers.Eip1193Provider } | { network?: Networkish, apiKey?: string },
        options: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number, chainId?: number } = {} // gasPrice in Gwei
    ): Promise<void> {
        this.provider = null as unknown as ethers.BrowserProvider | ethers.JsonRpcProvider;
        this.signer = null as unknown as ethers.Signer;
        this.signerAddress = "";
        this.chainId = 1;
        this.multicallProvider = null as unknown as MulticallProvider;
        this.contracts = {};
        this.feeData = {}
        this.constantOptions = { gasLimit: 12000000 }
        this.options = {};
        this.constants = {
            ONE_WAY_MARKETS: {},
            ONE_WAY_MARKETS_V2: {},
            LLAMMAS: {...LLAMMAS},
            COINS: {},
            DECIMALS: {},
            NETWORK_NAME: 'ethereum',
            ALIASES: {},
            ZERO_ADDRESS: ethers.ZeroAddress,
            EXCLUDED_PROTOCOLS_1INCH: "",
            FACTORY: "0xC9332fdCB1C491Dcc683bAe86Fe3cb70360738BC".toLowerCase(),
            PEG_KEEPERS: [
                '0x9201da0d97caaaff53f01b2fb56767c7072de340'.toLowerCase(),
                '0xfb726f57d251ab5c731e5c64ed4f5f94351ef9f3'.toLowerCase(),
                '0x3fa20eaa107de08b38a8734063d605d5842fe09c'.toLowerCase(),
                '0x0a05ff644878b908ef8eb29542aa88c07d9797d3'.toLowerCase(),
                '0x503E1Bf274e7a6c64152395aE8eB57ec391F91F8'.toLowerCase(),
            ],
            WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toLowerCase(),
        };

        let signerPromise: Promise<ethers.Signer | null>;

        if (providerType.toLowerCase() === 'JsonRpc'.toLowerCase()) {
            providerSettings = providerSettings as { url: string, privateKey: string, batchMaxCount? : number };

            let jsonRpcApiProviderOptions;
            if (providerSettings.batchMaxCount) {
                jsonRpcApiProviderOptions = { batchMaxCount: providerSettings.batchMaxCount };
            }

            this.provider = new ethers.JsonRpcProvider(
                providerSettings.url || 'http://localhost:8545/',
                undefined,
                jsonRpcApiProviderOptions
            );

            if (providerSettings.privateKey) {
                signerPromise = Promise.resolve(new ethers.Wallet(providerSettings.privateKey, this.provider));
            } else if (!providerSettings.url?.startsWith("https://rpc.gnosischain.com")) {
                signerPromise = this.provider.getSigner().catch(() => null);
            } else {
                signerPromise = Promise.resolve(null);
            }
        } else if (providerType.toLowerCase() === 'Web3'.toLowerCase()) {
            providerSettings = providerSettings as { externalProvider: ethers.Eip1193Provider };
            this.provider = new ethers.BrowserProvider(providerSettings.externalProvider);
            signerPromise = this.provider.getSigner();
        } else if (providerType.toLowerCase() === 'Infura'.toLowerCase()) {
            providerSettings = providerSettings as { network?: Networkish, apiKey?: string };
            this.provider = new ethers.InfuraProvider(providerSettings.network, providerSettings.apiKey);
            signerPromise = Promise.resolve(null);
        } else if (providerType.toLowerCase() === 'Alchemy'.toLowerCase()) {
            providerSettings = providerSettings as { network?: Networkish, apiKey?: string };
            this.provider = new ethers.AlchemyProvider(providerSettings.network, providerSettings.apiKey);
            signerPromise = Promise.resolve(null);
        } else {
            throw Error('Wrong providerType');
        }

        const [signer, network] = await Promise.all([
            signerPromise,
            this.provider.getNetwork(),
        ]);
        this.signer = signer;
        this.chainId = Number(network.chainId) === 133 || Number(network.chainId) === 31337 ? 1 : Number(network.chainId) as IChainId;
        console.log("CURVE-LLAMALEND-JS IS CONNECTED TO NETWORK:", { name: network.name.toUpperCase(), chainId: Number(this.chainId) });

        if(this.chainId === 42161) {
            this.constantOptions = { gasLimit: 1125899906842624 } // https://arbiscan.io/chart/gaslimit
        }

        this.constants.NETWORK_NAME = NETWORK_CONSTANTS[this.chainId].NAME;
        this.constants.ALIASES = NETWORK_CONSTANTS[this.chainId].ALIASES;
        this.constants.COINS = NETWORK_CONSTANTS[this.chainId].COINS;
        this.constants.EXCLUDED_PROTOCOLS_1INCH = NETWORK_CONSTANTS[this.chainId].EXCLUDED_PROTOCOLS_1INCH;
        this.setContract(this.constants.ALIASES.crv, ERC20ABI);
        this.setContract(this.constants.ALIASES.crvUSD, ERC20ABI);
        this.setContract(this.constants.ALIASES.st_crvUSD, ERC4626ABI);

        this.multicallProvider = new MulticallProvider(this.chainId, this.provider);

        if (this.signer) {
            try {
                this.signerAddress = await this.signer.getAddress();
            } catch {
                this.signer = null;
            }
        } else {
            this.signerAddress = '';
        }

        this.feeData = { gasPrice: options.gasPrice, maxFeePerGas: options.maxFeePerGas, maxPriorityFeePerGas: options.maxPriorityFeePerGas };
        // oneWayMarkets contracts
        this.setContract(this.constants.ALIASES['one_way_factory'], OneWayLendingFactoryABI);
        if(this.constants.ALIASES['one_way_factory_v2'] && this.constants.ALIASES['one_way_factory_v2'] !== this.constants.ZERO_ADDRESS) {
            this.setContract(this.constants.ALIASES['one_way_factory_v2'], OneWayLendingFactoryV2ABI);
        }
        this.setContract(this.constants.ALIASES['gauge_controller'], GaugeControllerABI);
        this.setContract(this.constants.ALIASES['leverage_zap_deprecated'], LeverageZapABI);
        this.setContract(this.constants.ALIASES['leverage_zap_v2'], LeverageZapABI);
        this.setContract(this.constants.ALIASES['leverage_zap_v2_llv2'], LeverageZapABI);

        if (this.chainId === 1) {
            this.setContract(this.constants.ALIASES.minter, MinterABI);
            this.setContract(this.constants.ALIASES.gauge_factory, GaugeFactoryMainnetABI);
        } else {
            if(this.constants.ALIASES.gauge_factory_old && this.constants.ALIASES.gauge_factory_old !== this.constants.ZERO_ADDRESS) {
                // set old gauge factory
                this.constants.ALIASES.minter_old = this.constants.ALIASES.gauge_factory_old;
                this.setContract(this.constants.ALIASES.gauge_factory_old, GaugeFactorySidechainABI);

                // set new gauge factory
                this.constants.ALIASES.minter = this.constants.ALIASES.gauge_factory;
                this.setContract(this.constants.ALIASES.gauge_factory, GaugeFactorySidechainABI);
            } else {
                this.constants.ALIASES.minter = this.constants.ALIASES.gauge_factory;
                this.setContract(this.constants.ALIASES.gauge_factory, GaugeFactorySidechainABI);
            }
        }


        this.constants.DECIMALS = {
            [this.crvUsdAddress]: 18,
            [this.constants.ALIASES.crv]: 18,
            [this.constants.ALIASES.crvUSD]: 18,
            [this.constants.ALIASES.st_crvUSD]: 18,
        }

        if(L2Networks.includes(this.chainId)) {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const lendingInstance = this;
            lendingInstance.setContract(lendingInstance.constants.ALIASES.gas_oracle, gasOracleABI);
            lendingInstance.setContract(lendingInstance.constants.ALIASES.gas_oracle_blob, gasOracleBlobABI);

            if('originalEstimate' in AbstractProvider.prototype) {
                AbstractProvider.prototype.estimateGas = AbstractProvider.prototype.originalEstimate as (_tx: TransactionRequest) => Promise<bigint>;
            }

            const originalEstimate = AbstractProvider.prototype.estimateGas;

            const oldEstimate = async function(this: any, arg: any) {
                const originalEstimateFunc = originalEstimate.bind(this);
                return await originalEstimateFunc(arg);
            }

            //Override
            const newEstimate = async function(this: any, arg: any) {
                const L2EstimateGas = originalEstimate.bind(this);
                const L1GasUsed = await lendingInstance.contracts[lendingInstance.constants.ALIASES.gas_oracle_blob].contract.getL1GasUsed(arg.data);
                const L1Fee = await lendingInstance.contracts[lendingInstance.constants.ALIASES.gas_oracle_blob].contract.getL1Fee(arg.data);
                lendingInstance.L1WeightedGasPrice = Number(L1Fee)/Number(L1GasUsed);
                const L2GasUsed = await L2EstimateGas(arg);
                return [L2GasUsed,L1GasUsed];
            }

            AbstractProvider.prototype.estimateGas = newEstimate as any;
            (AbstractProvider.prototype as any).originalEstimate = oldEstimate;
        } else {
            if('originalEstimate' in AbstractProvider.prototype) {
                AbstractProvider.prototype.estimateGas = AbstractProvider.prototype.originalEstimate as (_tx: TransactionRequest) => Promise<bigint>;
            }
        }

    }

    initContract = memoizedContract()
    initMulticallContract = memoizedMulticallContract()

    setContract(address: string | undefined, abi: any): void {
        if (address === this.constants.ZERO_ADDRESS || address === undefined) return;

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const llamalendInstance = this;

        const proxyHandler: ProxyHandler<any> = {
            get: function(target: any, name: string) {
                if(name === 'contract') {
                    return llamalendInstance.initContract(target['address'], target['abi'], llamalendInstance.signer || llamalendInstance.provider)
                } else if(name === 'multicallContract') {
                    return llamalendInstance.initMulticallContract(target['address'], target['abi'])
                } else {
                    return target[name];
                }
            },
        }

        const coreContract = {
            address,
            abi,
        }

        this.contracts[address] = new Proxy(coreContract, proxyHandler)
    }

    setCustomFeeData(customFeeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number }): void {
        this.feeData = { ...this.feeData, ...customFeeData };
    }

    async _setupMintMarketContracts(useApi = true): Promise<void> {
        this.setContract(this.crvUsdAddress, ERC20ABI);
        if (this.chainId !== 1) return;

        this.setContract(this.constants.COINS.crvusd.toLowerCase(), ERC20ABI);

        const llammas = Object.values(this.constants.LLAMMAS);
        for (const llamma of llammas) {
            this.setContract(llamma.amm_address, llammaABI);
            this.setContract(llamma.controller_address, controllerABI);
        }

        if (useApi) {
            const apiData = await _getCrvUsdMarketsData();
            const monetaryPolicyMap = new Map(
                apiData.map((m) => [m.address.toLowerCase(), m.monetary_policy_address.toLowerCase()])
            );
            for (const llamma of llammas) {
                const fresh = monetaryPolicyMap.get(llamma.controller_address);
                if (fresh) llamma.monetary_policy_address = fresh;
            }
        } else {
            const monetaryPolicies = (await this.multicallProvider.all(
                llammas.map((l) => this.contracts[l.controller_address].multicallContract.monetary_policy())
            ) as string[]).map((a) => a.toLowerCase());
            llammas.forEach((llamma, i) => { llamma.monetary_policy_address = monetaryPolicies[i]; });
        }

        for (const llamma of llammas) {
            this.setContract(llamma.monetary_policy_address, resolveMonetaryPolicyAbi(llamma.monetary_policy_address));
            if (llamma.collateral_address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
                this.setContract(this.constants.WETH, ERC20ABI);
            } else {
                this.setContract(llamma.collateral_address, ERC20ABI);
            }
            this.setContract(llamma.leverage_zap, LeverageZapCrvUSDABI);
            this.setContract(llamma.deleverage_zap, DeleverageZapABI);
            if (llamma.health_calculator_zap) this.setContract(llamma.health_calculator_zap, HealthCalculatorZapABI);
        }

        for (const pegKeeper of this.constants.PEG_KEEPERS) {
            this.setContract(pegKeeper, PegKeeper);
        }
    }

    getLendMarketList = () => Object.keys({...this.constants.ONE_WAY_MARKETS, ...this.constants.ONE_WAY_MARKETS_V2});

    getMintMarketList = () => Object.keys(this.constants.LLAMMAS);

    fetchLendMarkets = async ({ useApi = true, version = 'v1' }: { useApi?: boolean, version?: 'v1' | 'v2' } = {}) => {
        if(useApi) {
            await fetchOneWayMarketsByAPI(this, version)
        } else {
            await fetchOneWayMarketsByBlockchain(this, version)
        }
    }

    fetchMintMarkets = async ({ useApi = true }: { useApi?: boolean } = {}): Promise<void> => {
        await Promise.all([
            this._setupMintMarketContracts(useApi),
            useApi ? fetchMintMarketsByAPI(this) : fetchMintMarketsByBlockchain(this),
        ]);
    }

    getCoins = async (collateral_tokens: string[], borrowed_tokens: string[], useApi = false): Promise<IDict<ICoin>> => {
        const coins = new Set([...collateral_tokens, ...borrowed_tokens]);
        const COINS_DATA: IDict<ICoin> = {};

        if (useApi) {
            const apiData = (await _getMarketsData(this.constants.NETWORK_NAME)).lendingVaultData;
            apiData.forEach((market) => {
                const borrowedCoin = market.assets.borrowed;
                const collateralCoin = market.assets.collateral;

                if (coins.has(borrowedCoin.address)) {
                    this.setContract(borrowedCoin.address, ERC20ABI);
                    COINS_DATA[borrowedCoin.address] = {
                        address: borrowedCoin.address,
                        decimals: borrowedCoin.decimals,
                        name: borrowedCoin.symbol,
                        symbol: borrowedCoin.symbol,
                    };
                }

                if (coins.has(collateralCoin.address)) {
                    this.setContract(collateralCoin.address, ERC20ABI);
                    COINS_DATA[collateralCoin.address] = {
                        address: collateralCoin.address,
                        decimals: collateralCoin.decimals,
                        name: collateralCoin.symbol,
                        symbol: collateralCoin.symbol,
                    };
                }
            });
        } else {
            const calls: Call[] = [];
            const callsMap = ['name', 'decimals', 'symbol'];

            coins.forEach((coin: string) => {
                this.setContract(coin, ERC20ABI);
                callsMap.forEach((item) => {
                    calls.push(createCall(this.contracts[coin], item, []));
                });
            });

            const res = await this.multicallProvider.all(calls);
            const { name, decimals, symbol } = handleMultiCallResponse(callsMap, res);

            Array.from(coins).forEach((coin: string, index: number) => {
                COINS_DATA[coin] = {
                    address: coin,
                    decimals: Number(decimals[index]),
                    name: name[index],
                    symbol: symbol[index],
                };
            });
        }

        return COINS_DATA;
    }

    formatUnits(value: BigNumberish, unit?: string | Numeric): string {
        return ethers.formatUnits(value, unit);
    }

    parseUnits(value: string, unit?: string | Numeric): bigint {
        return ethers.parseUnits(value, unit);
    }

    async updateFeeData(): Promise<void> {
        const feeData = await this.provider.getFeeData();
        if (feeData.maxFeePerGas === null || feeData.maxPriorityFeePerGas === null) {
            delete this.options.maxFeePerGas;
            delete this.options.maxPriorityFeePerGas;

            this.options.gasPrice = this.feeData.gasPrice !== undefined ?
                this.parseUnits(this.feeData.gasPrice.toString(), "gwei") :
                (feeData.gasPrice || this.parseUnits("20", "gwei"));
        } else {
            delete this.options.gasPrice;

            this.options.maxFeePerGas = this.feeData.maxFeePerGas !== undefined ?
                this.parseUnits(this.feeData.maxFeePerGas.toString(), "gwei") :
                feeData.maxFeePerGas;
            this.options.maxPriorityFeePerGas = this.feeData.maxPriorityFeePerGas !== undefined ?
                this.parseUnits(this.feeData.maxPriorityFeePerGas.toString(), "gwei") :
                feeData.maxPriorityFeePerGas;
        }
    }
}

export { Llamalend };
