import {
    _getAddress, _mulBy1_3, DIGas,
    ensureAllowance,
    ensureAllowanceEstimateGas,
    formatUnits,
    hasAllowance,
    getAllowance,
    parseUnits,
    smartNumber,
    getBalances,
    MAX_ALLOWANCE,
} from "./utils.js";
import { llamalend } from "./llamalend.js";
import { TAmount, TGas } from "./interfaces.js";

// ---------------- UTILS ----------------

export const convertToShares = async (assets: TAmount): Promise<string> => {
    const _assets = parseUnits(assets);
    const _shares = await llamalend.contracts[llamalend.constants.ALIASES.st_crvUSD].contract.convertToShares(_assets);

    return llamalend.formatUnits(_shares);
}

export const convertToAssets = async (shares: TAmount): Promise<string> => {
    const _shares = parseUnits(shares);
    const _assets = await llamalend.contracts[llamalend.constants.ALIASES.st_crvUSD].contract.convertToAssets(_shares);

    return llamalend.formatUnits(_assets);
}

// ---------------- BALANCES ----------------

export const userBalances = async (address = llamalend.signerAddress): Promise<{ "crvUSD": string, "st_crvUSD": string }> => {
    const rawBalances = await getBalances([llamalend.constants.ALIASES.crvUSD, llamalend.constants.ALIASES.st_crvUSD], address);
    return {
        "crvUSD": rawBalances[0],
        "st_crvUSD": rawBalances[1],
    }
}

export const totalSupplyAndCrvUSDLocked = async (): Promise<{ "crvUSD": string, "st_crvUSD": string }> => {
    const contract = llamalend.contracts[llamalend.constants.ALIASES.st_crvUSD].contract;
    const _totalSupply = await contract.totalSupply();
    const _crvUSDLocked = await contract.convertToAssets(_totalSupply)
    return {
        "crvUSD": llamalend.formatUnits(_crvUSDLocked),
        "st_crvUSD": llamalend.formatUnits(_totalSupply),
    }
}

// ---------------- DEPOSIT ----------------

export const maxDeposit = async (address = ""): Promise<string> => {
    address = _getAddress(address);
    const _assets = await llamalend.contracts[llamalend.constants.ALIASES.crvUSD].contract.balanceOf(address);

    return formatUnits(_assets);
}

export const previewDeposit = async (assets: TAmount): Promise<string> => {
    const _assets = parseUnits(assets);
    const _shares = await llamalend.contracts[llamalend.constants.ALIASES.st_crvUSD].contract.previewDeposit(_assets);

    return llamalend.formatUnits(_shares);
}

export const depositIsApproved = async(assets: TAmount): Promise<boolean> => {
    return await hasAllowance([llamalend.constants.ALIASES.crvUSD], [assets], llamalend.signerAddress, llamalend.constants.ALIASES.st_crvUSD);
}

export const depositAllowance = async(): Promise<string[]> => {
    return await getAllowance([llamalend.constants.ALIASES.crvUSD], llamalend.signerAddress, llamalend.constants.ALIASES.st_crvUSD);
}

export const depositApproveEstimateGas = async (assets: TAmount): Promise<TGas> => {
    return await ensureAllowanceEstimateGas([llamalend.constants.ALIASES.crvUSD], [assets], llamalend.constants.ALIASES.st_crvUSD);
}

export const depositApprove = async (assets: TAmount, isMax = true): Promise<string[]> => {
    return await ensureAllowance([llamalend.constants.ALIASES.crvUSD], [assets], llamalend.constants.ALIASES.st_crvUSD, isMax);
}

const _deposit = async (assets: TAmount, estimateGas = false): Promise<string | TGas> => {
    const _assets = parseUnits(assets);
    const contract = llamalend.contracts[llamalend.constants.ALIASES.st_crvUSD].contract;
    const gas = await contract.deposit.estimateGas(_assets, llamalend.signerAddress, { ...llamalend.constantOptions });
    if (estimateGas) return smartNumber(gas);

    await llamalend.updateFeeData();

    const gasLimit = _mulBy1_3(DIGas(gas));

    return (await contract.deposit(_assets, llamalend.signerAddress, { ...llamalend.options, gasLimit })).hash;
}

export const depositEstimateGas = async (assets: TAmount): Promise<TGas> => {
    if (!(await depositIsApproved(assets))) throw Error("Approval is needed for gas estimation");
    return await _deposit(assets, true) as number;
}

export const deposit = async (assets: TAmount): Promise<string> => {
    await depositApprove(assets);
    return await _deposit(assets, false) as string;
}

// ---------------- MINT ----------------

export const maxMint = async (address = ""): Promise<string> => {
    address = _getAddress(address);
    const _assetBalance = await llamalend.contracts[llamalend.constants.ALIASES.crvUSD].contract.balanceOf(address);
    const _shares = await llamalend.contracts[llamalend.constants.ALIASES.st_crvUSD].contract.convertToShares(_assetBalance);

    return formatUnits(_shares);
}

export const previewMint = async (shares: TAmount): Promise<string> => {
    const _shares = parseUnits(shares);
    const _assets = await llamalend.contracts[llamalend.constants.ALIASES.st_crvUSD].contract.previewMint(_shares);

    return formatUnits(_assets);
}

export const mintIsApproved = async (shares: TAmount): Promise<boolean> => {
    const assets = await previewMint(shares);
    return await hasAllowance([llamalend.constants.ALIASES.crvUSD], [assets], llamalend.signerAddress, llamalend.constants.ALIASES.st_crvUSD);
}

export const mintAllowance = async (): Promise<string[]> => {
    const assets = await getAllowance([llamalend.constants.ALIASES.crvUSD], llamalend.signerAddress, llamalend.constants.ALIASES.st_crvUSD);
    try {
        return [await convertToShares(assets[0])]
    } catch (e) {
        if (parseUnits(assets[0]) === MAX_ALLOWANCE) return [llamalend.formatUnits(MAX_ALLOWANCE)];
        throw e;
    }
}

export const mintApproveEstimateGas = async (shares: TAmount): Promise<TGas> => {
    const assets = await previewMint(shares);
    return await ensureAllowanceEstimateGas([llamalend.constants.ALIASES.crvUSD], [assets], llamalend.constants.ALIASES.st_crvUSD);
}

export const mintApprove = async (shares: TAmount, isMax = true): Promise<string[]> => {
    const assets = await previewMint(shares);
    return await ensureAllowance([llamalend.constants.ALIASES.crvUSD], [assets], llamalend.constants.ALIASES.st_crvUSD, isMax);
}

const _mint = async (shares: TAmount, estimateGas = false): Promise<string | TGas> => {
    const _shares = parseUnits(shares);
    const contract = llamalend.contracts[llamalend.constants.ALIASES.st_crvUSD].contract;
    const gas = await contract.mint.estimateGas(_shares, llamalend.signerAddress, { ...llamalend.constantOptions });
    if (estimateGas) return smartNumber(gas);

    await llamalend.updateFeeData();

    const gasLimit = _mulBy1_3(DIGas(gas));

    return (await contract.mint(_shares, llamalend.signerAddress, { ...llamalend.options, gasLimit })).hash;
}

export const mintEstimateGas = async (shares: TAmount): Promise<TGas> => {
    if (!(await mintIsApproved(shares))) throw Error("Approval is needed for gas estimation");
    return await _mint(shares, true) as number;
}

export const mint = async (shares: TAmount): Promise<string> => {
    await mintApprove(shares);
    return await _mint(shares, false) as string;
}

// ---------------- WITHDRAW ----------------

export const maxWithdraw = async (address = ""): Promise<string> => {
    address = _getAddress(address);
    const _assets = await llamalend.contracts[llamalend.constants.ALIASES.st_crvUSD].contract.maxWithdraw(address);

    return formatUnits(_assets);
}

export const previewWithdraw = async (assets: TAmount): Promise<string> => {
    const _assets = parseUnits(assets);
    const _shares = await llamalend.contracts[llamalend.constants.ALIASES.st_crvUSD].contract.previewWithdraw(_assets);

    return formatUnits(_shares);
}

const _withdraw = async (assets: TAmount, estimateGas = false): Promise<string | TGas> => {
    const _assets = parseUnits(assets);
    const contract = llamalend.contracts[llamalend.constants.ALIASES.st_crvUSD].contract;
    const gas = await contract.withdraw.estimateGas(_assets, llamalend.signerAddress, llamalend.signerAddress, { ...llamalend.constantOptions });
    if (estimateGas) return smartNumber(gas);

    await llamalend.updateFeeData();

    const gasLimit = _mulBy1_3(DIGas(gas));

    return (await contract.withdraw(_assets, llamalend.signerAddress, llamalend.signerAddress, { ...llamalend.options, gasLimit })).hash;
}

export const withdrawEstimateGas = async (assets: TAmount): Promise<TGas> => {
    return await _withdraw(assets, true) as number;
}

export const withdraw = async (assets: TAmount): Promise<string> => {
    return await _withdraw(assets, false) as string;
}

// ---------------- REDEEM ----------------

export const maxRedeem = async (address = ""): Promise<string> => {
    address = _getAddress(address);
    const _shares = await llamalend.contracts[llamalend.constants.ALIASES.st_crvUSD].contract.maxRedeem(address)

    return formatUnits(_shares);
}

export const previewRedeem = async (shares: TAmount): Promise<string> => {
    const _shares = parseUnits(shares, 18);
    const _assets = await llamalend.contracts[llamalend.constants.ALIASES.st_crvUSD].contract.previewRedeem(_shares);

    return formatUnits(_assets);
}

const _redeem = async (shares: TAmount, estimateGas = false): Promise<string | TGas> => {
    const _shares = parseUnits(shares, 18);
    const contract = llamalend.contracts[llamalend.constants.ALIASES.st_crvUSD].contract;
    const gas = await contract.redeem.estimateGas(_shares, llamalend.signerAddress, llamalend.signerAddress, { ...llamalend.constantOptions });
    if (estimateGas) return smartNumber(gas);

    await llamalend.updateFeeData();

    const gasLimit = _mulBy1_3(DIGas(gas));

    return (await contract.redeem(_shares, llamalend.signerAddress, llamalend.signerAddress, { ...llamalend.options, gasLimit })).hash;
}

export const redeemEstimateGas = async (shares: TAmount): Promise<TGas> => {
    return await _redeem(shares, true) as number;
}

export const redeem = async (shares: TAmount): Promise<string> => {
    return await _redeem(shares, false) as string;
}
