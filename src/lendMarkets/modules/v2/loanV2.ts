import { LoanBaseModule } from "../common/loanBase.js";
import { ILoanV2 } from "../../interfaces/v2";
import {_getAddress, formatUnits, parseUnits} from "../../../utils";

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

    public async repayHealth(debt: number | string, shrink = false, full = true, address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _debt = parseUnits(debt);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _health = await contract.repay_health_preview(0, _debt, address, address, shrink, full, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }
}
