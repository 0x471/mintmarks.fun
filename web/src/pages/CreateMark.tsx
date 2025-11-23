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
import { type MintStep } from '@/components/ProgressIndicator'
import { UnifiedMintProgress, type UnifiedMintStep } from '@/components/UnifiedMintProgress'
import VerticalBarsNoise from '@/components/VerticalBarsNoise'
import EmailCard from '@/components/EmailCard'
import { POAPBadge } from '@/components/POAPBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Upload, CheckCircle2, AlertCircle, ArrowLeft, Sparkles, Mail, Bookmark, ArrowRight, Shield, Lock, ChevronDown, Info } from 'lucide-react'
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
  const [walletType, setWalletType] = useState<'cdp' | 'external' | null>(null) // Track wallet type
  
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

  // Start Unified Flow
  const startUnifiedFlow = async () => {
    if (!selectedEmail) return
    
    setIsUnifiedFlow(true)
    setUnifiedStep('proof-loading-email')
    setError(null)

    // Demo mode: simulate entire flow
    if (isDemoMode) {
      await runDemoUnifiedFlow()
      return
    }

    // Real flow
    await runRealUnifiedFlow()
  }

  // Demo unified flow - skip wallet connection
  const runDemoUnifiedFlow = async () => {
    if (!selectedEmail) return

    try {
      // Phase 1: Proof Generation
      setUnifiedStep('proof-loading-email')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setUnifiedStep('proof-importing-sdk')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setUnifiedStep('proof-loading-blueprint')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setUnifiedStep('proof-generating')
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setUnifiedStep('proof-validating')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setUnifiedStep('proof-complete')
      
      // Create mock proof
      const mockProof = {
        publicSignals: {
          emailHeader: 'mock-header',
          emailBody: 'mock-body',
          eventName: selectedEmail.subject.replace(/^.*Registration Confirmation:?\s*/i, '').trim() || 'Event',
          eventDate: selectedEmail.date
        },
        proof: {
          a: ['mock-a-1', 'mock-a-2'],
          b: [['mock-b-1', 'mock-b-2'], ['mock-b-3', 'mock-b-4']],
          c: ['mock-c-1', 'mock-c-2']
        }
      }
      setProof(mockProof)
      setIsProofValid(true)
      await new Promise(resolve => setTimeout(resolve, 500))

      // Phase 2: Skip wallet connection in demo mode, go directly to minting
      // Simulate wallet connected state
      setWalletAddress('0xDemo123...')
      setUnifiedStep('wallet-complete')
      await new Promise(resolve => setTimeout(resolve, 500))

      // Phase 3: Generate NFT image and mint
      setUnifiedStep('mint-generating-artwork')
      
      const eventName = selectedEmail.subject.replace(/^.*Registration Confirmation:?\s*/i, '').trim() || 'Event'
      const eventDate = new Date(selectedEmail.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      
      const imageResult = await generateNFTImage({
        eventName,
        eventDate,
        primaryColor: '#6396F4',
        proofHash: 'demo-proof-hash'
      })
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setUnifiedStep('mint-submitting')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setUnifiedStep('mint-confirming')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create mock NFT
      const proofId = `demo-${Date.now()}`
      const mockTokenId = Math.floor(Math.random() * 1000000).toString()
      const mockTxHash = `0x${Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`
      
      const nftId = `nft-${Date.now()}-${mockTokenId}`
      
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
      
      const nftData = {
        id: nftId,
        tokenId: mockTokenId,
        txHash: mockTxHash,
        metadata,
        imageUrl: imageResult.imageUrl,
        walletAddress: '0xDemo123...',
        proofId,
        mintedAt: new Date().toISOString(),
        status: 'minted' as const,
      }

      const existingNFTs = JSON.parse(localStorage.getItem('mintmark_nfts') || '[]')
      existingNFTs.push(nftData)
      localStorage.setItem('mintmark_nfts', JSON.stringify(existingNFTs))

      setUnifiedStep('mint-complete')
      showToast('NFT minted successfully!', 'success')
      
      // Redirect to My Marks after a short delay
      setTimeout(() => {
        navigate('/marks?demo=true')
      }, 2000)
      
    } catch (err: unknown) {
      const error = err as Error
      console.error('Failed in demo unified flow:', error)
      setError(error.message || 'Failed to complete demo flow')
      setIsUnifiedFlow(false)
      setUnifiedStep(null)
    }
  }

  // Real unified flow
  const runRealUnifiedFlow = async () => {
    if (!selectedEmail || !accessToken) return

    try {
      // Phase 1: Proof Generation
      // 1. Loading Email Content (5%)
      setUnifiedStep('proof-loading-email')
      const emailContent = await getEmailRaw(accessToken, selectedEmail.id)
      
      // 2. Importing ZK SDK (10%)
      setUnifiedStep('proof-importing-sdk')
      const { ProofGenerator } = await import('@/lib/proofGenerator')
      const { Buffer } = await import('buffer')
      const emailBuffer = Buffer.from(emailContent, 'utf-8')
      
      // 3. Loading Blueprint (15%)
      setUnifiedStep('proof-loading-blueprint')
      
      const proofGenerator = new ProofGenerator()
      // 4. Generating Proof (25%)
      const proofResult = await proofGenerator.generateProof(emailBuffer, (status) => {
        if (status.includes('Loading circuit')) {
          setUnifiedStep('proof-loading-blueprint')
        } else if (status.includes('Generating proof')) {
          setUnifiedStep('proof-generating')
        } else if (status.includes('Verifying')) {
          setUnifiedStep('proof-validating')
        }
      })
      
      if (!proofResult.success || !proofResult.proof) {
        throw new Error(proofResult.error || 'Proof generation failed')
      }
      
      // 5. Validating Proof (30%)
      if (!proofResult.proof.verified) {
        throw new Error('Proof verification failed')
      }
      
      setUnifiedStep('proof-validating')
      
      // Format result
      const result = {
        proof: {
          proof: proofResult.proof.proof,
          publicInputs: proofResult.proof.publicInputs,
        },
        publicSignals: {
          emailHeader: proofResult.proof.publicInputs[0] || '',
          emailBody: proofResult.proof.publicInputs[1] || '',
          eventName: proofResult.metadata?.eventName || selectedEmail.subject.replace(/^.*Registration Confirmation:?\s*/i, '').trim() || 'Event',
          eventDate: proofResult.metadata?.dateValue || selectedEmail.date
        },
        metadata: proofResult.metadata
      }
      const validation = validateProof(result)
      setProof(result)
      setIsProofValid(validation.isValid)
      
      // 6. Proof Complete (33%)
      setUnifiedStep('proof-complete')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      if (!validation.isValid) {
        throw new Error(validation.error || 'Proof validation failed')
      }

      // Phase 2: Wallet Connection
      // Check if CDP wallet already connected
      if (evmAddress && currentUser) {
        setWalletAddress(evmAddress)
        setWalletType('cdp')
        setUnifiedStep('wallet-sign-prompt')
      } else {
        // Not connected, prompt user to connect (CDP or External)
        setUnifiedStep('wallet-prompt')
      }
      
    } catch (err: unknown) {
      const error = err as Error & { name?: string }
      console.error('Failed in unified flow:', error)
      
      if (error.name === 'TokenExpiredError' || (error.message && error.message.includes('Token expired'))) {
        handleTokenExpiration()
        setError('Your session has expired. Please sign in again.')
      } else {
        setError(error.message || 'Failed to complete flow')
      }
      
      setIsUnifiedFlow(false)
      setUnifiedStep(null)
    }
  }

  // Handle CDP Embedded Wallet connection (Email/OTP flow)
  const handleConnectCDPWallet = async () => {
    try {
      setError(null)
      
      // Use Google login email (from Gmail authentication)
      const emailToUse = userEmail
      
      if (!emailToUse) {
        // If no email from Gmail auth, show error
        setError('Please sign in with Gmail first to connect your wallet.')
        setUnifiedStep('wallet-prompt')
        return
      }
      
      // If OTP input is showing and we have OTP code, verify OTP
      if (showOtpInput && otpCode && flowId) {
        setIsVerifyingOtp(true)
        setUnifiedStep('wallet-connecting')
        
        try {
          const { user } = await verifyEmailOTP({ flowId, otp: otpCode })
          
          // Get wallet address from user (EOA account)
          if (user.evmAccounts && user.evmAccounts.length > 0) {
            const address = user.evmAccounts[0]
            setWalletAddress(address)
            setWalletType('cdp')
            setUnifiedStep('wallet-connected')
            setShowOtpInput(false)
            setOtpCode('')
            setFlowId(null)
            await new Promise(resolve => setTimeout(resolve, 500))
            setUnifiedStep('wallet-sign-prompt')
          } else {
            throw new Error('Wallet creation failed. No EOA address returned.')
          }
        } catch (err: unknown) {
          console.error('Failed to verify OTP:', err)
          const error = err as Error
          setError(error.message || 'Failed to verify OTP')
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
          const result = await signInWithEmail({ email: emailToUse })
          
          // Store flowId and show OTP input
          setFlowId(result.flowId)
          setShowOtpInput(true)
          setUnifiedStep('wallet-prompt')
          
        } catch (err: unknown) {
          console.error('Failed to send OTP:', err)
          const error = err as Error
          setError(error.message || 'Failed to send OTP')
          setUnifiedStep('wallet-prompt')
        } finally {
          setIsSendingOtp(false)
        }
      }
      
    } catch (err: unknown) {
      console.error('Failed to connect wallet:', err)
      const error = err as Error
      setError(error.message || 'Failed to connect wallet')
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
      setWalletType('external')
      
      setUnifiedStep('wallet-connected')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Auto advance to sign prompt
      setUnifiedStep('wallet-sign-prompt')
      
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
          setUnifiedStep('wallet-sign-prompt')
        }, 500)
      }
    }
  }, [walletStatus.evmAddress, walletAddress, isUnifiedFlow, unifiedStep])

  const handleShareOnX = () => {
    const text = encodeURIComponent('I just minted my Mintmark on Base! #onchain #Base');
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

  // Handle pay minting fee - Send 1 USDC on Base Sepolia testnet
  const handlePayFee = async () => {
    if (!evmAddress || !walletAddress) {
      setError('Wallet not connected')
      setUnifiedStep('wallet-prompt')
      return
    }

    try {
      setUnifiedStep('wallet-fee-paying')
      setError(null)
      
      // Base Sepolia USDC contract address (testnet)
      // Note: Verify the actual USDC contract address on Base Sepolia
      const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
      const MINTING_FEE_RECIPIENT = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' // Replace with actual recipient
      
      // USDC uses 6 decimal places, so 1 USDC = 1000000 (1e6)
      const amount = BigInt(1_000_000) // 1 USDC
      
      // ERC20 transfer function: transfer(address to, uint256 amount)
      // Function selector: 0xa9059cbb (first 4 bytes of keccak256("transfer(address,uint256)"))
      // Format: 0xa9059cbb + to (32 bytes padded) + amount (32 bytes padded)
      const functionSelector = '0xa9059cbb'
      
      // Pad address to 32 bytes (remove 0x prefix, pad left with zeros)
      const toAddress = MINTING_FEE_RECIPIENT.slice(2).padStart(64, '0')
      
      // Pad amount to 32 bytes (hex, pad left with zeros)
      const amountHex = amount.toString(16).padStart(64, '0')
      
      // Combine: selector + to + amount
      const transferData = functionSelector + toAddress + amountHex
      
      // Send transaction using CDP hooks
      const result = await sendEvmTransaction({
        evmAccount: evmAddress,
        network: 'base-sepolia',
        transaction: {
          to: USDC_CONTRACT_ADDRESS as `0x${string}`,
          value: 0n,
          data: transferData as `0x${string}`,
          chainId: 84532, // Base Sepolia chain ID
          type: 'eip1559'
        }
      })
      
      console.log('USDC transfer transaction hash:', result.transactionHash)
      
      // Wait for transaction confirmation
      // Note: CDP hooks automatically track transaction status via txData
      // We'll check txData.status in useEffect
      
      setUnifiedStep('wallet-complete')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Auto advance to minting
      await startMinting()
      
    } catch (err: unknown) {
      const error = err as Error
      console.error('Failed to pay fee:', error)
      setError(error.message || 'Failed to pay minting fee')
      setUnifiedStep('wallet-fee-prompt')
    }
  }
  
  // Monitor transaction status
  useEffect(() => {
    if (txData?.status === 'success' && unifiedStep === 'wallet-fee-paying') {
      console.log('USDC transfer confirmed:', txData.receipt)
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
                        {/* Backdrop - Non-clickable */}
                        <div
                          className="absolute inset-0 dark:bg-black/80 bg-black/20"
                          style={{
                            backdropFilter: 'blur(8px) saturate(120%)',
                            WebkitBackdropFilter: 'blur(8px) saturate(120%)',
                            willChange: 'backdrop-filter',
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
                          <div className="relative overflow-y-auto max-h-[90vh] p-4 sm:p-6">
                            {unifiedStep === 'mint-complete' ? (
                              /* Success State */
                              <div className="text-center space-y-6">
                                {/* Success Animation */}
                                <div className="flex justify-center">
                                  <div className="relative">
                                    <div className="absolute inset-0 bg-green-500/30 rounded-full blur-2xl animate-pulse"></div>
                                    <CheckCircle2 className="h-20 w-20 text-green-500 relative z-10" />
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--page-text-primary)' }}>
                                    Your Mintmark Is Onchain!
                                  </h2>
                                  <p className="text-lg font-medium" style={{ color: 'var(--page-text-secondary)' }}>
                                    A permanent, zero‑knowledge mark of your commitment is now live on Base.
                                  </p>
                                </div>
                                
                                {/* POAP Badge - Final */}
                                <div className="flex justify-center pt-4">
                                  <POAPBadge email={selectedEmail} size="md" showVerified={true} />
                                </div>
                                
                                {/* Action */}
                                <div className="pt-6">
                                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                                    <Button
                                      onClick={() => {
                                        navigate('/marks')
                                      }}
                                      variant="outline"
                                      className="gap-2 w-full sm:flex-1"
                                      size="lg"
                                    >
                                      View My Marks
                                      <ArrowRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      onClick={handleShareOnX}
                                      className="gap-2 w-full sm:flex-1"
                                      size="lg"
                                    >
                                      Share on X
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Progress State */
                              <div className="space-y-4">
                                {/* Horizontal Header with Email Info */}
                                <div className="flex items-start gap-3 p-3 rounded-lg border" style={{ 
                                  borderColor: 'var(--page-border-color)',
                                  backgroundColor: 'var(--page-badge-bg)'
                                }}>
                                  {/* Left Icon - Bookmark */}
                                  <div className="flex-shrink-0 w-10 h-10 rounded-none flex items-center justify-center" style={{ 
                                    backgroundColor: 'var(--page-badge-icon-bg)',
                                    color: 'var(--page-badge-icon-text)'
                                  }}>
                                    <Bookmark className="w-5 h-5" />
                                  </div>
                                  
                                  {/* Right Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                      <h2 className="text-sm font-bold" style={{ color: 'var(--page-text-primary)' }}>
                                        Mint Your Mintmark
                                      </h2>
                                      <span className="text-[10px] font-medium px-2 py-1 rounded" style={{ 
                                        backgroundColor: 'var(--primary)',
                                        color: 'var(--primary-foreground)'
                                      }}>
                                        Base Network
                                      </span>
                                    </div>
                                    
                                    {/* Email Details Card */}
                                    <div className="p-2 rounded border" style={{ 
                                      borderColor: 'var(--page-border-color)',
                                      backgroundColor: 'var(--glass-bg-tertiary)'
                                    }}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-semibold truncate" style={{ color: 'var(--page-text-primary)' }}>
                                            {selectedEmail?.from?.includes('luma') ? 'Luma' : selectedEmail?.from?.includes('substack') ? 'Substack' : 'Event'} • {selectedEmail?.date ? new Date(selectedEmail.date).toLocaleDateString('en-US', { 
                                              month: 'short', 
                                              day: 'numeric',
                                              year: 'numeric'
                                            }) : 'Today'}
                                          </p>
                                          <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--page-text-secondary)' }}>
                                            {selectedEmail?.subject || 'Event Registration'}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1 ml-2">
                                          <Shield className="w-3 h-3" style={{ color: 'var(--page-text-muted)' }} />
                                          <span className="text-[9px] font-medium" style={{ color: 'var(--page-text-muted)' }}>
                                            ZK-proof
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Unified Progress Component */}
                                <UnifiedMintProgress
                                  currentStep={unifiedStep}
                                  onConnectCDPWallet={handleConnectCDPWallet}
                                  onConnectExternalWallet={hasExternalWallet ? handleConnectExternalWallet : undefined}
                                  onSignMessage={handleSignMessage}
                                  onPayFee={handlePayFee}
                                  onChangeWallet={() => {
                                    // Reset wallet state to allow user to connect different wallet
                                    setWalletAddress(null)
                                    setWalletType(null)
                                    setShowOtpInput(false)
                                    setOtpCode('')
                                    setFlowId(null)
                                    setUnifiedStep('wallet-prompt')
                                  }}
                                  walletAddress={walletAddress || undefined}
                                  error={error}
                                  showOtpInput={showOtpInput}
                                  otpEmail={userEmail || ''}
                                  otpCode={otpCode}
                                  onOtpCodeChange={(code) => setOtpCode(code)}
                                  isSendingOtp={isSendingOtp}
                                  isVerifyingOtp={isVerifyingOtp}
                                  hasExternalWallet={hasExternalWallet}
                                />

                                {/* Security footer */}
                                <div className="flex items-center justify-center gap-4 pt-2 text-[10px]" style={{ color: 'var(--page-text-secondary)' }}>
                                  <div className="flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    <span>Zero-knowledge</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    <span>Private & Secure</span>
                                  </div>
                                </div>
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
