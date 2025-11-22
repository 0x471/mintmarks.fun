import {
  useIsSignedIn,
  useEvmAddress,
  useIsInitialized
} from '@coinbase/cdp-hooks'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '@coinbase/cdp-core'

export interface WalletStatus {
  hasWallet: boolean
  isSignedIn: boolean
  evmAddress: string | undefined
  isLoading: boolean
  needsWallet: boolean // Wallet oluşturulması gerekiyor mu?
  isInitialized: boolean // SDK initialize oldu mu?
}

/**
 * Kullanıcının wallet durumunu kontrol eden hook
 * 
 * ⚠️ Best Practice: useIsInitialized ile SDK'nın hazır olmasını bekleyin
 * 
 * @returns Wallet durumu bilgisi
 */
export function useWalletStatus(): WalletStatus {
  const { isInitialized } = useIsInitialized() // ✅ Best Practice: SDK initialize kontrolü
  const { isSignedIn } = useIsSignedIn()
  const { evmAddress } = useEvmAddress()

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // SDK initialize olana kadar bekle
    if (isInitialized) {
      setIsLoading(false)
    }
  }, [isInitialized])

  // ✅ Best Practice: getCurrentUser ile double-check
  useEffect(() => {
    if (isInitialized) {
      getCurrentUser().then((user) => {
        if (user) {
          console.log('Current user:', user.userId)
          console.log('EVM Accounts:', user.evmAccounts)
        }
      }).catch((error) => {
        // Silently handle errors - Chrome extensions may interfere
        // Only log in development
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.warn('[useWalletStatus] Error getting current user (may be Chrome extension interference):', error)
        }
      })
    }
  }, [isInitialized])

  const hasWallet = isSignedIn && !!evmAddress
  const needsWallet = isInitialized && !isSignedIn && !evmAddress && !isLoading

  return {
    hasWallet,
    isSignedIn,
    evmAddress: evmAddress ?? undefined, // Convert null to undefined for type compatibility
    isLoading: isLoading || !isInitialized, // SDK initialize olana kadar loading
    needsWallet,
    isInitialized,
  }
}
