import {
  useIsSignedIn,
  useEvmAddress,
  useIsInitialized
} from '@coinbase/cdp-hooks'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '@coinbase/cdp-core'
import { NETWORKS, type SupportedNetwork } from '../config/chains'
import { useNetwork } from '../contexts/NetworkContext'

export interface WalletStatus {
  hasWallet: boolean
  isSignedIn: boolean
  evmAddress: string | undefined
  isLoading: boolean
  needsWallet: boolean // Wallet oluşturulması gerekiyor mu?
  isInitialized: boolean // SDK initialize oldu mu?
  balance: number // Balance in native units
  isLoadingBalance: boolean
  connectionTimeout: boolean // CDP connection timeout oldu mu?
}

/**
 * Kullanıcının wallet durumunu kontrol eden hook
 * 
 * ⚠️ Best Practice: useIsInitialized ile SDK'nın hazır olmasını bekleyin
 * 
 * @returns Wallet durumu bilgisi
 */
/**
 * Fetch balance from specific network RPC
 */
async function fetchBalance(address: string, network: SupportedNetwork): Promise<number> {
  const networkConfig = NETWORKS[network]
  
  try {
    const response = await fetch(networkConfig.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1,
      }),
    })

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error.message || 'Failed to fetch balance')
    }

    // Convert hex balance to BigInt, then to decimal (divide by 10^18)
    const balanceWei = BigInt(data.result || '0x0')
    const balance = Number(balanceWei) / 10 ** networkConfig.nativeCurrency.decimals
    
    return balance
  } catch (error) {
    console.error('[useWalletStatus] Error fetching balance:', error)
    return 0
  }
}

export function useWalletStatus(): WalletStatus {
  const { isInitialized } = useIsInitialized() // ✅ Best Practice: SDK initialize kontrolü
  const { isSignedIn } = useIsSignedIn()
  const { evmAddress } = useEvmAddress()
  const { selectedNetwork } = useNetwork()

  const [isLoading, setIsLoading] = useState(true)
  const [balance, setBalance] = useState<number>(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [connectionTimeout, setConnectionTimeout] = useState(false)

  useEffect(() => {
    // SDK initialize olana kadar bekle
    if (isInitialized) {
      setIsLoading(false)
    }
    
    // Set timeout for connection state - if still connecting after 10 seconds, assume failure
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('[useWalletStatus] Connection timeout - assuming no wallet connected')
        setIsLoading(false)
        setConnectionTimeout(true)
      }
    }, 10000) // 10 second timeout
    
    return () => clearTimeout(timeoutId)
  }, [isInitialized, isLoading])

  // ✅ Best Practice: getCurrentUser ile double-check
  useEffect(() => {
    if (isInitialized) {
      getCurrentUser().then((user) => {
        if (user) {
          console.log('Current user:', user.userId)
          console.log('EVM Accounts:', user.evmAccounts)
          setConnectionTimeout(false) // Reset timeout if we have a user
        } else {
          // No user found - stop loading state
          setIsLoading(false)
        }
      }).catch((error) => {
        // Handle CDP authentication errors gracefully
        console.warn('[useWalletStatus] CDP Authentication error - user not connected:', error.message)
        setIsLoading(false)
        setConnectionTimeout(true)
        
        // Only log full error details in development
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.warn('[useWalletStatus] Full error details:', error)
        }
      })
    }
  }, [isInitialized])

  // Fetch balance when wallet address is available or network changes
  useEffect(() => {
    if (evmAddress && isInitialized) {
      setIsLoadingBalance(true)
      fetchBalance(evmAddress, selectedNetwork)
        .then((bal) => {
          setBalance(bal)
          setIsLoadingBalance(false)
        })
        .catch((error) => {
          console.error('[useWalletStatus] Error fetching balance:', error)
          setBalance(0)
          setIsLoadingBalance(false)
        })
    } else {
      setBalance(0)
      setIsLoadingBalance(false)
    }
  }, [evmAddress, isInitialized, selectedNetwork])

  const hasWallet = isSignedIn && !!evmAddress
  const needsWallet = isInitialized && !isSignedIn && !evmAddress && !isLoading

  // DEBUG: Log wallet state changes
  useEffect(() => {
    if (hasWallet) {
      console.log('✅ [useWalletStatus] Wallet connected:', evmAddress)
    } else if (needsWallet && !isLoading) {
      console.log('⚠️ [useWalletStatus] Wallet needed - user should create wallet')
    }
  }, [hasWallet, needsWallet, isLoading, evmAddress])

  return {
    hasWallet,
    isSignedIn,
    evmAddress: evmAddress ?? undefined, // Convert null to undefined for type compatibility
    isLoading: isLoading || !isInitialized, // SDK initialize olana kadar loading
    needsWallet,
    isInitialized,
    balance,
    isLoadingBalance,
    connectionTimeout,
  }
}
