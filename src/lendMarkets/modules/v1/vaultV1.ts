import memoize from "memoizee";
import type { TAmount, TGas, IReward } from "../../../interfaces";
import type { LendMarketTemplate } from "../../LendMarketTemplate";
import {
    _getAddress,
    parseUnits,
    BN,
    toBN,
    ensureAllowance,
    hasAllowance,
    ensureAllowanceEstimateGas,
    formatUnits,
    smartNumber,
    _mulBy1_3,
    _getUsdRate,
    _ensureAllowance,
    DIGas,
} from "../../../utils";
import {Llamalend} from "../../../llamalend";
import BigNumber from "bignumber.js";
import { _getMarketsData } from "../../../external-api";
import ERC20Abi from '../../../constants/abis/ERC20.json' with {type: 'json'};
import {WEEK} from "../../../constants/utils";

export class VaultV1Module {
    private market: LendMarketTemplate;
    private llamalend: Llamalend;

    constructor(market: LendMarketTemplate) {
        this.market = market;
        this.llamalend = market.getLlamalend();
    }

    public async vaultMaxDeposit(address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        // const _amount = await this.llamalend.contracts[this.market.addresses.vault].contract.maxDeposit(address);  TODO use maxDeposit
        const _amount = await this.llamalend.contracts[this.market.addresses.borrowed_token].contract.balanceOf(address);

        return formatUnits(_amount,  this.market.borrowed_token.decimals);
    }

    public async vaultPreviewDeposit(amount: TAmount): Promise<string> {
        const _amount = parseUnits(amount, this.market.borrowed_token.decimals);
        const _shares = await this.llamalend.contracts[this.market.addresses.vault].contract.previewDeposit(_amount);

        return formatUnits(_shares, 18);
    }

    public async vaultDepositIsApproved(borrowed: TAmount): Promise<boolean> {
        return await hasAllowance.call(this.llamalend, [this.market.borrowed_token.address], [borrowed], this.llamalend.signerAddress, this.market.addresses.vault);
    }

    public async vaultDepositApproveEstimateGas (borrowed: TAmount): Promise<TGas> {
        return await ensureAllowanceEstimateGas.call(this.llamalend, [this.market.borrowed_token.address], [borrowed], this.market.addresses.vault);
    }

    public async vaultDepositApprove(borrowed: TAmount): Promise<string[]> {
        return await ensureAllowance.call(this.llamalend, [this.market.borrowed_token.address], [borrowed], this.market.addresses.vault);
    }

    private async _vaultDeposit(amount: TAmount, estimateGas = false): Promise<string | TGas> {
        const _amount = parseUnits(amount, this.market.borrowed_token.decimals);
        const gas = await this.llamalend.contracts[this.market.addresses.vault].contract.deposit.estimateGas(_amount, { ...this.llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();

        const gasLimit = _mulBy1_3(DIGas(gas));

        return (await this.llamalend.contracts[this.market.addresses.vault].contract.deposit(_amount, { ...this.llamalend.options, gasLimit })).hash;
    }

    public async vaultDepositEstimateGas(amount: TAmount): Promise<TGas> {
        if (!(await this.vaultDepositIsApproved(amount))) throw Error("Approval is needed for gas estimation");
        return await this._vaultDeposit(amount, true) as number;
    }

    public async vaultDeposit(amount: TAmount): Promise<string> {
        await this.vaultDepositApprove(amount);
        return await this._vaultDeposit(amount, false) as string;
    }


    public async vaultMaxMint(address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        // const _shares = await this.llamalend.contracts[this.market.addresses.vault].contract.maxMint(address);  TODO use maxMint
        const _assetBalance = await this.llamalend.contracts[this.market.addresses.borrowed_token].contract.balanceOf(address);
        const _shares = await this.llamalend.contracts[this.market.addresses.vault].contract.convertToShares(_assetBalance);

        return formatUnits(_shares, 18);
    }

    public async vaultPreviewMint(amount: TAmount): Promise<string> {
        const _amount = parseUnits(amount, 18);
        const _assets = await this.llamalend.contracts[this.market.addresses.vault].contract.previewMint(_amount);

        return formatUnits(_assets, this.market.borrowed_token.decimals);
    }

    public async vaultMintIsApproved(borrowed: TAmount): Promise<boolean> {
        return await hasAllowance.call(this.llamalend, [this.market.borrowed_token.address], [borrowed], this.llamalend.signerAddress, this.market.addresses.vault);
    }

    public async vaultMintApproveEstimateGas (borrowed: TAmount): Promise<TGas> {
        return await ensureAllowanceEstimateGas.call(this.llamalend, [this.market.borrowed_token.address], [borrowed], this.market.addresses.vault);
    }

    public async vaultMintApprove(borrowed: TAmount): Promise<string[]> {
        return await ensureAllowance.call(this.llamalend, [this.market.borrowed_token.address], [borrowed], this.market.addresses.vault);
    }

    private async _vaultMint(amount: TAmount, estimateGas = false): Promise<string | TGas> {
        const _amount = parseUnits(amount, 18);
        const gas = await this.llamalend.contracts[this.market.addresses.vault].contract.mint.estimateGas(_amount, { ...this.llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();

        const gasLimit = _mulBy1_3(DIGas(gas));

        return (await this.llamalend.contracts[this.market.addresses.vault].contract.mint(_amount, { ...this.llamalend.options, gasLimit })).hash;
    }

    public async vaultMintEstimateGas(amount: TAmount): Promise<TGas> {
        if (!(await this.vaultMintIsApproved(amount))) throw Error("Approval is needed for gas estimation");
        return await this._vaultMint(amount, true) as number;
    }

    public async vaultMint(amount: TAmount): Promise<string> {
        await this.vaultMintApprove(amount);
        return await this._vaultMint(amount, false) as string;
    }


    public async vaultMaxWithdraw(address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _assets = await this.llamalend.contracts[this.market.addresses.vault].contract.maxWithdraw(address);

        return formatUnits(_assets, this.market.borrowed_token.decimals);
    }

    public async vaultPreviewWithdraw(amount: TAmount): Promise<string> {
        const _amount = parseUnits(amount, this.market.borrowed_token.decimals);
        const _shares = await this.llamalend.contracts[this.market.addresses.vault].contract.previewWithdraw(_amount);

        return formatUnits(_shares, 18);
    }

    private async _vaultWithdraw(amount: TAmount, estimateGas = false): Promise<string | TGas> {
        const _amount = parseUnits(amount, this.market.borrowed_token.decimals);
        const gas = await this.llamalend.contracts[this.market.addresses.vault].contract.withdraw.estimateGas(_amount, { ...this.llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();

        const gasLimit = _mulBy1_3(DIGas(gas));

        return (await this.llamalend.contracts[this.market.addresses.vault].contract.withdraw(_amount, { ...this.llamalend.options, gasLimit })).hash;
    }

    public async vaultWithdrawEstimateGas(amount: TAmount): Promise<TGas> {
        return await this._vaultWithdraw(amount, true) as number;
    }

    public async vaultWithdraw(amount: TAmount): Promise<string> {
        return await this._vaultWithdraw(amount, false) as string;
    }


    public async vaultMaxRedeem(address = ""): Promise<string> {
        address = _getAddress.call(this.llamalend, address);
        const _shares = await this.llamalend.contracts[this.market.addresses.vault].contract.maxRedeem(address)

        return formatUnits(_shares, 18);
    }

    public async vaultPreviewRedeem(amount: TAmount): Promise<string> {
        const _amount = parseUnits(amount, 18);
        const _assets = await this.llamalend.contracts[this.market.addresses.vault].contract.previewRedeem(_amount);

        return formatUnits(_assets, this.market.borrowed_token.decimals);
    }

    private async _vaultRedeem(amount: TAmount, estimateGas = false): Promise<string | TGas> {
        const _amount = parseUnits(amount, 18);
        const gas = await this.llamalend.contracts[this.market.addresses.vault].contract.redeem.estimateGas(_amount, { ...this.llamalend.constantOptions });
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();

        const gasLimit = _mulBy1_3(DIGas(gas));

        return (await this.llamalend.contracts[this.market.addresses.vault].contract.redeem(_amount, { ...this.llamalend.options, gasLimit })).hash;
    }

    public async vaultRedeemEstimateGas(amount: TAmount): Promise<TGas> {
        return await this._vaultRedeem(amount, true) as number;
    }

    public async vaultRedeem(amount: TAmount): Promise<string> {
        return await this._vaultRedeem(amount, false) as string;
    }

    // ---------------- VAULT UTILS ----------------

    public async vaultConvertToShares(assets: TAmount): Promise<string> {
        const _assets = parseUnits(assets, this.market.borrowed_token.decimals);
        const _shares = await this.llamalend.contracts[this.market.addresses.vault].contract.convertToShares(_assets);

        return this.llamalend.formatUnits(_shares);
    }

    public async vaultConvertToAssets(shares: TAmount): Promise<string> {
        const _shares = parseUnits(shares);
        const _assets = await this.llamalend.contracts[this.market.addresses.vault].contract.convertToAssets(_shares);

        return this.llamalend.formatUnits(_assets, this.market.borrowed_token.decimals);
    }

    // ---------------- VAULT STAKING ----------------

    public async vaultStakeIsApproved(vaultShares: number | string): Promise<boolean> {
        if (this.market.addresses.gauge === this.llamalend.constants.ZERO_ADDRESS) {
            throw Error(`stakeIsApproved method doesn't exist for pool ${this.market.name} (id: ${this.market.name}). There is no gauge`);
        }
        return await hasAllowance.call(this.llamalend, [this.market.addresses.vault], [vaultShares], this.llamalend.signerAddress, this.market.addresses.gauge);
    }

    public async vaultStakeApproveEstimateGas(vaultShares: number | string): Promise<TGas> {
        if (this.market.addresses.gauge === this.llamalend.constants.ZERO_ADDRESS) {
            throw Error(`stakeApproveEstimateGas method doesn't exist for pool ${this.market.name} (id: ${this.market.name}). There is no gauge`);
        }
        return await ensureAllowanceEstimateGas.call(this.llamalend, [this.market.addresses.vault], [vaultShares], this.market.addresses.gauge);
    }

    public async vaultStakeApprove(vaultShares: number | string): Promise<string[]> {
        if (this.market.addresses.gauge === this.llamalend.constants.ZERO_ADDRESS) {
            throw Error(`stakeApprove method doesn't exist for pool ${this.market.name} (id: ${this.market.name}). There is no gauge`);
        }
        return await ensureAllowance.call(this.llamalend, [this.market.addresses.vault], [vaultShares], this.market.addresses.gauge);
    }

    public async vaultStakeEstimateGas(vaultShares: number | string): Promise<TGas> {
        if (this.market.addresses.gauge === this.llamalend.constants.ZERO_ADDRESS) {
            throw Error(`stakeEstimateGas method doesn't exist for pool ${this.market.name} (id: ${this.market.name}). There is no gauge`);
        }
        const _vaultShares = parseUnits(vaultShares);
        return smartNumber(await this.llamalend.contracts[this.market.addresses.gauge].contract.deposit.estimateGas(_vaultShares, this.llamalend.constantOptions));
    }

    public async vaultStake(vaultShares: number | string): Promise<string> {
        if (this.market.addresses.gauge === this.llamalend.constants.ZERO_ADDRESS) {
            throw Error(`stake method doesn't exist for pool ${this.market.name} (id: ${this.market.name}). There is no gauge`);
        }
        const _vaultShares = parseUnits(vaultShares);
        await _ensureAllowance.call(this.llamalend, [this.market.addresses.vault], [_vaultShares], this.market.addresses.gauge)

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(await this.llamalend.contracts[this.market.addresses.gauge].contract.deposit.estimateGas(_vaultShares, this.llamalend.constantOptions)));
        return (await this.llamalend.contracts[this.market.addresses.gauge].contract.deposit(_vaultShares, { ...this.llamalend.options, gasLimit })).hash;
    }

    public async vaultUnstakeEstimateGas(vaultShares: number | string): Promise<TGas> {
        if (this.market.addresses.gauge === this.llamalend.constants.ZERO_ADDRESS) {
            throw Error(`unstakeEstimateGas method doesn't exist for pool ${this.market.name} (id: ${this.market.name}). There is no gauge`);
        }
        const _vaultShares = parseUnits(vaultShares);
        return smartNumber(await this.llamalend.contracts[this.market.addresses.gauge].contract.withdraw.estimateGas(_vaultShares, this.llamalend.constantOptions));
    }

    public async vaultUnstake(vaultShares: number | string): Promise<string> {
        if (this.market.addresses.gauge === this.llamalend.constants.ZERO_ADDRESS) {
            throw Error(`unstake method doesn't exist for pool ${this.market.name} (id: ${this.market.name}). There is no gauge`);
        }
        const _vaultShares = parseUnits(vaultShares);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas((await this.llamalend.contracts[this.market.addresses.gauge].contract.withdraw.estimateGas(_vaultShares, this.llamalend.constantOptions))));
        return (await this.llamalend.contracts[this.market.addresses.gauge].contract.withdraw(_vaultShares, { ...this.llamalend.options, gasLimit })).hash;
    }

    // ---------------- VAULT STAKING REWARDS ----------------

    public vaultRewardsOnly(): boolean {
        if (this.market.addresses.gauge === this.llamalend.constants.ZERO_ADDRESS) throw Error(`${this.market.name} doesn't have gauge`);
        const gaugeContract = this.llamalend.contracts[this.market.addresses.gauge].contract;

        return !('inflation_rate()' in gaugeContract || 'inflation_rate(uint256)' in gaugeContract);
    }

    public async vaultTotalLiquidity(useAPI = true): Promise<string> {
        const { cap } = await this.statsCapAndAvailable(true, useAPI);
        const price = await _getUsdRate.call(this.llamalend, this.market.addresses.borrowed_token);

        return BN(cap).times(price).toFixed(6)
    }

    private _calcCrvApr = async (futureWorkingSupplyBN: BigNumber | null = null): Promise<[baseApy: number, boostedApy: number]> => {
        const totalLiquidityUSD = await this.vaultTotalLiquidity();
        if (Number(totalLiquidityUSD) === 0) return [0, 0];

        let inflationRateBN, workingSupplyBN, totalSupplyBN;
        if (this.llamalend.chainId !== 1) {
            const gaugeContract = this.llamalend.contracts[this.market.addresses.gauge].multicallContract;
            const lpTokenContract = this.llamalend.contracts[this.market.addresses.vault].multicallContract;
            const crvContract = this.llamalend.contracts[this.llamalend.constants.ALIASES.crv].contract;

            const currentWeek = Math.floor(Date.now() / 1000 / WEEK);
            [inflationRateBN, workingSupplyBN, totalSupplyBN] = (await this.llamalend.multicallProvider.all([
                gaugeContract.inflation_rate(currentWeek),
                gaugeContract.working_supply(),
                lpTokenContract.totalSupply(),
            ]) as bigint[]).map((value) => toBN(value));

            if (inflationRateBN.eq(0)) {
                inflationRateBN = toBN(await crvContract.balanceOf(this.market.addresses.gauge, this.llamalend.constantOptions)).div(WEEK);
            }
        } else {
            const gaugeContract = this.llamalend.contracts[this.market.addresses.gauge].multicallContract;
            const lpTokenContract = this.llamalend.contracts[this.market.addresses.vault].multicallContract;
            const gaugeControllerContract = this.llamalend.contracts[this.llamalend.constants.ALIASES.gauge_controller].multicallContract;

            let weightBN;
            [inflationRateBN, weightBN, workingSupplyBN, totalSupplyBN] = (await this.llamalend.multicallProvider.all([
                gaugeContract.inflation_rate(),
                gaugeControllerContract.gauge_relative_weight(this.market.addresses.gauge),
                gaugeContract.working_supply(),
                lpTokenContract.totalSupply(),
            ]) as bigint[]).map((value) => toBN(value));

            inflationRateBN = inflationRateBN.times(weightBN);
        }

        if (inflationRateBN.eq(0)) return [0, 0];
        if (futureWorkingSupplyBN !== null) workingSupplyBN = futureWorkingSupplyBN;

        // If you added 1$ value of LP it would be 0.4$ of working LP. So your annual reward per 1$ in USD is:
        // (annual reward per working liquidity in $) * (0.4$ of working LP)
        const rateBN = inflationRateBN.times(31536000).div(workingSupplyBN).times(totalSupplyBN).div(Number(totalLiquidityUSD)).times(0.4);
        const crvPrice = await _getUsdRate.call(this.llamalend, this.llamalend.constants.ALIASES.crv);
        const baseApyBN = rateBN.times(crvPrice);
        const boostedApyBN = baseApyBN.times(2.5);

        return [baseApyBN.times(100).toNumber(), boostedApyBN.times(100).toNumber()]
    }

    public async vaultCrvApr(): Promise<[baseApy: number, boostedApy: number]> {
        if (this.vaultRewardsOnly()) throw Error(`${this.market.name} has Rewards-Only Gauge. Use stats.rewardsApy instead`);

        // const isDisabledChain = [1313161554].includes(this.llamalend.chainId); // Disable Aurora
        // if (useApi && !isDisabledChain) {
        //     const crvAPYs = await _getCrvApyFromApi();
        //     const poolCrvApy = crvAPYs[this.market.addresses.gauge] ?? [0, 0];  // new pools might be missing
        //     return [poolCrvApy[0], poolCrvApy[1]];
        // }

        return await this._calcCrvApr();
    }

    public async vaultClaimableCrv (address = ""): Promise<string> {
        if (this.vaultRewardsOnly()) throw Error(`${this.market.name} has Rewards-Only Gauge. Use claimableRewards instead`);
        address = address || this.llamalend.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        return this.llamalend.formatUnits(await this.llamalend.contracts[this.market.addresses.gauge].contract.claimable_tokens(address, this.llamalend.constantOptions));
    }

    private async _vaultClaimCrv(estimateGas: boolean): Promise<string | TGas> {
        if (this.vaultRewardsOnly()) throw Error(`${this.market.name} has Rewards-Only Gauge. Use claimRewards instead`);

        let isOldFactory = false;
        let contract;

        if (this.llamalend.chainId !== 1) {
            if (this.llamalend.constants.ALIASES.gauge_factory_old && this.llamalend.constants.ALIASES.gauge_factory_old !== this.llamalend.constants.ZERO_ADDRESS) {
                const oldFactoryContract = this.llamalend.contracts[this.llamalend.constants.ALIASES.gauge_factory_old].contract;
                const lpToken = await this.llamalend.contracts[this.market.addresses.gauge].contract.lp_token();
                const gaugeAddress = await oldFactoryContract.get_gauge_from_lp_token(lpToken);

                isOldFactory = gaugeAddress.toLowerCase() === this.market.addresses.gauge.toLowerCase();

                if (isOldFactory) {
                    contract = oldFactoryContract;
                }
            }
        }

        if (!isOldFactory) {
            contract = this.llamalend.contracts[this.llamalend.constants.ALIASES.minter].contract
        }

        if(!contract) {
            throw Error(`${this.market.name} couldn't match gauge factory`);
        }

        const gas = await contract.mint.estimateGas(this.market.addresses.gauge, this.llamalend.constantOptions);
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await contract.mint(this.market.addresses.gauge, { ...this.llamalend.options, gasLimit })).hash
    }

    public async vaultClaimCrvEstimateGas(): Promise<TGas> {
        return await this._vaultClaimCrv(true) as TGas;
    }

    public async vaultClaimCrv(): Promise<string> {
        return await this._vaultClaimCrv(false) as string;
    }

    public vaultRewardTokens = memoize(async (): Promise<{token: string, symbol: string, decimals: number}[]> => {
        if (this.market.addresses.gauge === this.llamalend.constants.ZERO_ADDRESS) return []

        // if (useApi) {
        //     const rewards = await _getRewardsFromApi();
        //     if (!rewards[this.market.addresses.gauge]) return [];
        //     rewards[this.market.addresses.gauge].forEach((r) => _setContracts(r.tokenAddress, ERC20Abi));
        //     return rewards[this.market.addresses.gauge].map((r) => ({ token: r.tokenAddress, symbol: r.symbol, decimals: Number(r.decimals) }));
        // }

        const gaugeContract = this.llamalend.contracts[this.market.addresses.gauge].contract;
        const gaugeMulticallContract = this.llamalend.contracts[this.market.addresses.gauge].multicallContract;
        const rewardCount = Number(this.llamalend.formatUnits(await gaugeContract.reward_count(this.llamalend.constantOptions), 0));

        const tokenCalls = [];
        for (let i = 0; i < rewardCount; i++) {
            tokenCalls.push(gaugeMulticallContract.reward_tokens(i));
        }
        const tokens = (await this.llamalend.multicallProvider.all(tokenCalls) as string[])
            .filter((addr) => addr !== this.llamalend.constants.ZERO_ADDRESS)
            .map((addr) => addr.toLowerCase())
            .filter((addr) => this.llamalend.chainId === 1 || addr !== this.llamalend.constants.COINS.crv);

        const tokenInfoCalls = [];
        for (const token of tokens) {
            this.llamalend.setContract(token, ERC20Abi);
            const tokenMulticallContract = this.llamalend.contracts[token].multicallContract;
            tokenInfoCalls.push(tokenMulticallContract.symbol(), tokenMulticallContract.decimals());
        }
        const tokenInfo = await this.llamalend.multicallProvider.all(tokenInfoCalls);
        for (let i = 0; i < tokens.length; i++) {
            this.llamalend.constants.DECIMALS[tokens[i]] = Number(tokenInfo[(i * 2) + 1]);
        }

        return tokens.map((token, i) => ({ token, symbol: tokenInfo[i * 2] as string, decimals: Number(tokenInfo[(i * 2) + 1]) }));
    }, {
        promise: true,
        maxAge: 30 * 60 * 1000, // 30m
    });

    public vaultRewardsApr = async (useApi = true): Promise<IReward[]> => {
        if(useApi) {
            const response = await _getMarketsData(this.llamalend.constants.NETWORK_NAME);

            const market = response.lendingVaultData.find((item) => item.address.toLowerCase() === this.market.addresses.vault.toLowerCase())

            if(market) {
                return market.gaugeRewards
            } else {
                throw new Error('Market not found in API')
            }
        } else {
            if (this.market.addresses.gauge === this.llamalend.constants.ZERO_ADDRESS) return [];

            // const isDisabledChain = [1313161554].includes(this.llamalend.chainId); // Disable Aurora
            // if (useApi && !isDisabledChain) {
            //     const rewards = await _getRewardsFromApi();
            //     if (!rewards[this.market.addresses.gauge]) return [];
            //     return rewards[this.market.addresses.gauge].map((r) => ({ gaugeAddress: r.gaugeAddress, tokenAddress: r.tokenAddress, symbol: r.symbol, apy: r.apy }));
            // }

            const apy: IReward[] = [];
            const rewardTokens = await this.vaultRewardTokens();
            for (const rewardToken of rewardTokens) {
                const gaugeContract = this.llamalend.contracts[this.market.addresses.gauge].multicallContract;
                const lpTokenContract = this.llamalend.contracts[this.market.addresses.vault].multicallContract;
                const rewardContract = this.llamalend.contracts[this.market.addresses.gauge].multicallContract;

                const totalLiquidityUSD = await this.vaultTotalLiquidity();
                const rewardRate = await _getUsdRate.call(this.llamalend, rewardToken.token);

                const [rewardData, _stakedSupply, _totalSupply] = (await this.llamalend.multicallProvider.all([
                    rewardContract.reward_data(rewardToken.token),
                    gaugeContract.totalSupply(),
                    lpTokenContract.totalSupply(),
                ]) as any[]);
                const stakedSupplyBN = toBN(_stakedSupply as bigint);
                const totalSupplyBN = toBN(_totalSupply as bigint);
                const inflationBN = toBN(rewardData.rate, rewardToken.decimals);
                const periodFinish = Number(this.llamalend.formatUnits(rewardData.period_finish, 0)) * 1000;
                const baseApy = periodFinish > Date.now() ?
                    inflationBN.times(31536000).times(rewardRate).div(stakedSupplyBN).times(totalSupplyBN).div(Number(totalLiquidityUSD)) :
                    BN(0);

                apy.push({
                    gaugeAddress: this.market.addresses.gauge,
                    tokenAddress: rewardToken.token,
                    symbol: rewardToken.symbol,
                    apy: baseApy.times(100).toNumber(),
                });
            }

            return apy
        }
    }

    public async vaultClaimableRewards(address = ""): Promise<{token: string, symbol: string, amount: string}[]> {
        if (this.market.addresses.gauge === this.llamalend.constants.ZERO_ADDRESS) {
            throw Error(`claimableRewards method doesn't exist for pool ${this.market.name} (id: ${this.market.name}). There is no gauge`);
        }
        address = address || this.llamalend.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const gaugeContract = this.llamalend.contracts[this.market.addresses.gauge].contract;
        const rewardTokens = await this.vaultRewardTokens();
        const rewards = [];
        for (const rewardToken of rewardTokens) {
            const _amount = await gaugeContract.claimable_reward(address, rewardToken.token, this.llamalend.constantOptions);
            rewards.push({
                token: rewardToken.token,
                symbol: rewardToken.symbol,
                amount: this.llamalend.formatUnits(_amount, rewardToken.decimals),
            });
        }

        return rewards
    }

    private async _vaultClaimRewards(estimateGas: boolean): Promise<string | TGas> {
        if (this.market.addresses.gauge === this.llamalend.constants.ZERO_ADDRESS) {
            throw Error(`claimRewards method doesn't exist for pool ${this.market.name} (id: ${this.market.name}). There is no gauge`);
        }
        const gaugeContract = this.llamalend.contracts[this.market.addresses.gauge].contract;
        if (!("claim_rewards()" in gaugeContract)) throw Error (`${this.market.name} pool doesn't have such method`);
        const gas = await gaugeContract.claim_rewards.estimateGas(this.llamalend.constantOptions);
        if (estimateGas) return smartNumber(gas);

        await this.llamalend.updateFeeData();
        const gasLimit = _mulBy1_3(DIGas(gas));
        return (await gaugeContract.claim_rewards({ ...this.llamalend.options, gasLimit })).hash;
    }

    public async vaultClaimRewardsEstimateGas(): Promise<TGas> {
        return await this._vaultClaimRewards(true) as TGas;
    }

    public async vaultClaimRewards(): Promise<string> {
        return await this._vaultClaimRewards(false) as string;
    }
}