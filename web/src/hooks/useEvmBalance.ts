import { useState, useEffect, useCallback } from 'react'
import { useEvmAddress } from '@coinbase/cdp-hooks'
import { type SupportedNetwork, NETWORKS } from '@/config/chains'

interface EvmBalanceHook {
  balance: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook for tracking EVM wallet balance
 * Uses native RPC calls to get balance since CDP doesn't provide balance hooks for EOA
 */
export function useEvmBalance(
  externalAddress?: string,
  network: SupportedNetwork = 'base-sepolia'
): EvmBalanceHook {
  const { evmAddress: hookAddress } = useEvmAddress()
  const evmAddress = externalAddress || hookAddress
  const [balance, setBalance] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const networkConfig = NETWORKS[network]

  const fetchBalance = useCallback(async () => {
    if (!evmAddress || !networkConfig) {
      setBalance(0)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use native fetch to call RPC directly
      const response = await fetch(networkConfig.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [evmAddress, 'latest'],
          id: 1,
        }),
      })

      if (!response.ok) {
        throw new Error(`RPC request failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(`RPC error: ${data.error.message}`)
      }

      // Convert hex balance to decimal and then to ether
      const balanceWei = BigInt(data.result)
      const balanceEther = Number(balanceWei) / Math.pow(10, networkConfig.nativeCurrency.decimals)
      
      setBalance(balanceEther)
    } catch (err) {
      console.error('[Balance] Failed to fetch balance:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance'
      setError(errorMessage)
      setBalance(0)
    } finally {
      setIsLoading(false)
    }
  }, [evmAddress, networkConfig])

  // Auto-fetch balance when address or network changes
  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  // Auto-refresh balance every 30 seconds
  useEffect(() => {
    if (!evmAddress) return

    const interval = setInterval(fetchBalance, 30000)
    return () => clearInterval(interval)
  }, [evmAddress, fetchBalance])

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  }
}
