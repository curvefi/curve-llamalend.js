export interface IWallet {
    balances: (address?: string) => Promise<{ collateral: string, borrowed: string, vaultShares: string, gauge: string }>,
}