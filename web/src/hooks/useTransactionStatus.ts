import { useState, useEffect, useCallback } from 'react'
import { type SupportedNetwork, NETWORKS } from '@/config/chains'

export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'not_found'

interface TransactionReceipt {
  blockHash: string
  blockNumber: string  
  status: string
  gasUsed: string
  transactionHash: string
}

interface TransactionStatusHook {
  status: TransactionStatus | null
  receipt: TransactionReceipt | null
  isLoading: boolean
  error: string | null
  trackTransaction: (hash: string, network: SupportedNetwork) => void
  clearStatus: () => void
}

/**
 * Hook to track EVM transaction status using RPC calls
 */
export function useTransactionStatus(): TransactionStatusHook {
  const [status, setStatus] = useState<TransactionStatus | null>(null)
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentHash, setCurrentHash] = useState<string | null>(null)
  const [currentNetwork, setCurrentNetwork] = useState<SupportedNetwork | null>(null)

  const checkTransactionStatus = useCallback(async (
    txHash: string, 
    network: SupportedNetwork
  ) => {
    const networkConfig = NETWORKS[network]
    if (!networkConfig) {
      setError(`Unsupported network: ${network}`)
      return
    }

    try {
      const response = await fetch(networkConfig.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txHash],
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

      if (data.result === null) {
        // Transaction not found or still pending
        setStatus('pending')
        setReceipt(null)
      } else {
        // Transaction found
        const txReceipt = data.result as TransactionReceipt
        setReceipt(txReceipt)
        
        // Status "0x1" means success, "0x0" means failure
        if (txReceipt.status === '0x1') {
          setStatus('confirmed')
        } else {
          setStatus('failed')
        }
      }
      
      setError(null)
    } catch (err) {
      console.error('[TransactionStatus] Failed to check transaction:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to check transaction status'
      setError(errorMessage)
      setStatus('not_found')
    }
  }, [])

  const trackTransaction = useCallback((hash: string, network: SupportedNetwork) => {
    setCurrentHash(hash)
    setCurrentNetwork(network)
    setStatus('pending')
    setReceipt(null)
    setError(null)
    setIsLoading(true)

    console.log(`[TransactionStatus] 🔍 Tracking transaction: ${hash} on ${network}`)
  }, [])

  const clearStatus = useCallback(() => {
    setStatus(null)
    setReceipt(null)
    setError(null)
    setCurrentHash(null)
    setCurrentNetwork(null)
    setIsLoading(false)
  }, [])

  // Poll transaction status
  useEffect(() => {
    if (!currentHash || !currentNetwork || status === 'confirmed' || status === 'failed') {
      setIsLoading(false)
      return
    }

    const pollTransaction = async () => {
      await checkTransactionStatus(currentHash, currentNetwork)
      setIsLoading(false)
    }

    // Initial check
    pollTransaction()

    // Poll every 3 seconds until confirmed or failed
    const interval = setInterval(pollTransaction, 3000)

    return () => clearInterval(interval)
  }, [currentHash, currentNetwork, status, checkTransactionStatus])

  return {
    status,
    receipt,
    isLoading,
    error,
    trackTransaction,
    clearStatus,
  }
}
