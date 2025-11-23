/**
 * Unified Mint Progress Component - Optimized UI/UX
 * 
 * UI/UX Improvements:
 * 1. Progressive Disclosure - Only show what's needed, expandable details
 * 2. Visual Hierarchy - Current action is most prominent
 * 3. Compact Design - Reduced padding, better space utilization
 * 4. Contextual Information - Show only relevant details
 * 5. Clear CTAs - Action buttons are prominent and clear
 */

import { useState, useEffect, useRef } from 'react'
import React from 'react'
import { Loader2, CheckCircle2, Circle, Wallet, FileCheck, Coins, Zap, Shield, ChevronDown, Info, ArrowRight, Mail, Terminal, Share2, X, Fingerprint } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { ProgressBadge } from './ProgressBadge'
import { USDCLogo } from './USDCLogo'

// Simplified 3-step unified flow
export type UnifiedMintStep = 
  // Step 1: Connect Wallet
  | 'wallet-prompt'           // Show "Connect Wallet" button
  | 'wallet-connecting'       // User clicked, wallet popup
  | 'wallet-connected'        
  
  // Step 2: Self ID Integration
  | 'self-id-prompt'          // Show "Verify with Self ID" button
  | 'self-id-requesting'      // Waiting for app approval
  | 'self-id-verified'        // Approved

  // Step 3: Mint (Sign -> Mint)
  | 'mint-start'              // Initial state for mint step
  | 'wallet-sign-prompt'      // Show "Sign Message" prompt
  | 'wallet-signing'          // User signing
  | 'wallet-signed'
  | 'wallet-fee-prompt'       // Show "$1 Minting Fee" button
  | 'wallet-fee-paying'       // User paying
  | 'mint-generating-artwork' // Generating NFT artwork
  | 'mint-submitting'         // Submitting to Blockchain
  | 'mint-confirming'         // Waiting for Confirmation
  | 'mint-complete'           // Success state (includes Share)

interface StepConfig {
  key: UnifiedMintStep
  label: string
  description?: string
  phase: 'wallet' | 'self-id' | 'mint'
  progress: number
  requiresAction?: boolean
  icon?: React.ComponentType<{ className?: string }>
}

const stepConfigs: StepConfig[] = [
  // Step 1: Connect Wallet (0-30%)
  { key: 'wallet-prompt', label: 'Connect Wallet', description: 'Click to connect your wallet', phase: 'wallet', progress: 10, requiresAction: true },
  { key: 'wallet-connecting', label: 'Connecting Wallet', phase: 'wallet', progress: 20 },
  { key: 'wallet-connected', label: 'Wallet Connected', phase: 'wallet', progress: 30 },

  // Step 2: Self ID (30-50%)
  { key: 'self-id-prompt', label: 'Verify Identity', description: 'Verify with Self ID App', phase: 'self-id', progress: 35, requiresAction: true },
  { key: 'self-id-requesting', label: 'Waiting for Approval', description: 'Check your Self ID App', phase: 'self-id', progress: 40 },
  { key: 'self-id-verified', label: 'Identity Verified', phase: 'self-id', progress: 50 },
  
  // Step 3: Mint (50-100%)
  { key: 'mint-start', label: 'Initialize Mint', phase: 'mint', progress: 55 },
  { key: 'wallet-sign-prompt', label: 'Sign Message', description: 'Sign to verify ownership', phase: 'mint', progress: 60, requiresAction: true },
  { key: 'wallet-signing', label: 'Signing Message', phase: 'mint', progress: 65 },
  { key: 'wallet-signed', label: 'Message Signed', phase: 'mint', progress: 70 },
  { key: 'wallet-fee-prompt', label: 'Pay Minting Fee', description: 'Approve $1 minting fee', phase: 'mint', progress: 75, requiresAction: true },
  { key: 'wallet-fee-paying', label: 'Processing Payment', phase: 'mint', progress: 80 },
  { key: 'mint-generating-artwork', label: 'Generating Artwork', phase: 'mint', progress: 85 },
  { key: 'mint-submitting', label: 'Submitting to Chain', phase: 'mint', progress: 88 },
  { key: 'mint-confirming', label: 'Confirming Transaction', phase: 'mint', progress: 90 },
  { key: 'mint-complete', label: 'Minted Successfully!', phase: 'mint', progress: 100 },
]

interface PhaseGroup {
  phase: 'wallet' | 'self-id' | 'mint'
  title: string
  shortTitle: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  steps: StepConfig[]
}

const phaseGroups: PhaseGroup[] = [
  {
    phase: 'wallet',
    title: 'Step 1: Connect Wallet',
    shortTitle: 'Connect',
    description: 'Connect your wallet',
    icon: Wallet,
    steps: stepConfigs.filter(s => s.phase === 'wallet'),
  },
  {
    phase: 'self-id',
    title: 'Step 2: Verify Identity',
    shortTitle: 'Self ID',
    description: 'Verify with Self ID',
    icon: Fingerprint,
    steps: stepConfigs.filter(s => s.phase === 'self-id'),
  },
  {
    phase: 'mint',
    title: 'Step 3: Mint Mark',
    shortTitle: 'Mint',
    description: 'Sign & Mint',
    icon: Zap,
    steps: stepConfigs.filter(s => s.phase === 'mint'),
  },
]

interface UnifiedMintProgressProps {
  currentStep: UnifiedMintStep
  className?: string
  onConnectWallet?: () => void
  onConnectCDPWallet?: () => void
  onConnectExternalWallet?: () => void
  onVerifySelfID?: () => void
  onSignMessage?: () => void
  onPayFee?: () => void
  onChangeWallet?: () => void
  onClose?: () => void
  onShare?: () => void
  walletAddress?: string
  error?: string | null
  // Support for OTP flow props
  showOtpInput?: boolean
  otpEmail?: string
  otpCode?: string
  onOtpCodeChange?: (code: string) => void
  isSendingOtp?: boolean
  isVerifyingOtp?: boolean
  hasExternalWallet?: boolean
  proofLogs?: string[]
  proofStatus?: 'idle' | 'generating' | 'completed' | 'error'
}

export function UnifiedMintProgress({
  currentStep,
  className,
  onConnectWallet,
  onConnectCDPWallet,
  onConnectExternalWallet,
  onVerifySelfID,
  onSignMessage,
  onPayFee,
  onChangeWallet,
  onClose,
  onShare,
  walletAddress,
  error,
  showOtpInput,
  otpEmail,
  otpCode,
  onOtpCodeChange,
  isSendingOtp,
  isVerifyingOtp,
  hasExternalWallet = false,
  proofLogs = [],
  proofStatus = 'idle',
}: UnifiedMintProgressProps) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [proofLogs])

  const currentStepConfig = stepConfigs.find(s => s.key === currentStep)
  const currentProgress = currentStepConfig?.progress || 0
  const currentPhase = currentStepConfig?.phase

  // Determine phase status
  const getPhaseStatus = (phase: 'wallet' | 'self-id' | 'mint'): 'complete' | 'active' | 'pending' => {
    if (!currentPhase) return 'pending'
    
    const phaseOrder = ['wallet', 'self-id', 'mint']
    const currentPhaseIndex = phaseOrder.indexOf(currentPhase)
    const targetPhaseIndex = phaseOrder.indexOf(phase)
    
    if (targetPhaseIndex < currentPhaseIndex) return 'complete'
    if (targetPhaseIndex === currentPhaseIndex) return 'active'
    return 'pending'
  }

  // Get step status relative to current step
  const getStepStatus = (step: StepConfig): 'complete' | 'active' | 'pending' => {
    const currentIndex = stepConfigs.findIndex(s => s.key === currentStep)
    const stepIndex = stepConfigs.findIndex(s => s.key === step.key)
    
    if (stepIndex < currentIndex) return 'complete'
    if (stepIndex === currentIndex) return 'active'
    return 'pending'
  }

  // Get current step details
  const currentStepDetails = stepConfigs.find(s => s.key === currentStep)
  const currentPhaseGroup = phaseGroups.find(g => g.phase === currentPhase)

  return (
    <div className={cn('space-y-6 relative', className)}>
      {/* Close Button - Better Position */}
      <div className="absolute -top-4 -right-2 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Horizontal Timeline - Top */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {phaseGroups.map((group, index) => {
          const phaseStatus = getPhaseStatus(group.phase)
          const isActive = phaseStatus === 'active'
          const isComplete = phaseStatus === 'complete'
          
          const PhaseIcon = group.icon

          return (
            <React.Fragment key={group.phase}>
              {/* Step Badge */}
              <div className="flex-shrink-0">
                <ProgressBadge
                  label={`${index + 1}. ${group.shortTitle}`}
                  status={isComplete ? 'complete' : isActive ? 'active' : 'pending'}
                  icon={PhaseIcon as any}
                  className="min-w-[100px] sm:min-w-[120px] shadow-sm"
                />
              </div>
              {/* Arrow */}
              {index < phaseGroups.length - 1 && (
                <ArrowRight className={cn(
                  'h-4 w-4 flex-shrink-0 transition-colors duration-500',
                  isComplete ? 'text-green-500' : 'text-border'
                )} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main Column: Action Card */}
        <div className="space-y-6">
           {/* Current Step Card - Main Focus */}
          {currentStepDetails && currentPhaseGroup && (
            <Card className="overflow-hidden rounded-2xl border border-border/40 backdrop-blur-xl bg-background/40 shadow-2xl shadow-black/5 transition-all duration-500">
              <CardHeader className="pb-4 pt-5 px-5 sm:px-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-500',
                    getStepStatus(currentStepDetails) === 'complete' 
                      ? 'bg-green-500/10 text-green-500 shadow-[0_0_12px_rgba(34,197,94,0.2)]' 
                      : 'bg-blue-500/10 text-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                  )}>
                    {getStepStatus(currentStepDetails) === 'complete' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : currentStepDetails.key.includes('connecting') || currentStepDetails.key.includes('requesting') || currentStepDetails.key.includes('signing') || currentStepDetails.key.includes('paying') || currentStepDetails.key.includes('generating') || currentStepDetails.key.includes('submitting') || currentStepDetails.key.includes('confirming') ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Circle className="h-5 w-5 fill-current" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-base sm:text-lg font-semibold tracking-tight">
                      {currentStepDetails.label}
                    </CardTitle>
                    {currentStepDetails.description && (
                      <CardDescription className="flex items-start gap-1.5 text-sm">
                        <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground/80">{currentStepDetails.description}</span>
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 px-5 sm:px-6 pb-6">
                {/* Action Buttons */}
                {currentStepDetails.requiresAction && (
                  <div className="space-y-4 pt-2">
                    {currentStepDetails.key === 'wallet-prompt' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/30">
                          <Info className="h-4 w-4 text-blue-500" />
                          <span>Connect a wallet to mint your mark on Base.</span>
                        </div>
                        
                        {/* Wallet Selection: CDP or External */}
                        {!showOtpInput && (
                          <div className="grid grid-cols-1 gap-3">
                            {/* CDP Embedded Wallet Option */}
                            {onConnectCDPWallet && (
                              <Button
                                onClick={onConnectCDPWallet}
                                size="lg"
                                className="gap-3 w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:scale-[1.01]"
                              >
                                <Mail className="h-5 w-5" />
                                <span className="font-medium">Connect with Email</span>
                              </Button>
                            )}
                            
                            {/* External Wallet Option (MetaMask) */}
                            {hasExternalWallet && onConnectExternalWallet && (
                              <Button
                                onClick={onConnectExternalWallet}
                                size="lg"
                                variant="outline"
                                className="gap-3 w-full h-12 rounded-xl border-border/60 hover:bg-muted/50 hover:border-border transition-all duration-300"
                              >
                                <Wallet className="h-5 w-5 text-orange-500" />
                                <span className="font-medium">Connect with MetaMask</span>
                              </Button>
                            )}
                          </div>
                        )}
                        
                        {/* OTP Input Section */}
                        {showOtpInput && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="space-y-3">
                              <label className="text-sm font-medium text-foreground/80 ml-1">
                                Enter OTP Code
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={otpCode}
                                  onChange={(e) => onOtpCodeChange?.(e.target.value)}
                                  placeholder="123456"
                                  disabled={isVerifyingOtp}
                                  maxLength={6}
                                  className="w-full h-14 px-4 rounded-xl border bg-background/50 border-border/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-center text-2xl font-mono tracking-[0.5em] placeholder:tracking-normal"
                                />
                              </div>
                              {otpEmail && (
                                <p className="text-xs text-center text-muted-foreground">
                                  We sent a code to <span className="font-medium text-foreground">{otpEmail}</span>
                                </p>
                              )}
                            </div>
                            {onConnectCDPWallet && (
                              <Button
                                onClick={onConnectCDPWallet}
                                size="lg"
                                disabled={isSendingOtp || isVerifyingOtp || !otpCode || otpCode.length < 6}
                                className="gap-2 w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                              >
                                {isSendingOtp ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Sending OTP...
                                  </>
                                ) : isVerifyingOtp ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Verifying...
                                  </>
                                ) : (
                                  <>
                                    <Mail className="h-4 w-4" />
                                    Verify OTP
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {currentStepDetails.key === 'self-id-prompt' && onVerifySelfID && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/30">
                           <Fingerprint className="h-4 w-4 text-purple-500" />
                           <span>Verify your identity using Self ID App to proceed.</span>
                        </div>
                        <Button
                          onClick={onVerifySelfID}
                          size="lg"
                          className="gap-3 w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/20 transition-all duration-300 hover:scale-[1.01]"
                        >
                          <Fingerprint className="h-5 w-5" />
                          <span className="font-medium">Verify with Self ID</span>
                        </Button>
                      </div>
                    )}
                    
                    {currentStepDetails.key === 'wallet-sign-prompt' && onSignMessage && walletAddress && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Connected Wallet</p>
                            <p className="font-mono font-semibold text-sm text-foreground/90">
                              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                            </p>
                          </div>
                          {onChangeWallet && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={onChangeWallet}
                              className="h-8 px-3 text-xs hover:bg-background hover:shadow-sm rounded-lg"
                            >
                              Change
                            </Button>
                          )}
                        </div>
                        
                        <Button
                          onClick={onSignMessage}
                          size="lg"
                          className="gap-2 w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:scale-[1.01]"
                        >
                          <FileCheck className="h-5 w-5" />
                          <span className="font-medium">Sign Message</span>
                        </Button>
                        
                        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
                          <Shield className="h-3 w-3" />
                          Secure signature request
                        </p>
                      </div>
                    )}
                    
                    {currentStepDetails.key === 'wallet-fee-prompt' && onPayFee && (
                      <div className="space-y-4">
                        <div className="p-5 rounded-xl border border-border/40 bg-gradient-to-br from-blue-500/5 to-purple-500/5 flex items-center justify-between relative overflow-hidden">
                          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                          <div className="relative">
                            <p className="text-sm text-muted-foreground font-medium mb-1">Minting Fee</p>
                            <p className="text-xs text-muted-foreground/80">Base Network Gas + Service</p>
                          </div>
                          <div className="flex items-center gap-2 relative bg-background/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border/20 shadow-sm">
                            <USDCLogo className="h-6 w-6" />
                            <span className="text-lg font-bold text-foreground">1.00 USDC</span>
                          </div>
                        </div>
                        
                        <Button
                          onClick={onPayFee}
                          size="lg"
                          className="gap-2 w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:scale-[1.01]"
                        >
                          <Coins className="h-5 w-5" />
                          <span className="font-medium">Pay & Mint</span>
                        </Button>
                        
                        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
                          <Zap className="h-3 w-3 text-amber-500" />
                          Lightning fast transaction on Base
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Loading State */}
                {!currentStepDetails.requiresAction && (
                  <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                      <Loader2 className="h-8 w-8 text-primary animate-spin relative z-10" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground animate-pulse">
                      {currentStepDetails.phase === 'wallet' && 'Connecting to wallet...'}
                      {currentStepDetails.phase === 'self-id' && 'Waiting for Self ID approval...'}
                      {currentStepDetails.phase === 'mint' && 'Processing transaction...'}
                      {currentStepDetails.phase === 'share' && 'Finalizing...'}
                    </span>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Overall Progress</span>
                    <span className="font-bold text-primary">{currentProgress}%</span>
                  </div>
                  <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden p-[1px]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      style={{ width: `${currentProgress}%` }}
                    />
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/50 animate-in fade-in shake">
                    <div className="flex items-start gap-3">
                      <div className="bg-red-100 dark:bg-red-900/40 p-1.5 rounded-full shrink-0">
                        <Info className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <p className="text-sm text-red-600 dark:text-red-400 font-medium pt-0.5">
                        {error}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Terminal / Info - Enhanced Design */}
        <div className="space-y-4">
          {/* ZK Proof Terminal */}
          <div className="rounded-xl border border-border/40 bg-black/90 text-green-500 font-mono text-xs p-0 shadow-inner overflow-hidden flex flex-col h-[200px]">
             <div className="flex items-center justify-between bg-white/5 px-3 py-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Terminal className="h-3 w-3" />
                    <span className="opacity-70 font-semibold">ZK Proof Logs</span>
                </div>
                <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                </div>
             </div>
             <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent p-3 font-mono text-[10px] sm:text-xs leading-relaxed"
              >
                {proofLogs.length === 0 && proofStatus === 'idle' ? (
                  <div className="flex items-center gap-2 opacity-40 animate-pulse">
                     <span>_</span>
                     <span>Waiting to start...</span>
                  </div>
                ) : proofLogs.length === 0 && proofStatus === 'generating' ? (
                   <div className="flex items-center gap-2 opacity-60">
                     <Loader2 className="h-3 w-3 animate-spin" />
                     <span>Initializing proof generation...</span>
                   </div>
                ) : (
                  proofLogs.map((log, i) => (
                    <div key={i} className="break-all flex gap-2">
                      <span className="opacity-40 select-none min-w-[30px]">
                          {new Date().toLocaleTimeString([], {hour12: false, minute:'2-digit', second:'2-digit'})}
                      </span>
                      <span className={cn(
                          log.includes('ERROR') ? 'text-red-400' : 
                          log.includes('Successfully') ? 'text-green-400 font-bold' : 
                          'text-gray-300'
                      )}>{log}</span>
                    </div>
                  ))
                )}
                {proofStatus === 'generating' && (
                   <div className="animate-pulse text-green-500/50 mt-1">_ Processing...</div>
                )}
                {proofStatus === 'completed' && (
                   <div className="text-green-400 font-bold mt-2 border-t border-white/10 pt-2">
                      ✨ Proof Generation Complete
                   </div>
                )}
             </div>
          </div>

          {/* Steps List - Collapsible */}
          <div className="rounded-xl border border-border/40 bg-background/40 backdrop-blur p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/20 bg-muted/10">
                  <h4 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Detailed Steps</h4>
              </div>
              <div className="p-2 max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-border/50">
                {stepConfigs.map((step, index) => {
                  const status = getStepStatus(step)
                  // Only show current, next, and completed steps
                  if (status === 'pending' && step.key !== currentStep) return null
                  
                  return (
                    <div key={step.key} className={cn(
                        "flex items-center gap-3 p-2 rounded-lg transition-all duration-300",
                        step.key === currentStep ? "bg-primary/5 border border-primary/10 shadow-sm" : "hover:bg-muted/20"
                    )}>
                       <div className="flex-shrink-0 relative">
                          {status === 'complete' ? (
                             <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : step.key === currentStep ? (
                             <Loader2 className="h-4 w-4 text-primary animate-spin" />
                          ) : (
                             <Circle className="h-4 w-4 text-muted-foreground/30" />
                          )}
                       </div>
                       <div className="flex-1 min-w-0">
                           <p className={cn(
                             "text-xs font-medium truncate",
                             status === 'complete' ? "text-muted-foreground/70" :
                             step.key === currentStep ? "text-foreground" :
                             "text-muted-foreground/50"
                           )}>
                             {step.label}
                           </p>
                           {step.key === currentStep && step.description && (
                               <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                   {step.description}
                               </p>
                           )}
                       </div>
                    </div>
                  )
                })}
              </div>
          </div>
        </div>
      </div>
    </div>
  )
}
