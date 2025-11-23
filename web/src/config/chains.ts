/**
 * Network Configurations
 * 
 * We don't need viem for this - CDP SDK handles chain management.
 * We only need the chain ID for transaction parameters.
 */

// User requested 3 specific networks: Celo Mainnet, Base Testnet, Celo Sepolia Testnet

// Celo Mainnet
export const celoMainnet = {
  id: 42220,
  name: 'Celo Mainnet',
  rpcUrl: 'https://forno.celo.org',
  explorer: 'https://celoscan.io',
  nativeCurrency: {
    decimals: 18,
    name: 'Celo',
    symbol: 'CELO',
  },
  cdpNetwork: 'celo' as const,
  isTestnet: false,
} as const

// Base Sepolia Testnet
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
  cdpNetwork: 'base-sepolia' as const,
  isTestnet: true,
} as const

// Celo Sepolia Testnet (Official new testnet - Chain ID: 11142220)
export const celoSepolia = {
  id: 11142220, // Official Celo Sepolia Chain ID
  name: 'Celo Sepolia',
  rpcUrl: 'https://forno.celo-sepolia.celo-testnet.org',
  explorer: 'https://celo-sepolia.blockscout.com',
  nativeCurrency: {
    decimals: 18,
    name: 'Celo',
    symbol: 'CELO',
  },
  cdpNetwork: 'celo-sepolia' as const, // Official network string
  isTestnet: true,
} as const

// Base Mainnet
export const baseMainnet = {
  id: 8453,
  name: 'Base Mainnet',
  rpcUrl: 'https://mainnet.base.org',
  explorer: 'https://basescan.org',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  cdpNetwork: 'base' as const,
  isTestnet: false,
} as const

export type SupportedNetwork = 'celo' | 'base-sepolia' | 'base' | 'celo-sepolia'

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
  isTestnet: boolean
}

export const NETWORKS: Record<SupportedNetwork, NetworkConfig> = {
  'celo': celoMainnet,
  'base-sepolia': baseSepolia,
  'base': baseMainnet,
  'celo-sepolia': celoSepolia,
} as const

// TODO: Add Celo Sepolia when CDP SDK supports it
export const celoSepoliaUnsupported = celoSepolia // Keep for future use

// Contract Addresses - Network specific (4 networks: Celo Mainnet, Base Sepolia, Base Mainnet, Celo Sepolia)
export const CONTRACTS = {
  // Celo Mainnet
  CELO: {
    USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', // Celo USDC
    MINT_FEE_RECIPIENT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  },
  // Base Sepolia (Testnet)
  BASE_SEPOLIA: {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    MINT_FEE_RECIPIENT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  },
  // Base Mainnet
  BASE: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base Mainnet USDC
    MINT_FEE_RECIPIENT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  },
  // Celo Sepolia (Testnet) - Chain ID: 11142220
  CELO_SEPOLIA: {
    USDC: '0x2F25deB3848C207fc8E0c34035B6053542C6CA76', // Celo Sepolia USDC
    MINT_FEE_RECIPIENT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    // Mintmarks deployed contracts (CRITICAL - lowercase addresses for SELF Protocol)
    PROOF_OF_HUMAN: '0x5f927e64b72cc92ad8a47951e6311d49bcf71271',
    MINTMARKS: '0xb6b5b320226ccc381e80561a25e9596816f8a323',
    VERIFIER: '0xff4c542df3340abcf8043b1a5afb874344f06674',
  },
} as const

// Helper function to group networks by type
export const getNetworksByType = () => {
  const mainnet = Object.entries(NETWORKS).filter(([_, config]) => !config.isTestnet)
  const testnet = Object.entries(NETWORKS).filter(([_, config]) => config.isTestnet)
  
  return { mainnet, testnet }
}
