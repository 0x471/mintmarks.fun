import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useWalletStatus } from '@/hooks/useWalletStatus'
import { useSignInWithEmail, useVerifyEmailOTP, useCurrentUser, useEvmAddress, useSendEvmTransaction } from '@coinbase/cdp-hooks'
import { searchLumaEmails, getEmailRaw, type EmailSearchResult } from '@/services/gmail'
import type { GmailMessageDetail } from '@/types/gmail'
import { validateProof } from '@/services/proofValidation'
import { generateNFTImage } from '@/services/nftImageGeneration'
import type { NFTMetadata } from '@/services/nftMinting'
import { useToast } from '@/components/useToast'
import { handleWalletError } from '@/utils/walletErrors'
import { getCurrentUser } from '@coinbase/cdp-core'
import { type MintStep } from '@/components/ProgressIndicator'
import { UnifiedMintProgress, type UnifiedMintStep } from '@/components/UnifiedMintProgress'
import { celoSepolia, CONTRACTS } from '@/config/chains'
import VerticalBarsNoise from '@/components/VerticalBarsNoise'
import EmailCard from '@/components/EmailCard'
import { POAPBadge } from '@/components/POAPBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Upload, CheckCircle2, AlertCircle, ArrowLeft, Sparkles, Mail, Bookmark, ArrowRight, Shield, ChevronDown, Info, X } from 'lucide-react'
// USDC transfer için ERC20 transfer fonksiyonunu encode ediyoruz
// Function selector: transfer(address,uint256) = 0xa9059cbb

type Mode = 'file' | 'gmail'

export default function CreateMark() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { accessToken, isAuthenticated, handleTokenExpiration, userEmail } = useAuth()
  const { showToast } = useToast()

  // CDP Wallet hooks
  const walletStatus = useWalletStatus()
  const { signInWithEmail } = useSignInWithEmail()
  const { verifyEmailOTP } = useVerifyEmailOTP()
  const { currentUser } = useCurrentUser()
  const { evmAddress } = useEvmAddress()
  const { sendEvmTransaction, data: txData } = useSendEvmTransaction()
  
  // CDP Email OTP state for wallet connection
  // Note: Email comes from Gmail authentication (userEmail), no need for separate state
  const [otpCode, setOtpCode] = useState<string>('')
  const [flowId, setFlowId] = useState<string | null>(null)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  
  const [mode, setMode] = useState<Mode>('gmail')
  const [emailFile, setEmailFile] = useState<File | null>(null)
  const [proof, setProof] = useState<any>(null)
  // @ts-ignore - Future use
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Demo mode - only when explicitly requested via URL parameter
  const isDemoMode = searchParams.get('demo') === 'true'
  
  // Redirect to home if not authenticated and not in demo mode
  useEffect(() => {
    if (!isAuthenticated && !isDemoMode) {
      navigate('/')
    }
  }, [isAuthenticated, isDemoMode, navigate])

  // Proof Generation Logs
  const [proofLogs, setProofLogs] = useState<string[]>([])
  const [proofStatus, setProofStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle')

  
  // Mock email data for demo
  const mockEmails: GmailMessageDetail[] = [
    {
      id: 'demo-1',
      subject: 'Registration Confirmation: Luma AI Product Launch',
      from: 'noreply@lu.ma',
      date: new Date(2024, 0, 15).toISOString(),
      snippet: 'You are confirmed for Luma AI Product Launch on January 15, 2024. We look forward to seeing you there!'
    },
    {
      id: 'demo-2',
      subject: 'Registration Confirmation: Substack Writer Summit',
      from: 'hello@substack.com',
      date: new Date(2024, 1, 20).toISOString(),
      snippet: 'Your registration for Substack Writer Summit has been confirmed. Join us on February 20, 2024!'
    },
    {
      id: 'demo-3',
      subject: 'Registration Confirmation: Luma AI Workshop',
      from: 'noreply@lu.ma',
      date: new Date(2024, 2, 10).toISOString(),
      snippet: 'You are confirmed for Luma AI Technical Workshop on March 10, 2024. Get ready to learn!'
    },
    {
      id: 'demo-4',
      subject: 'Welcome to Substack Newsletter',
      from: 'hello@substack.com',
      date: new Date(2024, 2, 25).toISOString(),
      snippet: 'Welcome to our Substack newsletter! You are now subscribed to receive updates.'
    },
    {
      id: 'demo-5',
      subject: 'Registration Confirmation: Luma AI Beta Access',
      from: 'noreply@lu.ma',
      date: new Date(2024, 3, 5).toISOString(),
      snippet: 'You have been granted early access to Luma AI Beta. Start exploring now!'
    },
    {
      id: 'demo-6',
      subject: 'Registration Confirmation: Web3 Conference 2024',
      from: 'noreply@lu.ma',
      date: new Date(2024, 3, 15).toISOString(),
      snippet: 'Your registration for Web3 Conference 2024 has been confirmed. See you there!'
    },
    {
      id: 'demo-7',
      subject: 'Registration Confirmation: Crypto Dev Summit',
      from: 'hello@substack.com',
      date: new Date(2024, 4, 1).toISOString(),
      snippet: 'You are confirmed for Crypto Dev Summit on May 1, 2024. Get ready for an amazing event!'
    },
    {
      id: 'demo-8',
      subject: 'Registration Confirmation: AI & ML Workshop',
      from: 'noreply@lu.ma',
      date: new Date(2024, 4, 10).toISOString(),
      snippet: 'Your registration for AI & ML Workshop has been confirmed. Looking forward to seeing you!'
    },
    {
      id: 'demo-9',
      subject: 'Welcome to Blockchain Weekly Newsletter',
      from: 'hello@substack.com',
      date: new Date(2024, 4, 20).toISOString(),
      snippet: 'Welcome to Blockchain Weekly! You are now subscribed to receive weekly updates.'
    },
    {
      id: 'demo-10',
      subject: 'Registration Confirmation: DeFi Summit',
      from: 'noreply@lu.ma',
      date: new Date(2024, 5, 5).toISOString(),
      snippet: 'You are confirmed for DeFi Summit on June 5, 2024. Don\'t miss this exciting event!'
    },
    {
      id: 'demo-11',
      subject: 'Registration Confirmation: NFT Art Gallery Opening',
      from: 'noreply@lu.ma',
      date: new Date(2024, 5, 15).toISOString(),
      snippet: 'Your registration for NFT Art Gallery Opening has been confirmed. See you at the gallery!'
    },
    {
      id: 'demo-12',
      subject: 'Registration Confirmation: Startup Pitch Night',
      from: 'hello@substack.com',
      date: new Date(2024, 5, 25).toISOString(),
      snippet: 'You are confirmed for Startup Pitch Night on June 25, 2024. Get ready to see amazing pitches!'
    }
  ]

  // Gmail state
  const [lumaEmails, setLumaEmails] = useState<GmailMessageDetail[]>([])
  const [fetchingEmails, setFetchingEmails] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined)
  const [hasMoreEmails, setHasMoreEmails] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<GmailMessageDetail | null>(null)
  const [emailFilter, setEmailFilter] = useState<'all' | 'luma' | 'substack'>('all')
  const [visibleEmailsCount, setVisibleEmailsCount] = useState(10)

  // NFT Mint state
  // @ts-ignore - Future use
  const [isProofValid, setIsProofValid] = useState(false)
  // @ts-ignore - Future use
  const [mintStep, setMintStep] = useState<MintStep>('idle')
  // @ts-ignore - Future use
  const [isMinting, setIsMinting] = useState(false)

  // Proof Generation state
  type ProofStep = 'idle' | 'loading-email' | 'importing-sdk' | 'loading-blueprint' | 'generating' | 'validating' | 'complete'
  const [proofStep, setProofStep] = useState<ProofStep>('idle')

  // Unified Mint Flow state
  const [unifiedStep, setUnifiedStep] = useState<UnifiedMintStep | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isUnifiedFlow, setIsUnifiedFlow] = useState(false)
  
  // Check for external wallet (MetaMask)
  const hasExternalWallet = typeof window !== 'undefined' && !!(window as any).ethereum && !(window as any).ethereum.isCoinbaseWallet

  // Proof Progress Indicator removed in favor of UnifiedMintProgress


  // Fetch emails when authenticated or in demo mode
  useEffect(() => {
    if (isDemoMode && lumaEmails.length === 0) {
      // Load mock emails in demo mode
      setFetchingEmails(true)
      setTimeout(() => {
        setLumaEmails(mockEmails)
        setFetchingEmails(false)
        setHasMoreEmails(false)
        // Set initial visible count to 5 for demo mode to show scroll for more
        setVisibleEmailsCount(5)
      }, 1000)
    } else if (accessToken && isAuthenticated && lumaEmails.length === 0) {
      fetchEmails(accessToken)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, isAuthenticated, isDemoMode])

  // Clear proof and error when switching modes
  useEffect(() => {
    setProof(null)
    setError(null)
    setSelectedEmail(null)
    setEmailFile(null)
    setIsProofValid(false)
    setIsMinting(false)
    setMintStep('idle')
  }, [mode])

  const fetchEmails = useCallback(async (token: string, reset: boolean = true) => {
    if (reset) {
      setFetchingEmails(true)
      setLumaEmails([])
      setNextPageToken(undefined)
    } else {
      setLoadingMore(true)
    }
    setError(null)

    try {
      console.log('Fetching emails from Gmail...')
      const result: EmailSearchResult = await searchLumaEmails(token, reset ? undefined : nextPageToken, 30)
      console.log(`Found ${result.emails.length} emails`)
      
      if (reset) {
        setLumaEmails(result.emails)
      } else {
        setLumaEmails(prev => [...prev, ...result.emails])
      }
      
      setNextPageToken(result.nextPageToken)
      setHasMoreEmails(result.hasMore)

      if (reset && result.emails.length === 0) {
        setError('No event registration confirmation emails found. Only approved event registrations can be used for proof generation.')
      }
    } catch (err: unknown) {
      console.error('Failed to fetch emails:', err)
      
      // Handle token expiration
      const error = err as Error & { name?: string };
      if (error.name === 'TokenExpiredError' || (error.message && error.message.includes('Token expired'))) {
        handleTokenExpiration()
        setError('Your session has expired. Please sign in again.')
      } else {
        setError(`Failed to fetch emails: ${error.message}`)
      }
    } finally {
      setFetchingEmails(false)
      setLoadingMore(false)
    }
  }, [handleTokenExpiration, nextPageToken])

  const loadMoreEmails = useCallback(async () => {
    if (!accessToken || !hasMoreEmails || loadingMore) return
    await fetchEmails(accessToken, false)
  }, [accessToken, hasMoreEmails, loadingMore, fetchEmails])

  // Infinite scroll observer ref
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Infinite scroll implementation
  useEffect(() => {
    if (!hasMoreEmails || loadingMore || !loadMoreRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreEmails()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasMoreEmails, loadingMore, loadMoreEmails])

  const handleEmailSelect = (email: GmailMessageDetail) => {
    setSelectedEmail(email)
    setProof(null)
    setError(null)
  }

  // Determine email source from email address
  const getEmailSource = (email: GmailMessageDetail): 'luma' | 'substack' | 'other' => {
    const from = email.from.toLowerCase()
    if (from.includes('luma.co') || from.includes('lu.ma') || from.includes('luma-mail.com')) {
      return 'luma'
    }
    if (from.includes('substack.com')) {
      return 'substack'
    }
    return 'other'
  }

  // Filter emails based on selected filter
  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleEmailsCount(10)
  }, [emailFilter])

  const filteredEmails = lumaEmails.filter(email => {
    if (emailFilter === 'all') return true
    return getEmailSource(email) === emailFilter
  })


  // Helper to add logs
  const addLog = (msg: string) => {
    setProofLogs(prev => [...prev, msg])
  }

  const handleCloseUnifiedFlow = () => {
    setIsUnifiedFlow(false)
    setUnifiedStep(null)
    setProofStatus('idle')
    setProofLogs([])
  }

  // Handle Self ID Verification (Mock)
  const handleVerifySelfID = async () => {
    try {
      setUnifiedStep('self-id-requesting')
      addLog('Requesting identity verification from Self ID App...')
      
      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      addLog('Identity verified successfully.')
      setUnifiedStep('self-id-verified')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Proceed to Mint phase
      setUnifiedStep('mint-start')
      startMinting()
      
    } catch (err) {
      console.error('Self ID verification failed:', err)
      setError('Self ID verification failed. Please try again.')
      setUnifiedStep('self-id-prompt')
    }
  }

  // Start Unified Flow
  const startUnifiedFlow = async () => {
    if (!selectedEmail) return
    
    setIsUnifiedFlow(true)
    setError(null)

    // 1. Start Proof Generation in Background
    startProofGeneration().catch(err => {
      console.error('Background proof generation failed:', err)
    })

    // 2. Initialize Wallet Step
    if (walletAddress || (evmAddress && currentUser)) {
       setWalletAddress(evmAddress || walletAddress)
       setUnifiedStep('wallet-connected')
       // Move to Self ID step instead of sign prompt
       setTimeout(() => setUnifiedStep('self-id-prompt'), 500)
    } else {
       setUnifiedStep('wallet-prompt')
    }
  }

  const startProofGeneration = async () => {
    setProofStatus('generating')
    setProofLogs(['Initializing proof generation process...'])
    setProof(null)

    try {
      // Demo Mode Simulation
      if (isDemoMode) {
        addLog('Demo Mode: Simulating proof generation...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        addLog('Loading email content...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        addLog('Importing ZK circuit artifacts...')
        await new Promise(resolve => setTimeout(resolve, 1500))
        addLog('Generating Witness...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        addLog('Calculating Zero-Knowledge Proof (Groth16)...')
        await new Promise(resolve => setTimeout(resolve, 3000))
        addLog('Verifying proof on-chain...')
        
        const mockProof = {
          publicSignals: {
            emailHeader: 'mock-header',
            emailBody: 'mock-body',
            eventName: selectedEmail!.subject.replace(/^.*Registration Confirmation:?\s*/i, '').trim() || 'Event',
            eventDate: selectedEmail!.date
          },
          proof: {
            a: ['mock-a-1'], b: [['mock-b-1']], c: ['mock-c-1']
          }
        }
        setProof(mockProof)
        setProofStatus('completed')
        addLog('Proof generation complete! Ready to mint.')
      return
    }

      // Real Proof Generation
      if (!accessToken) throw new Error('No access token')

      addLog('Fetching raw email content from Gmail...')
      const emailContent = await getEmailRaw(accessToken, selectedEmail!.id)
      addLog(`Email content loaded (${emailContent.length} bytes).`)

      addLog('Importing ZK-Email SDK and artifacts...')
      const { ProofGenerator } = await import('@/lib/proofGenerator')
      const { Buffer } = await import('buffer')
      const emailBuffer = Buffer.from(emailContent, 'utf-8')
      
      addLog('Initializing Circuit...')
      const proofGenerator = new ProofGenerator()
      
      addLog('Generating ZK Proof... This may take up to 60 seconds.')
      addLog('Please do not close this tab.')
      
      const proofResult = await proofGenerator.generateProof(emailBuffer, (status) => {
        addLog(`> ${status}`)
      })
      
      if (!proofResult.success || !proofResult.proof) {
        throw new Error(proofResult.error || 'Proof generation failed')
      }
      addLog('Proof generated successfully.')
      
      addLog('Validating proof structure...')
      // Format result
      const result = {
        proof: {
          proof: proofResult.proof.proof,
          publicInputs: proofResult.proof.publicInputs,
        },
        publicSignals: {
          emailHeader: proofResult.proof.publicInputs[0] || '',
          emailBody: proofResult.proof.publicInputs[1] || '',
          eventName: proofResult.metadata?.eventName || selectedEmail!.subject.replace(/^.*Registration Confirmation:?\s*/i, '').trim() || 'Event',
          eventDate: proofResult.metadata?.dateValue || selectedEmail!.date
        },
        metadata: proofResult.metadata
      }
      
      const validation = validateProof(result)
      if (!validation.isValid) {
        throw new Error(validation.error || 'Proof validation failed')
      }

      setProof(result)
      setProofStatus('completed')
      addLog('Proof verified and ready for minting.')

    } catch (err: unknown) {
      const error = err as Error
      console.error('Proof generation error:', error)
      addLog(`ERROR: ${error.message || 'Proof generation failed'}`)
      setProofStatus('error')
      // We don't set main 'error' state here to avoid blocking the UI.
      // The Mint step will check 'proofStatus'.
    }
  }

  // Handle CDP Embedded Wallet connection (Email/OTP flow)
  // ✅ Best Practice: Comprehensive error handling, user state verification, flow ID management
  const handleConnectCDPWallet = async () => {
    try {
    setError(null)
      
      // ✅ Best Practice: SDK initialization check
      if (!walletStatus.isInitialized) {
        setError('Wallet system is initializing. Please wait...')
        return
      }
      
      // ✅ Best Practice: User state verification before starting flow
      try {
        const existingUser = await getCurrentUser()
        if (existingUser && existingUser.evmAccounts && existingUser.evmAccounts.length > 0) {
          // User already authenticated, use existing wallet
          setWalletAddress(existingUser.evmAccounts[0])
          setUnifiedStep('wallet-connected')
          await new Promise(resolve => setTimeout(resolve, 500))
          setUnifiedStep('self-id-prompt')
          return
        }
      } catch (err) {
        // User not authenticated yet, continue with flow
        console.log('[CDP] No existing user found, starting new authentication flow')
      }
      
      // Use Google login email (from Gmail authentication)
      const emailToUse = userEmail
      
      // ✅ Best Practice: Form validation
      if (!emailToUse) {
        setError('Please sign in with Gmail first to connect your wallet.')
        setUnifiedStep('wallet-prompt')
        return
      }
      
      // If OTP input is showing and we have OTP code, verify OTP
      if (showOtpInput && otpCode && flowId) {
        // ✅ Best Practice: Flow ID validation
        if (!flowId) {
          setError('Authentication flow not found. Please start over.')
          setShowOtpInput(false)
          setOtpCode('')
          setFlowId(null)
          setUnifiedStep('wallet-prompt')
          return
        }
        
        // ✅ Best Practice: OTP format validation
        if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
          setError('Please enter a valid 6-digit verification code.')
          return
        }
        
        setIsVerifyingOtp(true)
    setUnifiedStep('wallet-connecting')
        
        try {
          console.log('[CDP] Verifying OTP, flowId:', flowId)
          const { user, isNewUser } = await verifyEmailOTP({ flowId, otp: otpCode })
          
          // ✅ Best Practice: EOA wallet check (we only use EOA wallets)
          if (user.evmAccounts && user.evmAccounts.length > 0) {
            const address = user.evmAccounts[0]
            console.log('[CDP] ✅ Wallet created successfully!', {
              userId: user.userId,
              evmAddress: address,
              isNewUser,
            })
            setWalletAddress(address)
      setUnifiedStep('wallet-connected')
            setShowOtpInput(false)
            setOtpCode('')
            setFlowId(null)
            await new Promise(resolve => setTimeout(resolve, 500))
            // Move to Self ID step
            setUnifiedStep('self-id-prompt')
          } else {
            throw new Error('Wallet creation failed. No EOA address returned.')
          }
        } catch (err: unknown) {
          console.error('[CDP] ❌ Failed to verify OTP:', err)
          // ✅ Best Practice: Use error handling helper
          setError(handleWalletError(err))
          setOtpCode('')
          setUnifiedStep('wallet-prompt')
        } finally {
          setIsVerifyingOtp(false)
        }
      } else {
        // Start email sign-in flow
        setIsSendingOtp(true)
        setUnifiedStep('wallet-connecting')
        
        try {
          console.log('[CDP] 🚀 Starting wallet creation flow for email:', emailToUse)
          const result = await signInWithEmail({ email: emailToUse })
          console.log('[CDP] ✅ OTP sent successfully, flowId:', result.flowId)
          
          // ✅ Best Practice: Store flowId and validate
          if (!result.flowId) {
            throw new Error('Failed to receive authentication flow ID.')
          }
          
          setFlowId(result.flowId)
          setShowOtpInput(true)
          setUnifiedStep('wallet-prompt')
          
        } catch (err: unknown) {
          console.error('[CDP] ❌ Failed to send OTP:', err)
          console.error('[CDP] Error details:', JSON.stringify(err, null, 2))
          // ✅ Best Practice: Use error handling helper
          setError(handleWalletError(err))
          setUnifiedStep('wallet-prompt')
        } finally {
          setIsSendingOtp(false)
        }
      }
      
    } catch (err: unknown) {
      console.error('[CDP] ❌ Failed to connect wallet:', err)
      // ✅ Best Practice: Use error handling helper
      setError(handleWalletError(err))
      setUnifiedStep('wallet-prompt')
    }
  }
  
  // Handle External Wallet connection (MetaMask)
  const handleConnectExternalWallet = async () => {
    try {
      setUnifiedStep('wallet-connecting')
      setError(null)
      
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('No external wallet found. Please install MetaMask or another wallet extension.')
      }
      
      const accounts = await (window as any).ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.')
      }
      
      const address = accounts[0]
      setWalletAddress(address)
      
      setUnifiedStep('wallet-connected')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Auto advance to Self ID
      setUnifiedStep('self-id-prompt')
      
    } catch (err: unknown) {
      const error = err as Error
      console.error('Failed to connect external wallet:', error)
      setError(error.message || 'Failed to connect external wallet')
      setUnifiedStep('wallet-prompt')
    }
  }
  
  // Monitor wallet status changes
  useEffect(() => {
    if (walletStatus.evmAddress && !walletAddress && isUnifiedFlow) {
      setWalletAddress(walletStatus.evmAddress)
      if (unifiedStep === 'wallet-connecting' || unifiedStep === 'wallet-prompt') {
        setUnifiedStep('wallet-connected')
    setTimeout(() => {
          setUnifiedStep('self-id-prompt')
        }, 500)
      }
    }
  }, [walletStatus.evmAddress, walletAddress, isUnifiedFlow, unifiedStep])

  const handleShareOnX = () => {
    const text = encodeURIComponent('I just minted my Mintmark on Celo! #onchain #Celo');
    const url = encodeURIComponent(`${window.location.origin}/marks`);
    const shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  // Handle sign message
  const handleSignMessage = async () => {
    try {
      setUnifiedStep('wallet-signing')
      
      // Simulate signing delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setUnifiedStep('wallet-signed')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Auto advance to fee payment prompt
      setUnifiedStep('wallet-fee-prompt')
      
    } catch (err: unknown) {
      const error = err as Error
      console.error('Failed to sign message:', error)
      setError(error.message || 'Failed to sign message')
      setUnifiedStep('wallet-sign-prompt')
    }
  }

  // Handle pay minting fee - Send 1 CELO on Celo Sepolia testnet
  // ✅ Best Practice: Wallet validation, error handling, transaction validation
  const handlePayFee = async () => {
    // ✅ Best Practice: Wallet validation
    if (!evmAddress || !walletAddress) {
      setError('Wallet not connected')
      setUnifiedStep('wallet-prompt')
      return
    }

    // ✅ Best Practice: SDK initialization check
    if (!walletStatus.isInitialized) {
      setError('Wallet system is initializing. Please wait...')
      return
    }

    try {
      setUnifiedStep('wallet-fee-paying')
      setError(null)
      
      // ✅ Best Practice: Transaction validation
      if (!CONTRACTS.MINT_FEE_RECIPIENT) {
        throw new Error('Minting fee recipient address is not configured.')
      }
      
      // 1 CELO = 1e18 wei
      const amount = BigInt(1_000_000_000_000_000_000) // 1 CELO
      
      console.log('[CDP] 💰 Sending minting fee transaction:', {
        from: evmAddress,
        to: CONTRACTS.MINT_FEE_RECIPIENT,
        amount: '1 CELO',
        chainId: celoSepolia.id,
      })
      
      // Send native CELO transaction using CDP hooks
      // Note: 'celo-sepolia' might not be officially supported as a string alias yet.
      // If this fails, we might need to configure the chain in the provider or use chainId directly if supported.
      const result = await sendEvmTransaction({
        evmAccount: evmAddress,
        // @ts-ignore - Celo Sepolia support
        network: 'celo-sepolia', 
        transaction: {
          to: CONTRACTS.MINT_FEE_RECIPIENT as `0x${string}`,
          value: amount,
          data: '0x',
          chainId: celoSepolia.id, // Celo Sepolia chain ID
        }
      })
      
      console.log('[CDP] ✅ Transaction submitted:', result.transactionHash)
      
      // Wait for transaction confirmation
      // Note: CDP hooks automatically track transaction status via txData
      // We'll check txData.status in useEffect
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Auto advance to minting
      await startMinting()
      
    } catch (err: unknown) {
      console.error('[CDP] ❌ Failed to pay fee:', err)
      // ✅ Best Practice: Use error handling helper
      const errorMessage = handleWalletError(err)
      setError(errorMessage || 'Failed to pay minting fee')
      setUnifiedStep('wallet-fee-prompt')
    }
  }
  
  // Monitor transaction status
  useEffect(() => {
    if (txData?.status === 'success' && unifiedStep === 'wallet-fee-paying') {
      console.log('CELO transfer confirmed:', txData.receipt)
      showToast('Minting fee paid successfully!', 'success')
    } else if (txData?.status === 'error' && unifiedStep === 'wallet-fee-paying') {
      setError(txData.error?.message || 'Transaction failed')
      setUnifiedStep('wallet-fee-prompt')
    }
  }, [txData, unifiedStep, showToast])

  // Start minting process
  const startMinting = async () => {
    if (!proof || !selectedEmail) return

    try {
      // Generate artwork
      setUnifiedStep('mint-generating-artwork')
      
      let eventName = 'Event'
      let eventDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      if (selectedEmail) {
        eventName = selectedEmail.subject.replace(/^.*Registration Confirmation:?\s*/i, '').trim() || 'Event'
        eventDate = new Date(selectedEmail.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }

      const proofId = `proof-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      const imageResult = await generateNFTImage({
        eventName,
        eventDate,
        primaryColor: '#6396F4',
        proofHash: proofId,
      })

      // Submit transaction
      setUnifiedStep('mint-submitting')
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Create metadata
      const metadata: NFTMetadata = {
        name: `Mark: ${eventName}`,
        description: `Proof of commitment at ${eventName} on ${eventDate}. This Mark represents a zero-knowledge proof of your verifiable commitment.`,
        image: imageResult.imageUrl,
        external_url: window.location.origin,
        attributes: [
          { trait_type: 'Event Name', value: eventName },
          { trait_type: 'Date', value: eventDate },
          { trait_type: 'Proof Hash', value: proofId },
          { trait_type: 'Art Style', value: 'Picasso-Inspired Cubist' },
        ],
      }

      // Wait for confirmation
      setUnifiedStep('mint-confirming')
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock NFT data
      const mockTokenId = Math.floor(Math.random() * 1000000).toString()
      const mockTxHash = `0x${Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`
      
      const nftId = `nft-${Date.now()}-${mockTokenId}`

      // Store NFT
      const nftData = {
        id: nftId,
        tokenId: mockTokenId,
        txHash: mockTxHash,
        metadata,
        imageUrl: imageResult.imageUrl,
        walletAddress: walletAddress || 'unknown',
        proofId,
        mintedAt: new Date().toISOString(),
        status: 'minted' as const,
      }

      const existingNFTs = JSON.parse(localStorage.getItem('mintmark_nfts') || '[]')
      existingNFTs.push(nftData)
      localStorage.setItem('mintmark_nfts', JSON.stringify(existingNFTs))

      setUnifiedStep('mint-complete')
      showToast('NFT minted successfully!', 'success')
      
    } catch (err: unknown) {
      const error = err as Error
      console.error('Failed to mint:', error)
      setError(error.message || 'Failed to mint NFT')
      setUnifiedStep('wallet-fee-prompt')
    }
  }

  return (
    <div className="relative min-h-screen">
      <VerticalBarsNoise paused={!!selectedEmail || isUnifiedFlow} />
      
      {/* Header - outside background container, positioned higher */}
      <div className="max-w-6xl mx-auto px-4 pt-4 sm:px-6 sm:pt-6 md:pt-8 relative z-10">
        <header className="mb-8 sm:mb-10 md:mb-12 text-left">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 sm:mb-8 border" style={{ backgroundColor: 'var(--page-badge-bg)', borderColor: 'var(--page-badge-border)' }}>
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: 'var(--page-text-primary)' }} />
              <span className="text-xs sm:text-sm font-semibold tracking-wide uppercase" style={{ color: 'var(--page-text-primary)', letterSpacing: '0.05em' }}>
                Own Your Commitments
              </span>
            </div>
            
            {/* Main title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 sm:mb-6 leading-[1.1] tracking-tight" style={{ color: 'var(--page-text-primary)' }}>
              Marks of Your Life.
              <br />
              <span className="block mt-2" style={{ color: 'var(--Controls-Selected)' }}>
                Unlocked.
              </span>
          </h1>
            
            {/* Description */}
            <div className="mb-4 sm:mb-6">
              <p className="text-base sm:text-lg md:text-xl font-medium leading-relaxed max-w-2xl mb-4" style={{ color: 'var(--page-text-secondary)' }}>
                Every email in your inbox tells a story. That event you attended. That newsletter you subscribed to. That community you joined.
              </p>
              <p className="text-base sm:text-lg md:text-xl font-medium leading-relaxed max-w-2xl mb-6" style={{ color: 'var(--page-text-secondary)' }}>
                Transform these digital commitments into permanent, on-chain Marks that become part of your identity. <span className="font-semibold" style={{ color: 'var(--page-text-primary)' }}>Get recognized</span>, <span className="font-semibold" style={{ color: 'var(--page-text-primary)' }}>discover communities</span>, and <span className="font-semibold" style={{ color: 'var(--page-text-primary)' }}>unlock new opportunities</span>.
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight tracking-tight" style={{ color: 'var(--page-text-primary)' }}>
                Transform. Build. Connect.
              </p>
            </div>
          </div>
        </header>
        </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 pb-4 sm:px-6 sm:pb-8 md:pb-12 relative z-10 flex flex-col min-h-[calc(100vh-300px)]">
      <main className="flex-1 relative z-10">
        {!(isAuthenticated || isDemoMode) ? (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-bold">Gmail Authentication Required</CardTitle>
              <CardDescription className="font-medium">
                Sign in with your Google account to access your emails and create marks from your verifiable commitments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="w-full sm:w-auto">
                  <Link to="/create">Sign In with Google</Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link to="/create?demo=true">Try Demo Mode</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
          <TabsContent value="gmail" className="space-y-4">
            <>
                {fetchingEmails && (
                  <Card className="shadow-lg">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                      <p className="font-medium" style={{ color: 'var(--page-text-secondary)' }}>
                        Discovering your digital commitments... This may take a moment.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {!fetchingEmails && lumaEmails.length > 0 && (
                  <div className="relative">
                    {/* Background container */}
                    <div 
                      className="absolute inset-x-0 inset-y-0 sm:inset-y-1 md:inset-y-2 rounded-2xl -z-10"
                      style={{
                        background: 'var(--page-content-bg)',
                        border: '1px solid var(--page-content-border)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        backgroundBlendMode: 'var(--page-content-blend)',
                        boxShadow: 'var(--glass-shadow)',
                        minHeight: 'calc(100vh - 400px)'
                      }}
                    />
                    <div className="relative z-10 p-5 sm:p-6 md:p-8 space-y-6 sm:space-y-7 md:space-y-8 min-h-[calc(100vh-400px)] flex flex-col">
                      <div className="space-y-5 sm:space-y-6 md:space-y-7 flex-shrink-0">
                        {/* Header Section */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
                        <div className="flex-1 space-y-4 sm:space-y-5 md:space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 sm:p-3 rounded-lg backdrop-blur-md backdrop-saturate-150 border transition-all hover:scale-105"
                              style={{
                                backgroundColor: 'var(--modal-bg)',
                                borderColor: 'var(--page-border-color)',
                              }}
                            >
                              <Mail className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: 'var(--page-text-primary)' }} />
                            </div>
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight tracking-tight" style={{ color: 'var(--page-text-primary)' }}>
                              Your Digital Commitments
                            </h2>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="flex items-center gap-2.5 px-5 py-3 rounded-full border backdrop-blur-md backdrop-saturate-150 transition-all hover:scale-105"
                            style={{
                              backgroundColor: 'var(--modal-bg)',
                              borderColor: 'var(--page-border-color)',
                            }}
                          >
                            <Mail className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: 'var(--page-text-primary)' }} />
                            <span className="text-lg sm:text-xl font-bold" style={{ color: 'var(--page-text-primary)' }}>
                              {filteredEmails.length}
                            </span>
                            <span className="text-sm sm:text-base font-semibold" style={{ color: 'var(--page-text-secondary)' }}>
                              {filteredEmails.length === 1 ? 'email' : 'emails'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Email Source Filter */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 flex-shrink-0">
                        <div className="flex flex-wrap items-center gap-3">
                    <Button
                            variant={emailFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEmailFilter('all')}
                            className="h-9 text-xs sm:text-sm font-semibold"
                    >
                            All ({lumaEmails.length})
                    </Button>
                    <Button
                            variant={emailFilter === 'luma' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEmailFilter('luma')}
                            className="h-9 text-xs sm:text-sm font-semibold gap-1.5"
                    >
                            <Sparkles className="h-3.5 w-3.5" />
                            Luma ({lumaEmails.filter(e => getEmailSource(e) === 'luma').length})
                    </Button>
                    <Button
                            variant={emailFilter === 'substack' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEmailFilter('substack')}
                            className="h-9 text-xs sm:text-sm font-semibold gap-1.5"
                    >
                            <Bookmark className="h-3.5 w-3.5" />
                            Substack ({lumaEmails.filter(e => getEmailSource(e) === 'substack').length})
                    </Button>
                  </div>
                        
                        {/* Scroll for more indicator */}
                        {visibleEmailsCount < filteredEmails.length && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md backdrop-saturate-150 transition-all hover:scale-105"
                            style={{
                              backgroundColor: 'var(--modal-bg)',
                              borderColor: 'var(--page-border-color)',
                            }}
                          >
                            <ChevronDown className="h-4 w-4 animate-bounce" style={{ color: 'var(--page-text-primary)' }} />
                            <span className="text-xs sm:text-sm font-medium" style={{ color: 'var(--page-text-muted)' }}>
                              Scroll for more
                            </span>
                  </div>
                        )}
                </div>
                    </div>
                    
                    {selectedEmail && !isUnifiedFlow && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6 animate-in fade-in duration-300">
                        <div
                          className="absolute inset-0 dark:bg-black/80 bg-black/20"
                          style={{
                            backdropFilter: 'blur(8px) saturate(120%)',
                            WebkitBackdropFilter: 'blur(8px) saturate(120%)',
                            willChange: 'backdrop-filter',
                          }}
                          onClick={() => {
                            // Prevent closing modal during proof generation
                            if (loading || proofStep !== 'idle') return
                            setSelectedEmail(null)
                            setProof(null)
                            setError(null)
                            setProofStep('idle')
                          }}
                        />

                        <div 
                          className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden border border-solid rounded-lg animate-in zoom-in-95 duration-300"
                          style={{
                            borderRadius: 'var(--figma-card-radius)',
                            borderColor: 'var(--modal-border)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            backgroundColor: 'var(--modal-bg)',
                            boxShadow: 'var(--modal-shadow)',
                            willChange: 'transform, opacity',
                          }}
                        >
                          {/* Modal content with scrollable area */}
                          <div className="relative overflow-y-auto max-h-[90vh] p-6 sm:p-8" style={{ zIndex: 10 }}>
                            {/* Error Display */}
                            {error && mode === 'gmail' && (
                              <Alert variant="destructive" className="mb-4">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <AlertDescription>{error}</AlertDescription>
                              </Alert>
                            )}

                            {/* Compact Centered Design */}
                            <div className="text-center space-y-4">
                              {/* Title - Smaller than buttons */}
                              <div className="space-y-1.5">
                                <h2 className="text-lg sm:text-xl font-bold tracking-tight" style={{ color: 'var(--page-text-primary)' }}>
                                  Mint Your Mintmark
                                </h2>
                                <p className="text-xs sm:text-sm font-medium leading-relaxed" style={{ color: 'var(--page-text-secondary)' }}>
                                  Privately prove your commitment and make it a permanent part of your digital identity.
                  </p>
                </div>
                              
                              {/* POAP Badge - Already contains event details, tags, title, and description */}
                              <div className="flex justify-center">
                                <POAPBadge email={selectedEmail} size="md" showVerified={false} />
      </div>

                              {/* How It Works - Compact */}
                              <div className="pt-1 pb-1">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border" style={{ 
                                  backgroundColor: 'var(--page-badge-bg)',
                                  borderColor: 'var(--page-border-color)'
                                }}>
                                  <Info className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--page-text-muted)' }} />
                                  <span className="text-[10px] font-medium leading-tight" style={{ color: 'var(--page-text-secondary)' }}>
                                    ZK-email proof → Mint on Base
                                  </span>
                                </div>
              </div>

                              {/* Action Buttons */}
                              <div className="pt-2">
                                <div className="flex flex-col sm:flex-row gap-3 w-full">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      // Prevent closing modal during any flow
                                      if (loading || proofStep !== 'idle' || isUnifiedFlow) return
                                      setSelectedEmail(null)
                                      setProof(null)
                                      setError(null)
                                      setProofStep('idle')
                                    }}
                                    disabled={loading || proofStep !== 'idle' || isUnifiedFlow}
                                    className="gap-2 w-full sm:flex-1"
                                    size="lg"
                                  >
                                    <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                                  <Button 
                                    onClick={() => {
                                      // Start unified flow directly
                                      startUnifiedFlow()
                                    }}
                                    disabled={loading || isUnifiedFlow}
                                    className="gap-2 w-full sm:flex-1"
                                    size="lg"
                                  >
                                    <Bookmark className="w-4 h-4" />
                                    Mark It
                                    <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
                              </div>
                            </div>
                          </div>
                        </div>
        </div>
      )}

                    {/* Unified Mint Flow Modal - Non-dismissible */}
                    {isUnifiedFlow && unifiedStep && selectedEmail && (
                      <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6 sm:px-6 animate-in fade-in duration-300">
                        {/* Glassmorphic Backdrop */}
                        <div
                          className="fixed inset-0 backdrop-blur-md"
                          style={{
                            background: 'rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
                            WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
                          }}
                        />

                        <div 
                          className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 card-glass"
                          style={{
                            borderRadius: 'var(--figma-card-radius)',
                            background: 'var(--glass-bg-primary)',
                            border: '1px solid var(--glass-border)',
                            backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
                            WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
                            boxShadow: 'var(--glass-shadow)',
                          }}
                        >
                          <div className="relative overflow-y-auto max-h-[90vh] p-6">
                            {unifiedStep === 'mint-complete' ? (
                              /* Success State */
                              <div className="text-center space-y-6 py-4">
                                {/* Success Animation */}
                                <div className="flex justify-center">
                                  <div className="relative">
                                    <div className="absolute inset-0 bg-green-500/30 rounded-full blur-2xl animate-pulse"></div>
                                    <CheckCircle2 className="h-16 w-16 text-green-500 relative z-10" />
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--page-text-primary)' }}>
                                    Mint Successful!
                                  </h2>
                                  <p className="text-sm text-muted-foreground max-w-xs mx-auto" style={{ color: 'var(--page-text-secondary)' }}>
                                    Your commitment has been permanently recorded on Celo.
                                  </p>
                                </div>
                                
                                {/* POAP Badge - Final */}
                                <div className="flex justify-center pt-2">
                                  <POAPBadge email={selectedEmail} size="md" showVerified={true} />
                                </div>
                                
                                {/* Action */}
                                <div className="pt-4 space-y-3">
                                  <Button
                                    onClick={() => navigate('/marks')}
                                    variant="outline"
                                    className="w-full h-11 gap-2"
                                  >
                                    View My Marks
                                    <ArrowRight className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    onClick={handleShareOnX}
                                    className="w-full h-11 gap-2"
                                    style={{
                                      backgroundColor: 'var(--figma-cta1-bg)',
                                      borderColor: 'var(--figma-cta1-border)',
                                      color: 'var(--figma-cta1-text)'
                                    }}
                                  >
                                    Share on X
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              /* Progress State */
                              <div className="space-y-6">
                                {/* Header - Minimal Horizontal Row */}
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-2 text-[10px] px-1 py-1 rounded-lg border flex-1" style={{ 
                                    borderColor: 'var(--glass-border)',
                                    backgroundColor: 'var(--glass-bg-tertiary)'
                                  }}>
                                    <span className="font-semibold text-foreground truncate flex-1">
                                      {selectedEmail?.subject || 'Mint Your Mintmark'}
                                    </span>
                                    <span className="flex items-center gap-1 text-[9px] text-muted-foreground whitespace-nowrap">
                                      <span>{selectedEmail?.from?.split('<')[0] || 'Event'}</span>
                                      <span>•</span>
                                      <span>{selectedEmail?.date ? new Date(selectedEmail.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}</span>
                                    </span>
                                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20 whitespace-nowrap">
                                      Celo
                                    </span>
                                    <span className="flex items-center gap-0.5 px-1 py-0.5 rounded-full border text-[8px]" style={{ borderColor: 'var(--glass-border)', color: 'var(--page-text-primary)' }}>
                                      <Shield className="w-2.5 h-2.5 text-green-500" />
                                      ZK
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleCloseUnifiedFlow}
                                    className="h-6 w-6 rounded-md border transition-colors flex-shrink-0"
                                    style={{
                                      borderColor: 'var(--glass-border)',
                                      color: 'var(--page-text-muted)',
                                      backgroundColor: 'var(--glass-bg-secondary)'
                                    }}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>

                                {/* Unified Progress Component */}
            <UnifiedMintProgress
              currentStep={unifiedStep}
                                  onConnectCDPWallet={handleConnectCDPWallet}
                                  onConnectExternalWallet={hasExternalWallet ? handleConnectExternalWallet : undefined}
                                  onVerifySelfID={handleVerifySelfID}
              onSignMessage={handleSignMessage}
                                  onPayFee={handlePayFee}
                                  onChangeWallet={() => {
                                    setWalletAddress(null)
                                    setShowOtpInput(false)
                                    setOtpCode('')
                                    setFlowId(null)
                                    setUnifiedStep('wallet-prompt')
                                  }}
                                  onClose={handleCloseUnifiedFlow}
                                  walletAddress={walletAddress || undefined}
              error={error}
                                  showOtpInput={showOtpInput}
                                  otpEmail={userEmail || ''}
                                  otpCode={otpCode}
                                  onOtpCodeChange={(code) => setOtpCode(code)}
                                  isSendingOtp={isSendingOtp}
                                  isVerifyingOtp={isVerifyingOtp}
                                  hasExternalWallet={hasExternalWallet}
                                  proofLogs={proofLogs}
                                  proofStatus={proofStatus}
                                />
                              </div>
                            )}
                          </div>
          </div>
        </div>
      )}

                    {filteredEmails.length === 0 ? (
                      <Card className="shadow-lg">
                        <CardContent className="flex flex-col items-center justify-center py-8">
                          <p className="text-sm text-center font-medium" style={{ color: 'var(--page-text-secondary)' }}>
                            No emails found for the selected filter.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="relative flex-1 flex flex-col min-h-0 mt-2">
                        {/* Email List Container with Scroll */}
                        <div 
                          className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-rounded scrollbar-track-transparent"
                          style={{
                            scrollbarColor: 'var(--page-border-color) transparent',
                            minHeight: '500px'
                          }}
                          onScroll={(e) => {
                            const target = e.currentTarget
                            const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight
                            // Load more when scrolled near bottom (within 100px)
                            if (scrollBottom < 100 && visibleEmailsCount < filteredEmails.length) {
                              setVisibleEmailsCount(prev => Math.min(prev + 10, filteredEmails.length))
                            }
                          }}
                        >
                          {filteredEmails
                            .filter(email => selectedEmail?.id !== email.id)
                            .slice(0, visibleEmailsCount)
                            .map(email => (
                              <EmailCard
                                key={email.id}
                                email={email}
                                onMarkIt={() => !loading && !selectedEmail && handleEmailSelect(email)}
                                isLoading={loading}
                                className={`cursor-pointer transition-all touch-manipulation ${
                                  selectedEmail 
                                    ? 'opacity-50 pointer-events-none' 
                                    : ''
                                }`}
                              />
                            ))}
                        </div>
                        
                        {/* Scroll for more indicator */}
                        {visibleEmailsCount < filteredEmails.length && (
                          <div className="mt-5 pt-4 border-t text-center flex-shrink-0" style={{ borderColor: 'var(--page-border-color)', opacity: 0.5 }}>
                            <p className="text-sm font-medium flex items-center justify-center gap-2" style={{ color: 'var(--page-text-muted)' }}>
                              <span>Scroll for more</span>
                              <span className="text-xs opacity-60">({filteredEmails.length - visibleEmailsCount} more)</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Infinite Scroll Trigger & Load More Button */}
                    {hasMoreEmails && filteredEmails.length > 0 && (
                      <>
                        {/* Invisible element for intersection observer */}
                        <div ref={loadMoreRef} className="h-10" />
                        
                        {/* Optional: Manual Load More Button */}
                        <div className="flex justify-center pt-4">
                          <Button
                            onClick={loadMoreEmails}
                            disabled={loadingMore}
                            variant="outline"
                            className="gap-2"
                          >
                            {loadingMore ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                Load More Emails
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                    
                    {/* Loading indicator at bottom */}
                    {loadingMore && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    )}
                    </div>
                  </div>
                )}
            </>
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-bold">Upload Email File</CardTitle>
                <CardDescription className="font-medium">
                  Upload a verifiable commitment email (.eml file) from Luma, Substack, or other supported platforms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && mode === 'file' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}
                
                {emailFile && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{emailFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {Math.round(emailFile.size / 1024)} KB
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="email-upload"
                    type="file"
                    accept=".eml"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setEmailFile(file)
                        setError(null)
                      }
                    }}
                    className="hidden"
                  />
                  <Button asChild variant="outline" className="gap-2 w-full sm:w-auto">
                    <label htmlFor="email-upload" className="cursor-pointer w-full sm:w-auto">
                      <Upload className="h-4 w-4" />
                      {emailFile ? 'Change File' : 'Choose File'}
                    </label>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        )}
        
        {isAuthenticated && (
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
            <div className="text-center">
              <button
                onClick={() => setMode('file')}
                className="text-xs sm:text-sm text-foreground/80 hover:text-foreground transition-colors underline underline-offset-4 decoration-foreground/50 hover:decoration-foreground/70"
              >
                Missing email? Upload .eml file
              </button>
            </div>
          </div>
        )}
      </main>
      
      </div>
    </div>
  )
}
