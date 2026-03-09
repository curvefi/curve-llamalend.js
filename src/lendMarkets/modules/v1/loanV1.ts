import { LoanBaseModule } from "../common/loanBase.js";
import { ILoanV1 } from "../../interfaces/v1/loanV1";
import {_getAddress, formatUnits, parseUnits} from "../../../utils";

export class LoanV1Module extends LoanBaseModule implements ILoanV1 {
    public async repayHealth(debt: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _debt = parseUnits(debt) * BigInt(-1);

        const contract = this.llamalend.contracts[this.market.addresses.controller].contract;
        const _health = await contract.health_calculator(address, 0, _debt, full, 0, this.llamalend.constantOptions) as bigint;

        return formatUnits(_health * BigInt(100));
    }
}
