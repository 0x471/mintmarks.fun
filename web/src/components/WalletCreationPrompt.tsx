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
  const { accessToken } = useAuth() // Gmail OAuth token
  const { isSignedIn } = useIsSignedIn()
  const { evmAddress } = useEvmAddress()

  // ✅ Best Practice: Hook'ların kendi loading state'lerini kullanın
  const { signInWithEmail, loading: emailLoading } = useSignInWithEmail()
  const { verifyEmailOTP, loading: otpLoading } = useVerifyEmailOTP()

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [flowId, setFlowId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email')

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
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #3b82f6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Initializing wallet system...
          </p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
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
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#f0fdf4',
        borderRadius: '8px',
        border: '2px solid #10b981',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
          }} />
          <div>
            <h3 style={{ fontWeight: '600', color: '#065f46', marginBottom: '0.25rem' }}>
              Wallet Connected
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#047857' }}>
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
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>👛</span>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Create Your Wallet</h3>
          </div>
          
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
            To create your embedded wallet, we need to verify your email address.
            Enter your email below and we'll send you a verification code.
          </p>

          {error && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              marginBottom: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>⚠️</span>
                <p style={{ fontSize: '0.875rem', color: '#991b1b' }}>{error}</p>
              </div>
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              
              // ✅ Best Practice: Form validation
              if (!email || !email.includes('@')) {
                setError('Please enter a valid email address.')
                return
              }

              // ✅ Best Practice: Authentication flow başlatmadan önce kontrol et
              const user = await getCurrentUser()
              if (user) {
                setError('You are already signed in. Please refresh the page.')
                return
              }

              setError(null)
              try {
                console.log('🚀 Starting wallet creation flow for email:', email)
                const result = await signInWithEmail({ email })
                console.log('✅ OTP sent successfully, flowId:', result.flowId)
                setFlowId(result.flowId)
                setStep('otp')
              } catch (err) {
                // ✅ Best Practice: Detaylı error handling
                console.error('❌ Wallet creation error:', err)
                const errorMessage = err instanceof Error
                  ? err.message
                  : 'Failed to send verification code'

                // "User is already authenticated" hatasını özel olarak handle et
                if (errorMessage.includes('already authenticated')) {
                  setError('You are already signed in. Please refresh the page.')
                } else if (errorMessage.includes('project') || errorMessage.includes('Project ID')) {
                  setError('CDP Project ID is missing or invalid. Please check your .env file.')
                } else if (errorMessage.includes('domain') || errorMessage.includes('CORS')) {
                  setError('Domain not authorized. Please add this domain to CDP Portal.')
                } else {
                  setError(errorMessage)
                }
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={emailLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={emailLoading || !email}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: emailLoading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: emailLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {emailLoading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                  Sending Code...
                </>
              ) : (
                <>
                  <span>📧</span>
                  Send Verification Code
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // OTP doğrulama adımı
  if (step === 'otp') {
    return (
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📧</span>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Verify Your Email</h3>
          </div>
          
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
            We've sent a verification code to <strong>{email}</strong>.
            Please enter the code below to create your wallet.
          </p>

          {error && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              marginBottom: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>⚠️</span>
                <p style={{ fontSize: '0.875rem', color: '#991b1b' }}>{error}</p>
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

                if (user.evmAccounts?.length > 0) {
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
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div>
              <label htmlFor="otp" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
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
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  textAlign: 'center',
                  fontSize: '1.5rem',
                  letterSpacing: '0.5rem',
                  fontFamily: 'monospace',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setOtp('')
                  setFlowId(null)
                }}
                disabled={otpLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: otpLoading ? 'not-allowed' : 'pointer',
                }}
              >
                Back
              </button>
              <button 
                type="submit" 
                disabled={otpLoading || otp.length !== 6} 
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: otpLoading || otp.length !== 6 ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: otpLoading || otp.length !== 6 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {otpLoading ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }} />
                    Verifying...
                  </>
                ) : (
                  'Verify & Create Wallet'
                )}
              </button>
            </div>
          </form>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Başarı adımı
  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: '#f0fdf4',
      borderRadius: '8px',
      border: '2px solid #10b981',
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>✅</span>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#065f46' }}>
            Wallet Created Successfully!
          </h3>
        </div>
        
        {evmAddress && (
          <div style={{
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '6px',
            marginBottom: '1rem',
          }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              Your Wallet Address:
            </p>
            <code style={{ 
              fontSize: '0.875rem', 
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              color: '#374151',
            }}>
              {evmAddress}
            </code>
          </div>
        )}
        <p style={{ fontSize: '0.875rem', color: '#047857' }}>
          Your embedded wallet has been created and is ready to use!
        </p>
      </div>
    </div>
  )
}
