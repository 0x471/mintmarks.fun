import { useState, useEffect } from 'react'
import { useSendEvmTransaction, useEvmAddress, useSignInWithEmail, useVerifyEmailOTP } from '@coinbase/cdp-hooks'
import { useEvmBalance } from '@/hooks/useEvmBalance'
import { useTransactionStatus } from '@/hooks/useTransactionStatus'
import { NETWORKS, type SupportedNetwork } from '@/config/chains'
import { handleWalletError } from '@/utils/walletErrors'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from './useToast'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { X, Send, Copy, Check, ArrowDownLeft, CreditCard, Loader2, ExternalLink, Plus, Minus, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WalletOperationsModalProps {
  isOpen: boolean
  onClose: () => void
  evmAddress?: string
  balance: number
  selectedNetwork?: SupportedNetwork
  onNetworkChange?: (network: SupportedNetwork) => void
  needsWalletCreation?: boolean
}

export function WalletOperationsModal({ 
  isOpen, 
  onClose, 
  evmAddress, 
  balance,
  selectedNetwork: propSelectedNetwork = 'base-sepolia',
  onNetworkChange: propOnNetworkChange,
  needsWalletCreation = false,
}: WalletOperationsModalProps) {
  const { showToast } = useToast()
  const { userEmail } = useAuth()
  const { evmAddress: hookAddress } = useEvmAddress()
  const { sendEvmTransaction } = useSendEvmTransaction()
  const { signInWithEmail } = useSignInWithEmail()
  const { verifyEmailOTP } = useVerifyEmailOTP()
  const [selectedNetwork, setSelectedNetwork] = useState<SupportedNetwork>(propSelectedNetwork)
  
  // Wallet creation state
  const [isCreatingWallet, setIsCreatingWallet] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [flowId, setFlowId] = useState<string | null>(null)
  
  // Enhanced hooks for better EOA wallet support
  const { balance: networkBalance, isLoading: isLoadingBalance, refetch: refetchBalance } = useEvmBalance(selectedNetwork)
  const { status: txStatus, receipt: txReceipt, trackTransaction, clearStatus } = useTransactionStatus()
  
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'onramp'>('send')
  const [sendToAddress, setSendToAddress] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)

  const walletAddress = evmAddress || hookAddress
  const displayBalance = balance || networkBalance || 0
  const networkConfig = NETWORKS[selectedNetwork]

  // Enhanced amount input helpers
  const incrementAmount = () => {
    const current = parseFloat(sendAmount) || 0
    const increment = current < 1 ? 0.01 : current < 10 ? 0.1 : 1
    const newAmount = Math.min(current + increment, displayBalance)
    setSendAmount(newAmount.toFixed(current < 1 ? 2 : 1))
  }

  const decrementAmount = () => {
    const current = parseFloat(sendAmount) || 0
    const decrement = current <= 1 ? 0.01 : current <= 10 ? 0.1 : 1
    const newAmount = Math.max(current - decrement, 0)
    setSendAmount(newAmount > 0 ? newAmount.toFixed(current <= 1 ? 2 : 1) : '')
  }

  const setPresetAmount = (percentage: number) => {
    const amount = (displayBalance * percentage).toFixed(3)
    setSendAmount(amount)
  }

  const handleNetworkChange = (network: SupportedNetwork) => {
    setSelectedNetwork(network)
    propOnNetworkChange?.(network)
    // Clear any existing transaction status when switching networks
    clearStatus()
  }

  // Generate QR code for receive tab
  useEffect(() => {
    if (activeTab === 'receive' && walletAddress) {
      // Simple QR code generation using a service
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(walletAddress)}`
      setQrCode(qrUrl)
    }
  }, [activeTab, walletAddress])

  // Handle transaction confirmation
  useEffect(() => {
    if (txStatus === 'confirmed' && txReceipt) {
      showToast('Transaction confirmed successfully!', 'success')
      // Refetch balance after successful transaction
      refetchBalance()
      
      // Auto-close modal after successful transaction
      setTimeout(() => {
        onClose()
        clearStatus()
      }, 3000)
    } else if (txStatus === 'failed') {
      showToast('Transaction failed', 'error')
    }
  }, [txStatus, txReceipt, showToast, refetchBalance, onClose, clearStatus])

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      showToast('Address copied to clipboard', 'success')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSend = async () => {
    if (!walletAddress) {
      showToast('Wallet not connected', 'error')
      return
    }

    if (!sendToAddress || !sendAmount) {
      showToast('Please fill in all fields', 'error')
      return
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(sendToAddress)) {
      showToast('Invalid address format', 'error')
      return
    }

    // Validate amount
    const amount = parseFloat(sendAmount)
    if (isNaN(amount) || amount <= 0) {
      showToast('Invalid amount', 'error')
      return
    }

    if (amount > displayBalance) {
      showToast('Insufficient balance', 'error')
      return
    }

    try {
      setIsSending(true)
      clearStatus() // Clear any previous transaction status
      
      // Convert to wei based on selected network
      const amountWei = BigInt(Math.floor(amount * 10 ** networkConfig.nativeCurrency.decimals))

      console.log('[Wallet] 💰 Sending EOA transaction:', {
        network: selectedNetwork,
        from: walletAddress,
        to: sendToAddress,
        amount: `${amount} ${networkConfig.nativeCurrency.symbol}`,
        amountWei: amountWei.toString(),
        chainId: networkConfig.id,
      })

      const result = await sendEvmTransaction({
        evmAccount: walletAddress as `0x${string}`,
        // @ts-ignore - Celo Sepolia might not be officially supported
        network: networkConfig.cdpNetwork,
        transaction: {
          to: sendToAddress as `0x${string}`,
          value: amountWei,
          data: '0x',
          chainId: networkConfig.id,
        }
      })

      console.log('[Wallet] ✅ EOA Transaction submitted:', result.transactionHash)
      
      // Start tracking transaction status
      trackTransaction(result.transactionHash, selectedNetwork)
      
      showToast('Transaction submitted! Tracking confirmation...', 'success')
      
      // Reset form
      setSendToAddress('')
      setSendAmount('')
      
      // Switch to receive tab to show transaction status
      setActiveTab('receive')
      
    } catch (err: unknown) {
      console.error('[Wallet] ❌ Failed to send EOA transaction:', err)
      const errorMessage = handleWalletError(err)
      showToast(errorMessage, 'error')
    } finally {
      setIsSending(false)
    }
  }

  const handleOnramp = () => {
    // Open Coinbase onramp in new tab
    // Note: This would typically use Coinbase Pay SDK or redirect to Coinbase
    const asset = selectedNetwork === 'celo-sepolia' ? 'CELO' : 'ETH'
    const network = selectedNetwork === 'celo-sepolia' ? 'celo-sepolia' : 'base-sepolia'
    const onrampUrl = `https://pay.coinbase.com/buy/select-asset?destinationWallets=[{"address":"${walletAddress}","assets":["${asset}"],"supportedNetworks":["${network}"]}]`
    window.open(onrampUrl, '_blank')
  }

  const handleCreateWallet = async () => {
    if (!userEmail) {
      showToast('Please sign in with Gmail first', 'error')
      return
    }

    try {
      setIsCreatingWallet(true)
      
      console.log('[WalletCreation] Starting wallet creation for:', userEmail)
      
      // Start CDP email signin flow
      const result = await signInWithEmail({ email: userEmail })
      
      if (result.flowId) {
        setFlowId(result.flowId)
        setShowOtpInput(true)
        showToast(`Verification code sent to ${userEmail}`, 'success')
      } else {
        throw new Error('Failed to start email verification')
      }
      
    } catch (error) {
      console.error('[WalletCreation] Error:', error)
      const errorMessage = handleWalletError(error)
      showToast(errorMessage, 'error')
      setIsCreatingWallet(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!flowId || !otpCode) {
      showToast('Please enter verification code', 'error')
      return
    }

    try {
      console.log('[WalletCreation] Verifying OTP...')
      
      await verifyEmailOTP({ flowId, otp: otpCode })
      
      showToast('Wallet created successfully!', 'success')
      
      // Reset wallet creation state
      setIsCreatingWallet(false)
      setShowOtpInput(false)
      setOtpCode('')
      setFlowId(null)
      
      // Close modal after successful wallet creation
      setTimeout(() => {
        onClose()
      }, 2000)
      
    } catch (error) {
      console.error('[WalletCreation] OTP verification error:', error)
      const errorMessage = handleWalletError(error)
      showToast(errorMessage, 'error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 sm:px-6 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-md"
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
          WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
          zIndex: 100,
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="relative w-full max-w-md max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 card-glass"
        style={{
          zIndex: 101,
          borderRadius: 'var(--figma-card-radius)',
          background: 'var(--glass-bg-primary)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
          WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--page-text-primary)' }}>
              Wallet Operations
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--page-text-secondary)' }}>
              {isLoadingBalance ? 'Loading...' : `${displayBalance.toFixed(3)} ${networkConfig.nativeCurrency.symbol}`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
            style={{
              backgroundColor: 'var(--glass-bg-secondary)',
              borderColor: 'var(--glass-border)',
              color: 'var(--page-text-muted)'
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {needsWalletCreation ? (
            /* Wallet Creation UI */
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--page-text-primary)' }}>
                  {showOtpInput ? 'Verify Email' : 'Create Your Wallet'}
                </h3>
                <p className="text-sm" style={{ color: 'var(--page-text-secondary)' }}>
                  {showOtpInput 
                    ? `Enter the verification code sent to ${userEmail}`
                    : 'Set up a secure Coinbase embedded wallet to send, receive, and manage your crypto.'
                  }
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg border" style={{ 
                  backgroundColor: 'var(--glass-bg-secondary)', 
                  borderColor: 'var(--glass-border)' 
                }}>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--page-text-primary)' }}>
                        Email Authenticated
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--page-text-secondary)' }}>
                        {userEmail || 'Gmail account connected'}
                      </p>
                    </div>
                  </div>
                </div>

                {showOtpInput ? (
                  /* OTP Input */
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: 'var(--page-text-primary)' }}>
                        Verification Code
                      </label>
                      <Input
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        maxLength={6}
                        className="text-center text-lg font-mono"
                        style={{
                          backgroundColor: 'var(--glass-bg-tertiary)',
                          borderColor: 'var(--glass-border)',
                          color: 'var(--page-text-primary)'
                        }}
                      />
                    </div>
                    
                    <Button
                      onClick={handleVerifyOtp}
                      disabled={otpCode.length !== 6}
                      className="w-full gap-2 h-12"
                      style={{
                        backgroundColor: 'var(--figma-cta1-bg)',
                        borderColor: 'var(--figma-cta1-border)',
                        color: 'var(--figma-cta1-text)',
                      }}
                    >
                      {isCreatingWallet ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Creating Wallet...
                        </>
                      ) : (
                        <>
                          <Check className="h-5 w-5" />
                          Verify & Create Wallet
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  /* Create Wallet Button */
                  <Button
                    onClick={handleCreateWallet}
                    disabled={isCreatingWallet}
                    className="w-full gap-2 h-12"
                    style={{
                      backgroundColor: 'var(--figma-cta1-bg)',
                      borderColor: 'var(--figma-cta1-border)',
                      color: 'var(--figma-cta1-text)',
                    }}
                  >
                    {isCreatingWallet ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Sending Code...
                      </>
                    ) : (
                      <>
                        <Wallet className="h-5 w-5" />
                        Create Wallet & Start Minting
                      </>
                    )}
                  </Button>
                )}

                <p className="text-xs text-center" style={{ color: 'var(--page-text-muted)' }}>
                  Your wallet will be created securely using Coinbase's embedded wallet infrastructure
                </p>
              </div>
            </div>
          ) : (
            /* Normal Wallet Operations */
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'send' | 'receive' | 'onramp')} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6" style={{ backgroundColor: 'var(--glass-bg-tertiary)' }}>
                <TabsTrigger value="send" className="gap-2">
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Send</span>
                </TabsTrigger>
                <TabsTrigger value="receive" className="gap-2">
                  <ArrowDownLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Receive</span>
                </TabsTrigger>
                <TabsTrigger value="onramp" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Buy</span>
                </TabsTrigger>
              </TabsList>

            {/* Send Tab */}
            <TabsContent value="send" className="space-y-4 mt-0">
              {/* Compact Horizontal Network Selection */}
              {propOnNetworkChange && (
                <div className="border rounded-xl mb-4 p-3" style={{ 
                  backgroundColor: 'var(--glass-bg-tertiary)',
                  borderColor: 'var(--glass-border)',
                  borderRadius: 'var(--figma-card-radius)'
                }}>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--page-text-primary)' }}>
                    Network
                  </label>

                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.entries(NETWORKS).map(([networkKey, config]) => (
                      <button
                        key={networkKey}
                        onClick={() => handleNetworkChange(networkKey as SupportedNetwork)}
                        className={cn(
                          "flex flex-col items-center p-2 rounded-lg text-[10px] font-medium transition-all duration-200 border relative overflow-hidden",
                          selectedNetwork === networkKey
                            ? "border-blue-400/50 shadow-md"
                            : "border-transparent hover:bg-white/5"
                        )}
                        style={{
                          backgroundColor: selectedNetwork === networkKey 
                            ? 'var(--figma-cta1-bg)' 
                            : 'var(--glass-bg-secondary)',
                          color: selectedNetwork === networkKey 
                            ? 'var(--figma-cta1-text)' 
                            : 'var(--page-text-primary)',
                        }}
                      >
                        {/* Network Indicator */}
                        <div 
                          className={cn(
                            "w-2 h-2 rounded-full mb-1",
                            networkKey.includes('base') ? "bg-blue-500" : "bg-green-500"
                          )}
                        />
                        
                        {/* Network Name */}
                        <div className="font-semibold text-center leading-tight">
                          {config.name.replace(' Sepolia', '').replace(' Mainnet', '')}
                        </div>
                        
                        {/* Currency & Chain ID */}
                        <div className="text-[8px] opacity-70 text-center">
                          {config.nativeCurrency.symbol} • {config.id}
                        </div>
                        
                        {/* Network Type Badge */}
                        <div className="mt-1">
                          {config.isTestnet ? (
                            <span className="text-[7px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-medium">
                              TEST
                            </span>
                          ) : (
                            <span className="text-[7px] px-1 py-0.5 rounded bg-red-500/20 text-red-300 font-medium">
                              MAIN
                            </span>
                          )}
                        </div>

                        {/* Selected Indicator */}
                        {selectedNetwork === networkKey && (
                          <div className="absolute top-1 right-1">
                            <Check className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* Info Note */}
                  <div className="mt-2 text-center">
                    <p className="text-[9px]" style={{ color: 'var(--page-text-muted)' }}>
                      💡 Mainnet = Real funds • Testnets = Safe testing
                    </p>
                  </div>
                </div>
              )}
              
              <Card style={{ backgroundColor: 'var(--glass-bg-secondary)', borderColor: 'var(--glass-border)' }}>
                <CardHeader>
                  <CardTitle className="text-base">Send {networkConfig.nativeCurrency.symbol}</CardTitle>
                  <CardDescription className="text-xs">
                    Transfer {networkConfig.nativeCurrency.symbol} to another address on {networkConfig.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium" style={{ color: 'var(--page-text-primary)' }}>
                      Recipient Address
                    </label>
                    <Input
                      type="text"
                      placeholder="0x..."
                      value={sendToAddress}
                      onChange={(e) => setSendToAddress(e.target.value)}
                      className="font-mono text-sm"
                      style={{
                        backgroundColor: 'var(--glass-bg-tertiary)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--page-text-primary)'
                      }}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-sm font-semibold" style={{ color: 'var(--page-text-primary)' }}>
                      Amount ({networkConfig.nativeCurrency.symbol})
                    </label>

                    {/* Enhanced Amount Input */}
                    <div className="space-y-3">
                      <div className="relative">
                        <div className="flex items-center rounded-lg border overflow-hidden" style={{
                          backgroundColor: 'var(--glass-bg-tertiary)',
                          borderColor: 'var(--glass-border)',
                        }}>
                          {/* Decrement Button */}
                          <button
                            onClick={decrementAmount}
                            disabled={!sendAmount || parseFloat(sendAmount) <= 0}
                            className="flex items-center justify-center w-10 h-10 transition-all hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ color: 'var(--page-text-primary)' }}
                          >
                            <Minus className="h-4 w-4" />
                          </button>

                          {/* Amount Input */}
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={sendAmount}
                            onChange={(e) => setSendAmount(e.target.value)}
                            step="0.001"
                            min="0"
                            max={displayBalance.toString()}
                            className="flex-1 border-0 text-center text-lg font-mono bg-transparent focus:ring-0 focus:outline-none"
                            style={{
                              color: 'var(--page-text-primary)',
                              backgroundColor: 'transparent'
                            }}
                          />

                          {/* Increment Button */}
                          <button
                            onClick={incrementAmount}
                            disabled={parseFloat(sendAmount || '0') >= displayBalance}
                            className="flex items-center justify-center w-10 h-10 transition-all hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ color: 'var(--page-text-primary)' }}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Preset Amount Buttons */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: '25%', percentage: 0.25 },
                          { label: '50%', percentage: 0.5 },
                          { label: '75%', percentage: 0.75 },
                          { label: 'Max', percentage: 1 },
                        ].map(({ label, percentage }) => (
                          <button
                            key={label}
                            onClick={() => setPresetAmount(percentage)}
                            className="px-3 py-2 text-xs font-medium rounded-md transition-all hover:scale-105 border"
                            style={{
                              backgroundColor: 'var(--glass-bg-secondary)',
                              borderColor: 'var(--glass-border)',
                              color: 'var(--page-text-secondary)',
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Balance Info */}
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--page-text-muted)' }}>
                          Available: {displayBalance.toFixed(4)} {networkConfig.nativeCurrency.symbol}
                        </span>
                        {sendAmount && (
                          <span style={{ color: 'var(--page-text-secondary)' }}>
                            ≈ ${(parseFloat(sendAmount) * 2500).toLocaleString('en-US', { maximumFractionDigits: 2 })} USD
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleSend}
                    disabled={isSending || !sendToAddress || !sendAmount}
                    className="w-full gap-2"
                    style={{
                      backgroundColor: 'var(--figma-cta1-bg)',
                      borderColor: 'var(--figma-cta1-border)',
                      color: 'var(--figma-cta1-text)',
                    }}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send {networkConfig.nativeCurrency.symbol}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Receive Tab */}
            <TabsContent value="receive" className="space-y-4 mt-0">
              {/* Transaction Status Display */}
              {txStatus && (
                <Card style={{ backgroundColor: 'var(--glass-bg-secondary)', borderColor: 'var(--glass-border)' }}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      {txStatus === 'pending' && <Loader2 className="h-4 w-4 animate-spin" />}
                      {txStatus === 'confirmed' && <Check className="h-4 w-4 text-green-500" />}
                      {txStatus === 'failed' && <X className="h-4 w-4 text-red-500" />}
                      Transaction Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      Status: <span className="font-mono text-xs">
                        {txStatus === 'pending' && '⏳ Pending...'}
                        {txStatus === 'confirmed' && '✅ Confirmed'}
                        {txStatus === 'failed' && '❌ Failed'}
                      </span>
                    </div>
                    {txReceipt && (
                      <div className="text-xs space-y-1" style={{ color: 'var(--page-text-secondary)' }}>
                        <p>Block: {parseInt(txReceipt.blockNumber, 16).toLocaleString()}</p>
                        <p>
                          <a 
                            href={`${networkConfig.explorer}/tx/${txReceipt.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline flex items-center gap-1"
                          >
                            View on Explorer <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card style={{ backgroundColor: 'var(--glass-bg-secondary)', borderColor: 'var(--glass-border)' }}>
                <CardHeader>
                  <CardTitle className="text-base">Receive {networkConfig.nativeCurrency.symbol}</CardTitle>
                  <CardDescription className="text-xs">
                    Share your wallet address to receive {networkConfig.nativeCurrency.symbol}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* QR Code */}
                  {qrCode && walletAddress && (
                    <div className="flex justify-center p-4 rounded-lg" style={{ backgroundColor: 'var(--glass-bg-tertiary)' }}>
                      <img src={qrCode} alt="Wallet QR Code" className="w-48 h-48" />
                    </div>
                  )}

                  {/* Address */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium" style={{ color: 'var(--page-text-primary)' }}>
                      Your Wallet Address
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={walletAddress || ''}
                        readOnly
                        className="font-mono text-xs"
                        style={{
                          backgroundColor: 'var(--glass-bg-tertiary)',
                          borderColor: 'var(--glass-border)',
                          color: 'var(--page-text-primary)'
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyAddress}
                        className="h-10 w-10 shrink-0"
                        style={{
                          backgroundColor: 'var(--glass-bg-secondary)',
                          borderColor: 'var(--glass-border)',
                          color: 'var(--page-text-primary)'
                        }}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--glass-bg-tertiary)', borderColor: 'var(--glass-border)' }}>
                    <p className="text-xs" style={{ color: 'var(--page-text-secondary)' }}>
                      <strong style={{ color: 'var(--page-text-primary)' }}>Network:</strong> {networkConfig.name}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--page-text-secondary)' }}>
                      <strong style={{ color: 'var(--page-text-primary)' }}>Chain ID:</strong> {networkConfig.id}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onramp Tab */}
            <TabsContent value="onramp" className="space-y-4 mt-0">
              <Card style={{ backgroundColor: 'var(--glass-bg-secondary)', borderColor: 'var(--glass-border)' }}>
                <CardHeader>
                  <CardTitle className="text-base">Buy {networkConfig.nativeCurrency.symbol}</CardTitle>
                  <CardDescription className="text-xs">
                    Purchase {networkConfig.nativeCurrency.symbol} with fiat currency using Coinbase Pay
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--glass-bg-tertiary)', borderColor: 'var(--glass-border)' }}>
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-5 w-5 shrink-0 mt-0.5" style={{ color: 'var(--page-text-primary)' }} />
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-medium" style={{ color: 'var(--page-text-primary)' }}>
                          Coinbase Pay
                        </p>
                        <p className="text-xs" style={{ color: 'var(--page-text-secondary)' }}>
                          Buy {networkConfig.nativeCurrency.symbol} directly with your credit card or bank account. Funds will be sent to your wallet address.
                        </p>
                      </div>
                    </div>
                  </div>

                  {walletAddress && (
                    <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--glass-bg-tertiary)', borderColor: 'var(--glass-border)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--page-text-secondary)' }}>
                        <strong style={{ color: 'var(--page-text-primary)' }}>Destination:</strong>
                      </p>
                      <p className="text-xs font-mono break-all" style={{ color: 'var(--page-text-primary)' }}>
                        {walletAddress}
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleOnramp}
                    className="w-full gap-2"
                    style={{
                      backgroundColor: 'var(--figma-cta1-bg)',
                      borderColor: 'var(--figma-cta1-border)',
                      color: 'var(--figma-cta1-text)',
                    }}
                  >
                    <CreditCard className="h-4 w-4" />
                    Open Coinbase Pay
                    <ExternalLink className="h-4 w-4" />
                  </Button>

                  <div className="p-3 rounded-lg border border-yellow-500/20" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
                    <p className="text-xs" style={{ color: 'var(--page-text-secondary)' }}>
                      <strong style={{ color: 'var(--page-text-primary)' }}>Note:</strong> Make sure you're purchasing {networkConfig.nativeCurrency.symbol} on {networkConfig.name} testnet. Mainnet purchases won't appear in this wallet.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  )
}

