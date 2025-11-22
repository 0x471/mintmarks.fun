import { 
  useIsSignedIn, 
  useEvmAddress, 
  useCurrentUser,
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
  const { currentUser } = useCurrentUser()

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
        console.error('Error getting current user:', error)
      })
    }
  }, [isInitialized])

  const hasWallet = isSignedIn && !!evmAddress
  const needsWallet = isInitialized && !isSignedIn && !evmAddress && !isLoading

  return {
    hasWallet,
    isSignedIn,
    evmAddress,
    isLoading: isLoading || !isInitialized, // SDK initialize olana kadar loading
    needsWallet,
    isInitialized,
  }
}
