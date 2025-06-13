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
import type { Llamalend } from "./llamalend.js";
import { TAmount, TGas } from "./interfaces.js";

// ---------------- UTILS ----------------

export async function convertToShares(this: Llamalend, assets: TAmount): Promise<string> {
    const _assets = parseUnits(assets);
    const _shares = await this.contracts[this.constants.ALIASES.st_crvUSD].contract.convertToShares(_assets);

    return this.formatUnits(_shares);
}

export async function convertToAssets(this: Llamalend, shares: TAmount): Promise<string> {
    const _shares = parseUnits(shares);
    const _assets = await this.contracts[this.constants.ALIASES.st_crvUSD].contract.convertToAssets(_shares);

    return this.formatUnits(_assets);
}

// ---------------- BALANCES ----------------

export async function userBalances(this: Llamalend, address = ""): Promise<{ "crvUSD": string, "st_crvUSD": string }> {
    address = address || this.signerAddress;
    const rawBalances = await getBalances.call(this, [this.constants.ALIASES.crvUSD, this.constants.ALIASES.st_crvUSD], address);
    return {
        "crvUSD": rawBalances[0],
        "st_crvUSD": rawBalances[1],
    }
}

export async function totalSupplyAndCrvUSDLocked(this: Llamalend): Promise<{ "crvUSD": string, "st_crvUSD": string }> {
    const contract = this.contracts[this.constants.ALIASES.st_crvUSD].contract;
    const _totalSupply = await contract.totalSupply();
    const _crvUSDLocked = await contract.convertToAssets(_totalSupply)
    return {
        "crvUSD": this.formatUnits(_crvUSDLocked),
        "st_crvUSD": this.formatUnits(_totalSupply),
    }
}

// ---------------- DEPOSIT ----------------

export async function maxDeposit(this: Llamalend, address = ""): Promise<string> {
    address = _getAddress.call(this, address);
    const _assets = await this.contracts[this.constants.ALIASES.crvUSD].contract.balanceOf(address);

    return formatUnits(_assets);
}

export async function previewDeposit(this: Llamalend, assets: TAmount): Promise<string> {
    const _assets = parseUnits(assets);
    const _shares = await this.contracts[this.constants.ALIASES.st_crvUSD].contract.previewDeposit(_assets);

    return this.formatUnits(_shares);
}

export async function depositIsApproved(this: Llamalend, assets: TAmount): Promise<boolean> {
    return await hasAllowance.call(this, [this.constants.ALIASES.crvUSD], [assets], this.signerAddress, this.constants.ALIASES.st_crvUSD);
}

export async function depositAllowance(this: Llamalend): Promise<string[]> {
    return await getAllowance.call(this, [this.constants.ALIASES.crvUSD], this.signerAddress, this.constants.ALIASES.st_crvUSD);
}

export async function depositApproveEstimateGas(this: Llamalend, assets: TAmount): Promise<TGas> {
    return await ensureAllowanceEstimateGas.call(this, [this.constants.ALIASES.crvUSD], [assets], this.constants.ALIASES.st_crvUSD);
}

export async function depositApprove(this: Llamalend, assets: TAmount, isMax = true): Promise<string[]> {
    return await ensureAllowance.call(this, [this.constants.ALIASES.crvUSD], [assets], this.constants.ALIASES.st_crvUSD, isMax);
}

async function _deposit(this: Llamalend, assets: TAmount, estimateGas = false): Promise<string | TGas> {
    const _assets = parseUnits(assets);
    const contract = this.contracts[this.constants.ALIASES.st_crvUSD].contract;
    const gas = await contract.deposit.estimateGas(_assets, this.signerAddress, { ...this.constantOptions });
    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();

    const gasLimit = _mulBy1_3(DIGas(gas));

    return (await contract.deposit(_assets, this.signerAddress, { ...this.options, gasLimit })).hash;
}

export async function depositEstimateGas(this: Llamalend, assets: TAmount): Promise<TGas> {
    if (!(await depositIsApproved.call(this, assets))) throw Error("Approval is needed for gas estimation");
    return await _deposit.call(this, assets, true) as number;
}

export async function deposit(this: Llamalend, assets: TAmount): Promise<string> {
    await depositApprove.call(this, assets);
    return await _deposit.call(this, assets, false) as string;
}

// ---------------- MINT ----------------

export async function maxMint(this: Llamalend, address = ""): Promise<string> {
    address = _getAddress.call(this, address);
    const _assetBalance = await this.contracts[this.constants.ALIASES.crvUSD].contract.balanceOf(address);
    const _shares = await this.contracts[this.constants.ALIASES.st_crvUSD].contract.convertToShares(_assetBalance);

    return formatUnits(_shares);
}

export async function previewMint(this: Llamalend, shares: TAmount): Promise<string> {
    const _shares = parseUnits(shares);
    const _assets = await this.contracts[this.constants.ALIASES.st_crvUSD].contract.previewMint(_shares);

    return formatUnits(_assets);
}

export async function mintIsApproved(this: Llamalend, shares: TAmount): Promise<boolean> {
    const assets = await previewMint.call(this, shares);
    return await hasAllowance.call(this, [this.constants.ALIASES.crvUSD], [assets], this.signerAddress, this.constants.ALIASES.st_crvUSD);
}

export async function mintAllowance(this: Llamalend): Promise<string[]> {
    const assets = await getAllowance.call(this, [this.constants.ALIASES.crvUSD], this.signerAddress, this.constants.ALIASES.st_crvUSD);
    try {
        return [await convertToShares.call(this, assets[0])]
    } catch (e) {
        if (parseUnits(assets[0]) === MAX_ALLOWANCE) return [this.formatUnits(MAX_ALLOWANCE)];
        throw e;
    }
}

export async function mintApproveEstimateGas(this: Llamalend, shares: TAmount): Promise<TGas> {
    const assets = await previewMint.call(this, shares);
    return await ensureAllowanceEstimateGas.call(this, [this.constants.ALIASES.crvUSD], [assets], this.constants.ALIASES.st_crvUSD);
}

export async function mintApprove(this: Llamalend, shares: TAmount, isMax = true): Promise<string[]> {
    const assets = await previewMint.call(this, shares);
    return await ensureAllowance.call(this, [this.constants.ALIASES.crvUSD], [assets], this.constants.ALIASES.st_crvUSD, isMax);
}

async function _mint(this: Llamalend, shares: TAmount, estimateGas = false): Promise<string | TGas> {
    const _shares = parseUnits(shares);
    const contract = this.contracts[this.constants.ALIASES.st_crvUSD].contract;
    const gas = await contract.mint.estimateGas(_shares, this.signerAddress, { ...this.constantOptions });
    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();

    const gasLimit = _mulBy1_3(DIGas(gas));

    return (await contract.mint(_shares, this.signerAddress, { ...this.options, gasLimit })).hash;
}

export async function mintEstimateGas(this: Llamalend, shares: TAmount): Promise<TGas> {
    if (!(await mintIsApproved.call(this, shares))) throw Error("Approval is needed for gas estimation");
    return await _mint.call(this, shares, true) as number;
}

export async function mint(this: Llamalend, shares: TAmount): Promise<string> {
    await mintApprove.call(this, shares);
    return await _mint.call(this, shares, false) as string;
}

// ---------------- WITHDRAW ----------------

export async function maxWithdraw(this: Llamalend, address = ""): Promise<string> {
    address = _getAddress.call(this, address);
    const _assets = await this.contracts[this.constants.ALIASES.st_crvUSD].contract.maxWithdraw(address);

    return formatUnits(_assets);
}

export async function previewWithdraw(this: Llamalend, assets: TAmount): Promise<string> {
    const _assets = parseUnits(assets);
    const _shares = await this.contracts[this.constants.ALIASES.st_crvUSD].contract.previewWithdraw(_assets);

    return formatUnits(_shares);
}

async function _withdraw(this: Llamalend, assets: TAmount, estimateGas = false): Promise<string | TGas> {
    const _assets = parseUnits(assets);
    const contract = this.contracts[this.constants.ALIASES.st_crvUSD].contract;
    const gas = await contract.withdraw.estimateGas(_assets, this.signerAddress, this.signerAddress, { ...this.constantOptions });
    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();

    const gasLimit = _mulBy1_3(DIGas(gas));

    return (await contract.withdraw(_assets, this.signerAddress, this.signerAddress, { ...this.options, gasLimit })).hash;
}

export async function withdrawEstimateGas(this: Llamalend, assets: TAmount): Promise<TGas> {
    return await _withdraw.call(this, assets, true) as number;
}

export async function withdraw(this: Llamalend, assets: TAmount): Promise<string> {
    return await _withdraw.call(this, assets, false) as string;
}

// ---------------- REDEEM ----------------

export async function maxRedeem(this: Llamalend, address = ""): Promise<string> {
    address = _getAddress.call(this, address);
    const _shares = await this.contracts[this.constants.ALIASES.st_crvUSD].contract.maxRedeem(address)

    return formatUnits(_shares);
}

export async function previewRedeem(this: Llamalend, shares: TAmount): Promise<string> {
    const _shares = parseUnits(shares, 18);
    const _assets = await this.contracts[this.constants.ALIASES.st_crvUSD].contract.previewRedeem(_shares);

    return formatUnits(_assets);
}

async function _redeem(this: Llamalend, shares: TAmount, estimateGas = false): Promise<string | TGas> {
    const _shares = parseUnits(shares, 18);
    const contract = this.contracts[this.constants.ALIASES.st_crvUSD].contract;
    const gas = await contract.redeem.estimateGas(_shares, this.signerAddress, this.signerAddress, { ...this.constantOptions });
    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();

    const gasLimit = _mulBy1_3(DIGas(gas));

    return (await contract.redeem(_shares, this.signerAddress, this.signerAddress, { ...this.options, gasLimit })).hash;
}

export async function redeemEstimateGas(this: Llamalend, shares: TAmount): Promise<TGas> {
    return await _redeem.call(this, shares, true) as number;
}

export async function redeem(this: Llamalend, shares: TAmount): Promise<string> {
    return await _redeem.call(this, shares, false) as string;
}
