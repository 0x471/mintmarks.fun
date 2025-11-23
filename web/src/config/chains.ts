/**
 * Network Configurations
 * 
 * We don't need viem for this - CDP SDK handles chain management.
 * We only need the chain ID for transaction parameters.
 */

export const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  rpcUrl: 'https://sepolia.base.org',
  explorer: 'https://sepolia.basescan.org',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  cdpNetwork: 'base-sepolia' as const, // CDP SDK network string
} as const

export const celoSepolia = {
  id: 11142220,
  name: 'Celo Sepolia',
  rpcUrl: 'https://forno.celo-sepolia.celo-testnet.org',
  explorer: 'https://celo-sepolia.blockscout.com',
  nativeCurrency: {
    decimals: 18,
    name: 'Celo',
    symbol: 'CELO',
  },
  cdpNetwork: 'celo-sepolia' as const, // CDP SDK network string (may not be officially supported)
} as const

export type SupportedNetwork = 'base-sepolia' | 'celo-sepolia'

export interface NetworkConfig {
  id: number
  name: string
  rpcUrl: string
  explorer: string
  nativeCurrency: {
    decimals: number
    name: string
    symbol: string
  }
  cdpNetwork: string
}

export const NETWORKS: Record<SupportedNetwork, NetworkConfig> = {
  'base-sepolia': baseSepolia,
  'celo-sepolia': celoSepolia,
} as const

// Contract Addresses - Network specific
export const CONTRACTS = {
  // Base Sepolia
  BASE_SEPOLIA: {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    MINT_FEE_RECIPIENT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Same recipient for now
  },
  // Celo Sepolia
  CELO_SEPOLIA: {
    USDC: '0x2F25deB3848C207fc8E0c34035B6053542C6CA76', // Celo Sepolia USDC (Example - needs verification)
    MINT_FEE_RECIPIENT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Same recipient for now
  },
} as const

