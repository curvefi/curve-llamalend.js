import { IDict, ILlamma } from "../interfaces";
import MonetaryPolicyABI from '../constants/abis/crvUSD/MonetaryPolicy.json' assert { type: 'json'};
import MonetaryPolicy2ABI from '../constants/abis/crvUSD/MonetaryPolicy2.json' assert { type: 'json'};
import { lowerCaseLlammasAddresses } from "./utils";


export const LLAMMAS: IDict<ILlamma> = lowerCaseLlammasAddresses({
    sfrxeth: {
        amm_address: '0x136e783846ef68C8Bd00a3369F787dF8d683a696',
        controller_address: '0x8472A9A7632b173c8Cf3a86D3afec50c35548e76',
        monetary_policy_address: '0xc684432FD6322c6D58b6bC5d28B18569aA0AD0A1',
        collateral_address: '0xac3E018457B222d93114458476f3E3416Abbe38F',
        leverage_zap: '0xb556FA4C4752321B3154f08DfBDFCF34847f2eac',
        deleverage_zap: '0xF113929F69FAbE165A2280CaC00c5f77196Aa34C',
        collateral_symbol: 'sfrxETH',
        collateral_decimals: 18,
        min_bands: 4,
        max_bands: 50,
        default_bands: 10,
        A: 100,
        monetary_policy_abi: MonetaryPolicyABI,
    },
    wsteth: {
        amm_address: '0x37417b2238aa52d0dd2d6252d989e728e8f706e4',
        controller_address: '0x100daa78fc509db39ef7d04de0c1abd299f4c6ce',
        monetary_policy_address: '0x1E7d3bf98d3f8D8CE193236c3e0eC4b00e32DaaE',
        collateral_address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
        leverage_zap: '0x293436d4e4a15FBc6cCC400c14a01735E5FC74fd',
        deleverage_zap: '0x600E571106C31c4Ca1bF4177bA808E37146A4A0C',
        collateral_symbol: 'wstETH',
        collateral_decimals: 18,
        min_bands: 4,
        max_bands: 50,
        default_bands: 10,
        A: 100,
        monetary_policy_abi: MonetaryPolicy2ABI,
    },
    wbtc: {
        amm_address: '0xe0438eb3703bf871e31ce639bd351109c88666ea',
        controller_address: '0x4e59541306910ad6dc1dac0ac9dfb29bd9f15c67',
        monetary_policy_address: '0x1E7d3bf98d3f8D8CE193236c3e0eC4b00e32DaaE',
        collateral_address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        leverage_zap: '0xA2518b71ee64E910741f5Cf480b19E8e402de4d7',
        deleverage_zap: '0xb911D7e59BA82FDF477a2Ab22Ff25125072C9282',
        health_calculator_zap: "0xCF61Ee62b136e3553fB545bd8fEc11fb7f830d6A",
        collateral_symbol: 'WBTC',
        collateral_decimals: 8,
        min_bands: 4,
        max_bands: 50,
        default_bands: 10,
        A: 100,
        monetary_policy_abi: MonetaryPolicy2ABI,
    },
    eth: {
        amm_address: '0x1681195c176239ac5e72d9aebacf5b2492e0c4ee',
        controller_address: '0xa920de414ea4ab66b97da1bfe9e6eca7d4219635',
        monetary_policy_address: '0x1E7d3bf98d3f8D8CE193236c3e0eC4b00e32DaaE',
        collateral_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        leverage_zap: '0xd3e576B5DcDe3580420A5Ef78F3639BA9cd1B967',
        deleverage_zap: '0x9bE82CdDB5c266E010C97e4B1B5B2DF53C16384d',
        collateral_symbol: 'ETH',
        collateral_decimals: 18,
        min_bands: 4,
        max_bands: 50,
        default_bands: 10,
        A: 100,
        monetary_policy_abi: MonetaryPolicy2ABI,
    },
    sfrxeth2: {
        amm_address: '0xfa96ad0a9e64261db86950e2da362f5572c5c6fd',
        controller_address: '0xec0820efafc41d8943ee8de495fc9ba8495b15cf',
        monetary_policy_address: '0x1e7d3bf98d3f8d8ce193236c3e0ec4b00e32daae',
        collateral_address: '0xac3e018457b222d93114458476f3e3416abbe38f',
        leverage_zap: '0x43eCFfe6c6C1b9F24AeB5C180E659c2a6FCe11Bc',
        deleverage_zap: '0x2bc706B83aB08d0437b8A397242C3284B5f81D74',
        collateral_symbol: 'sfrxETH',
        collateral_decimals: 18,
        min_bands: 4,
        max_bands: 50,
        default_bands: 10,
        A: 100,
        monetary_policy_abi: MonetaryPolicy2ABI,
    },
    tbtc: {
        amm_address: '0xf9bd9da2427a50908c4c6d1599d8e62837c2bcb0',
        controller_address: '0x1c91da0223c763d2e0173243eadaa0a2ea47e704',
        monetary_policy_address: '0xb8687d7dc9d8fa32fabde63e19b2dbc9bb8b2138',
        collateral_address: '0x18084fba666a33d37592fa2633fd49a74dd93a88',
        leverage_zap: '0xD79964C70Cb06224FdA4c48387B53E9819bcB71c',
        deleverage_zap: '0xAA25a6Fa9e4dADaE0d3EE59bEA19fbcf0284830C',
        collateral_symbol: 'tBTC',
        collateral_decimals: 18,
        min_bands: 4,
        max_bands: 50,
        default_bands: 10,
        A: 100,
        monetary_policy_abi: MonetaryPolicy2ABI,
    },
});
