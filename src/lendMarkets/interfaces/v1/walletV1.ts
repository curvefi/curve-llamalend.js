export interface IWalletV1 {
    balances: (address?: string) => Promise<{ collateral: string, borrowed: string, vaultShares: string, gauge: string }>,
}