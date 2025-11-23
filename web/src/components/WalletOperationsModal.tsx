import { useState, useEffect } from 'react'
import { useSendEvmTransaction, useEvmAddress } from '@coinbase/cdp-hooks'
import { useWalletStatus } from '@/hooks/useWalletStatus'
import { NETWORKS, type SupportedNetwork } from '@/config/chains'
import { handleWalletError } from '@/utils/walletErrors'
import { useToast } from './useToast'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { X, Send, Copy, Check, ArrowDownLeft, CreditCard, Loader2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WalletOperationsModalProps {
  isOpen: boolean
  onClose: () => void
  evmAddress?: string
  balance: number
  selectedNetwork?: SupportedNetwork
  onNetworkChange?: (network: SupportedNetwork) => void
}

export function WalletOperationsModal({ 
  isOpen, 
  onClose, 
  evmAddress, 
  balance,
  selectedNetwork: propSelectedNetwork = 'celo-sepolia',
  onNetworkChange: propOnNetworkChange,
}: WalletOperationsModalProps) {
  const { showToast } = useToast()
  const { evmAddress: hookAddress } = useEvmAddress()
  const { sendEvmTransaction } = useSendEvmTransaction()
  const { isLoadingBalance, balance: currentBalance } = useWalletStatus()
  
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'onramp'>('send')
  const [sendToAddress, setSendToAddress] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<SupportedNetwork>(propSelectedNetwork)

  const walletAddress = evmAddress || hookAddress
  const displayBalance = balance || currentBalance
  const networkConfig = NETWORKS[selectedNetwork]

  const handleNetworkChange = (network: SupportedNetwork) => {
    setSelectedNetwork(network)
    propOnNetworkChange?.(network)
  }

  // Generate QR code for receive tab
  useEffect(() => {
    if (activeTab === 'receive' && walletAddress) {
      // Simple QR code generation using a service
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(walletAddress)}`
      setQrCode(qrUrl)
    }
  }, [activeTab, walletAddress])

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
      
      // Convert to wei based on selected network
      const amountWei = BigInt(Math.floor(amount * 10 ** networkConfig.nativeCurrency.decimals))

      console.log('[Wallet] 💰 Sending transaction:', {
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

      console.log('[Wallet] ✅ Transaction submitted:', result.transactionHash)
      showToast('Transaction submitted successfully', 'success')
      
      // Reset form
      setSendToAddress('')
      setSendAmount('')
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose()
      }, 1500)
      
    } catch (err: unknown) {
      console.error('[Wallet] ❌ Failed to send transaction:', err)
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
              {/* Network Selection */}
              {propOnNetworkChange && (
                <div className="p-3 border rounded-lg mb-4" style={{ 
                  backgroundColor: 'var(--glass-bg-tertiary)',
                  borderColor: 'var(--glass-border)',
                  borderRadius: 'var(--figma-card-radius)'
                }}>
                  <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--page-text-primary)' }}>
                    Select Network
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleNetworkChange('base-sepolia')}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all border",
                        selectedNetwork === 'base-sepolia'
                          ? "bg-blue-500/20 border-blue-500/50 text-blue-500"
                          : "bg-transparent border-transparent hover:bg-white/5"
                      )}
                      style={{
                        borderColor: selectedNetwork === 'base-sepolia' ? 'var(--figma-cta1-border)' : 'var(--glass-border)',
                        color: selectedNetwork === 'base-sepolia' ? 'var(--figma-cta1-text)' : 'var(--page-text-secondary)',
                        backgroundColor: selectedNetwork === 'base-sepolia' ? 'var(--figma-cta1-bg)' : 'transparent',
                      }}
                    >
                      Base Sepolia
                    </button>
                    <button
                      onClick={() => handleNetworkChange('celo-sepolia')}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all border",
                        selectedNetwork === 'celo-sepolia'
                          ? "bg-green-500/20 border-green-500/50 text-green-500"
                          : "bg-transparent border-transparent hover:bg-white/5"
                      )}
                      style={{
                        borderColor: selectedNetwork === 'celo-sepolia' ? 'var(--figma-cta1-border)' : 'var(--glass-border)',
                        color: selectedNetwork === 'celo-sepolia' ? 'var(--figma-cta1-text)' : 'var(--page-text-secondary)',
                        backgroundColor: selectedNetwork === 'celo-sepolia' ? 'var(--figma-cta1-bg)' : 'transparent',
                      }}
                    >
                      Celo Sepolia
                    </button>
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
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium" style={{ color: 'var(--page-text-primary)' }}>
                      Amount (CELO)
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={sendAmount}
                        onChange={(e) => setSendAmount(e.target.value)}
                        step="0.001"
                        min="0"
                        max={displayBalance.toString()}
                        style={{
                          backgroundColor: 'var(--glass-bg-tertiary)',
                          borderColor: 'var(--glass-border)',
                          color: 'var(--page-text-primary)'
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2 text-xs"
                        onClick={() => setSendAmount(displayBalance.toString())}
                        style={{ color: 'var(--page-text-muted)' }}
                      >
                        Max
                      </Button>
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--page-text-muted)' }}>
                      Available: {displayBalance.toFixed(3)} {networkConfig.nativeCurrency.symbol}
                    </p>
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
              <Card style={{ backgroundColor: 'var(--glass-bg-secondary)', borderColor: 'var(--glass-border)' }}>
                <CardHeader>
                  <CardTitle className="text-base">Receive CELO</CardTitle>
                  <CardDescription className="text-xs">
                    Share your wallet address to receive CELO
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
                  <CardTitle className="text-base">Buy CELO</CardTitle>
                  <CardDescription className="text-xs">
                    Purchase CELO with fiat currency using Coinbase Pay
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
                          Buy CELO directly with your credit card or bank account. Funds will be sent to your wallet address.
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
                      <strong style={{ color: 'var(--page-text-primary)' }}>Note:</strong> Make sure you're purchasing CELO on Celo Sepolia testnet. Mainnet purchases won't appear in this wallet.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

