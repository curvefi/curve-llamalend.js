import { lowerCaseValues } from "./utils.js";


export const ALIASES_ETHEREUM = lowerCaseValues({
    "crv": "0xD533a949740bb3306d119CC777fa900bA034cd52",
    "one_way_factory": "0xeA6876DDE9e3467564acBeE1Ed5bac88783205E0",
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "minter": '0xd061D61a4d941c39E5453435B6345Dc261C2fcE0',
    "gauge_factory": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    // "leverage_zap": "0x3294514B78Df4Bb90132567fcf8E5e99f390B687", // 1inch
    "leverage_zap": "0xC8E8430dc7Cb23C32543329acCC68c9055C23e18", // odos v3
    "leverage_zap_v2": "0x0000000000000000000000000000000000000000",
    "leverage_markets_start_id": "9",
    "crvUSD": "0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E",
    "st_crvUSD": "0x0655977FEb2f289A4aB78af67BAB0d17aAb84367",
});

export const ALIASES_ARBITRUM = lowerCaseValues({
    "crv": "0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978",
    "one_way_factory": "0xcaEC110C784c9DF37240a8Ce096D352A75922DeA",
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "gauge_factory": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    // "leverage_zap": "0x61C404B60ee9c5fB09F70F9A645DD38fE5b3A956", // 1inch
    "leverage_zap": "0xFE02553d3Ba4c3f39F36a4632F91404DF94b9AE2", // odos v3
    "leverage_zap_v2": "0x5b07Db9a85992c877b9fBeA6DCC4F79292577640",
    "leverage_markets_start_id": "9",
});

export const ALIASES_OPTIMISM = lowerCaseValues({
    "crv": "0x0994206dfE8De6Ec6920FF4D779B0d950605Fb53",
    "one_way_factory": "0x5EA8f3D674C70b020586933A0a5b250734798BeF",
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "gauge_factory_old": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "gauge_factory": "0x871fBD4E01012e2E8457346059e8C189d664DbA4",
    "leverage_zap": "0xBFab8ebc836E1c4D81837798FC076D219C9a1855", // odos v3
    "leverage_zap_v2": "0x0000000000000000000000000000000000000000",
    "leverage_markets_start_id": "0",
    "gas_oracle": '0xc0d3C0d3C0d3c0D3C0D3C0d3C0d3C0D3C0D3000f',
    "gas_oracle_blob": '0x420000000000000000000000000000000000000f',
});

export const ALIASES_FRAXTAL = lowerCaseValues({
    "crv": "0x331B9182088e2A7d6D3Fe4742AbA1fB231aEcc56",
    "one_way_factory": "0xf3c9bdAB17B7016fBE3B77D17b1602A7db93ac66",
    "gauge_controller": "0x0000000000000000000000000000000000000000", // <--- TODO CHANGE
    "gauge_factory_old": "0xeF672bD94913CB6f1d2812a6e18c1fFdEd8eFf5c",
    "gauge_factory": "0x0b8d6b6cefc7aa1c2852442e518443b1b22e1c52",
    "leverage_zap": "0x3294514B78Df4Bb90132567fcf8E5e99f390B687", // odos v3
    "leverage_zap_v2": "0x0000000000000000000000000000000000000000",
    "leverage_markets_start_id": "0",
});

export const ALIASES_SONIC = lowerCaseValues({
    "crv": "0x5Af79133999f7908953E94b7A5CF367740Ebee35",
    "one_way_factory": "0x30d1859dad5a52ae03b6e259d1b48c4b12933993",
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "gauge_factory": "0xf3A431008396df8A8b2DF492C913706BDB0874ef",
    "leverage_zap": "0x0fE38dCC905eC14F6099a83Ac5C93BF2601300CF", // odos v3
    "leverage_zap_v2": "0x0000000000000000000000000000000000000000",
    "leverage_markets_start_id": "0",
});