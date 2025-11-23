import { useState, useEffect } from 'react'
import {
  useSignInWithEmail,
  useVerifyEmailOTP,
  useIsSignedIn,
  useEvmAddress,
  useIsInitialized
} from '@coinbase/cdp-hooks'
import { getCurrentUser } from '@coinbase/cdp-core'
import { useAuth } from '../contexts/AuthContext'

/**
 * Wallet Oluşturma Prompt Component
 * 
 * Kullanıcıya EOA (Externally Owned Account) wallet oluşturma seçeneği sunar.
 * 
 * ⚠️ Note: We only use EOA wallets, not Smart Contract wallets or Solana wallets.
 * 
 * İki mod destekler:
 * 1. Otomatik: Kullanıcı login olduğunda otomatik wallet oluştur
 * 2. Manuel: Kullanıcı butona tıklayınca wallet oluştur
 */
export function WalletCreationPrompt({
  autoCreate = false
}: {
  autoCreate?: boolean
}) {
  // ✅ Best Practice: SDK initialize kontrolü
  const { isInitialized } = useIsInitialized()
  const { accessToken, userEmail } = useAuth() // Gmail OAuth token and email
  const { isSignedIn } = useIsSignedIn()
  const { evmAddress } = useEvmAddress()

  // ⚠️ Note: Hook'lar loading state döndürmüyor, manuel state kullanıyoruz
  const { signInWithEmail } = useSignInWithEmail()
  const { verifyEmailOTP } = useVerifyEmailOTP()

  const [otp, setOtp] = useState('')
  const [flowId, setFlowId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email')
  const [emailLoading, setEmailLoading] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)

  // Auto-start wallet creation when user is logged in and email is available
  useEffect(() => {
    if (isInitialized && userEmail && !isSignedIn && !evmAddress && step === 'email' && !emailLoading) {
      handleAutoStart()
    }
  }, [isInitialized, userEmail, isSignedIn, evmAddress, step, emailLoading])

  const handleAutoStart = async () => {
    if (!userEmail) return

    const user = await getCurrentUser()
    if (user) {
      setError('You are already signed in. Please refresh the page.')
      return
    }

    setError(null)
    setEmailLoading(true)
    try {
      console.log('🚀 Auto-starting wallet creation flow for email:', userEmail)
      const result = await signInWithEmail({ email: userEmail })
      console.log('✅ OTP sent successfully, flowId:', result.flowId)
      setFlowId(result.flowId)
      setStep('otp')
    } catch (err) {
      console.error('❌ Wallet creation error:', err)
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to send verification code'

      if (errorMessage.includes('already authenticated')) {
        setError('You are already signed in. Please refresh the page.')
      } else if (errorMessage.includes('project') || errorMessage.includes('Project ID')) {
        setError('CDP Project ID is missing or invalid. Please check your .env file.')
      } else if (errorMessage.includes('domain') || errorMessage.includes('CORS')) {
        setError('Domain not authorized. Please add this domain to CDP Portal.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setEmailLoading(false)
    }
  }

  // Debug: Log SDK initialization status
  useEffect(() => {
    console.log('🔍 WalletCreationPrompt Debug:', {
      isInitialized,
      isSignedIn,
      evmAddress,
      hasAccessToken: !!accessToken,
      projectId: import.meta.env.VITE_CDP_PROJECT_ID ? 'Set' : 'Missing',
    })
  }, [isInitialized, isSignedIn, evmAddress, accessToken])

  // ✅ Best Practice: SDK initialize olana kadar render etme
  if (!isInitialized) {
    return (
      <div className="p-6 bg-muted rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">
            Initializing wallet system...
          </p>
        </div>
      </div>
    )
  }

  // ✅ Best Practice: Authentication flow başlatmadan önce kontrol et
  useEffect(() => {
    if (!isInitialized) return

    // ✅ Best Practice: getCurrentUser ile double-check
    getCurrentUser().then((user) => {
      if (user) {
        // User zaten authenticated, wallet oluşturma gerekmez
        console.log('User already authenticated, wallet should be available')
        return
      }

      // Otomatik wallet oluşturma
      if (autoCreate && accessToken && !isSignedIn && !evmAddress) {
        // Gmail'den email adresini al (eğer mümkünse)
        // Veya kullanıcıdan email iste
        console.log('Auto-create wallet triggered')
      }
    }).catch((error) => {
      console.error('Error checking current user:', error)
    })
  }, [isInitialized, autoCreate, accessToken, isSignedIn, evmAddress])

  // Eğer wallet zaten varsa, component'i gösterme
  if (isSignedIn && evmAddress) {
    return (
      <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-500">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-green-500" />
          <div>
            <h3 className="font-semibold text-green-800 dark:text-green-400 mb-1">
              Wallet Connected
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              Your wallet address: {evmAddress.slice(0, 6)}...{evmAddress.slice(-4)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Email girişi adımı
  if (step === 'email') {
    return (
      <div className="p-6 bg-card rounded-lg border border-border shadow-sm">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">👛</span>
            <h3 className="text-lg font-semibold">Create Your Wallet</h3>
          </div>

          {!userEmail ? (
            <p className="text-sm text-destructive mb-4">
              Please sign in with Google to create your wallet.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                We'll send a verification code to <strong>{userEmail}</strong> to create your embedded wallet.
              </p>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}

              {emailLoading ? (
                <div className="flex items-center justify-center gap-3 p-4">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Sending verification code to {userEmail}...
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleAutoStart}
                  disabled={emailLoading || !userEmail}
                  className="w-full p-3 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  <span>📧</span>
                  Send Verification Code to {userEmail}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // OTP doğrulama adımı
  if (step === 'otp') {
    return (
      <div className="p-6 bg-card rounded-lg border border-border shadow-sm">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📧</span>
            <h3 className="text-lg font-semibold">Verify Your Email</h3>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            We've sent a verification code to <strong>{userEmail}</strong>.
            Please enter the code below to create your wallet.
          </p>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault()

              // ✅ Best Practice: Form validation
              if (!flowId) {
                setError('Authentication flow not found. Please start over.')
                return
              }

              if (!otp || otp.length !== 6) {
                setError('Please enter a valid 6-digit verification code.')
                return
              }

              setError(null)
              setOtpLoading(true)
              try {
                console.log('🔐 Verifying OTP, flowId:', flowId)
                const { user, isNewUser } = await verifyEmailOTP({
                  flowId,
                  otp
                })

                // ✅ Best Practice: EOA wallet checking (we only use EOA wallets)
                const logData: Record<string, unknown> = {
                  userId: user.userId,
                  isNewUser,
                }

                if (user.evmAccounts && user.evmAccounts.length > 0) {
                  logData.eoaAddress = user.evmAccounts[0]
                  console.log('✅ User EVM address (EOA):', user.evmAccounts[0])
                } else {
                  console.warn('⚠️ No EOA wallet found after verification')
                }

                console.log('✅ EOA Wallet created successfully!', logData)
                setStep('success')
              } catch (err) {
                // ✅ Best Practice: Detaylı error handling
                console.error('❌ OTP verification error:', err)
                const errorMessage = err instanceof Error
                  ? err.message
                  : 'Invalid verification code'

                // OTP hatalarını özel olarak handle et
                if (errorMessage.includes('invalid') || errorMessage.includes('expired')) {
                  setError('Invalid or expired verification code. Please try again.')
                } else if (errorMessage.includes('project') || errorMessage.includes('Project ID')) {
                  setError('CDP Project ID is missing or invalid. Please check your .env file.')
                } else {
                  setError(errorMessage)
                }
              } finally {
                setOtpLoading(false)
              }
            }}
            className="flex flex-col gap-4"
          >
            <div>
              <label htmlFor="otp" className="block text-sm font-medium mb-2">
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                required
                disabled={otpLoading}
                className="w-full p-3 border border-input rounded-md text-center text-2xl tracking-[0.5em] font-mono bg-background"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setOtp('')
                  setFlowId(null)
                }}
                disabled={otpLoading}
                className="flex-1 p-3 bg-muted text-muted-foreground border border-input rounded-md text-sm font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={otpLoading || otp.length !== 6}
                className="flex-1 p-3 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {otpLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Create Wallet'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Başarı adımı
  return (
    <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-500">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">✅</span>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-400">
            Wallet Created Successfully!
          </h3>
        </div>

        {evmAddress && (
          <div className="p-4 bg-white dark:bg-black/20 rounded-md mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              Your Wallet Address:
            </p>
            <code className="text-sm font-mono break-all text-foreground">
              {evmAddress}
            </code>
          </div>
        )}
        <p className="text-sm text-green-700 dark:text-green-300">
          Your embedded wallet has been created and is ready to use!
        </p>
      </div>
    </div>
  )
}
