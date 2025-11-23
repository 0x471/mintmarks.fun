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

import { useState } from 'react'
import React from 'react'
import { Loader2, CheckCircle2, Circle, Wallet, FileCheck, Coins, Zap, Shield, ChevronDown, Info, ArrowRight, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { ProgressBadge } from './ProgressBadge'
import { USDCLogo } from './USDCLogo'

// Simplified 3-step unified flow
export type UnifiedMintStep = 
  // Step 1: Proof Generation (automatic)
  | 'proof-loading-email'
  | 'proof-importing-sdk'
  | 'proof-loading-blueprint'
  | 'proof-generating'
  | 'proof-validating'
  | 'proof-complete'
  
  // Step 2: Connect Wallet (all wallet actions in one step)
  | 'wallet-prompt'           // Show "Connect Wallet" button
  | 'wallet-connecting'       // User clicked, wallet popup
  | 'wallet-connected'        
  | 'wallet-sign-prompt'      // Show "Sign Message" prompt
  | 'wallet-signing'          // User signing
  | 'wallet-signed'
  | 'wallet-fee-prompt'       // Show "$1 Minting Fee" button
  | 'wallet-fee-paying'       // User paying
  | 'wallet-complete'
  
  // Step 3: Mint (automatic)
  | 'mint-generating-artwork'
  | 'mint-submitting'
  | 'mint-confirming'
  | 'mint-complete'

interface StepConfig {
  key: UnifiedMintStep
  label: string
  description?: string
  phase: 'proof' | 'wallet' | 'mint'
  progress: number
  requiresAction?: boolean
  icon?: React.ComponentType<{ className?: string }>
}

const stepConfigs: StepConfig[] = [
  // Step 1: Proof Generation (0-33%)
  { key: 'proof-loading-email', label: 'Loading Email Content', phase: 'proof', progress: 5 },
  { key: 'proof-importing-sdk', label: 'Importing ZK SDK', phase: 'proof', progress: 10 },
  { key: 'proof-loading-blueprint', label: 'Loading Blueprint', phase: 'proof', progress: 15 },
  { key: 'proof-generating', label: 'Generating ZK Proof', description: 'This may take 30-60 seconds', phase: 'proof', progress: 25 },
  { key: 'proof-validating', label: 'Validating Proof', phase: 'proof', progress: 30 },
  { key: 'proof-complete', label: 'Proof Ready', phase: 'proof', progress: 33 },
  
  // Step 2: Connect Wallet (33-66%) - ALL wallet actions here
  { key: 'wallet-prompt', label: 'Connect Wallet', description: 'Click to connect your wallet', phase: 'wallet', progress: 38, requiresAction: true },
  { key: 'wallet-connecting', label: 'Connecting Wallet', phase: 'wallet', progress: 42 },
  { key: 'wallet-connected', label: 'Wallet Connected', phase: 'wallet', progress: 45 },
  { key: 'wallet-sign-prompt', label: 'Sign Message', description: 'Sign to verify ownership', phase: 'wallet', progress: 50, requiresAction: true },
  { key: 'wallet-signing', label: 'Signing Message', phase: 'wallet', progress: 54 },
  { key: 'wallet-signed', label: 'Message Signed', phase: 'wallet', progress: 57 },
  { key: 'wallet-fee-prompt', label: 'Pay Minting Fee', description: 'Approve $1 minting fee', phase: 'wallet', progress: 60, requiresAction: true },
  { key: 'wallet-fee-paying', label: 'Processing Payment', phase: 'wallet', progress: 63 },
  { key: 'wallet-complete', label: 'Wallet Setup Complete', phase: 'wallet', progress: 66 },
  
  // Step 3: Mint (66-100%)
  { key: 'mint-generating-artwork', label: 'Generating NFT Artwork', phase: 'mint', progress: 75 },
  { key: 'mint-submitting', label: 'Submitting to Blockchain', phase: 'mint', progress: 85 },
  { key: 'mint-confirming', label: 'Waiting for Confirmation', description: 'This may take a few moments', phase: 'mint', progress: 95 },
  { key: 'mint-complete', label: 'NFT Minted Successfully!', phase: 'mint', progress: 100 },
]

interface PhaseGroup {
  phase: 'proof' | 'wallet' | 'mint'
  title: string
  shortTitle: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  steps: StepConfig[]
}

const phaseGroups: PhaseGroup[] = [
  {
    phase: 'proof',
    title: 'Step 1: Proof Generation',
    shortTitle: 'Proof w/ ZK-email',
    description: 'Generating zero-knowledge proof using ZK-email',
    icon: Shield,
    steps: stepConfigs.filter(s => s.phase === 'proof'),
  },
  {
    phase: 'wallet',
    title: 'Step 2: Connect Your Wallet',
    shortTitle: 'Wallet',
    description: 'Connect, sign, and pay minting fee on Base',
    icon: Wallet,
    steps: stepConfigs.filter(s => s.phase === 'wallet'),
  },
  {
    phase: 'mint',
    title: 'Step 3: Mint on Base',
    shortTitle: 'Mint',
    description: 'Creating your NFT on Base network',
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
  onSignMessage?: () => void
  onPayFee?: () => void
  onChangeWallet?: () => void
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
}

export function UnifiedMintProgress({
  currentStep,
  className,
  onConnectWallet,
  onConnectCDPWallet,
  onConnectExternalWallet,
  onSignMessage,
  onPayFee,
  onChangeWallet,
  walletAddress,
  error,
  showOtpInput,
  otpEmail,
  otpCode,
  onOtpCodeChange,
  isSendingOtp,
  isVerifyingOtp,
  hasExternalWallet = false,
}: UnifiedMintProgressProps) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null)
  
  const currentStepConfig = stepConfigs.find(s => s.key === currentStep)
  const currentProgress = currentStepConfig?.progress || 0
  const currentPhase = currentStepConfig?.phase

  // Determine phase status
  const getPhaseStatus = (phase: 'proof' | 'wallet' | 'mint'): 'complete' | 'active' | 'pending' => {
    if (!currentPhase) return 'pending'
    
    const phaseOrder = ['proof', 'wallet', 'mint']
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
    <div className={cn('space-y-6', className)}>
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
                  className="min-w-[120px] sm:min-w-[140px] shadow-sm"
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
                ) : currentStepDetails.key.includes('loading') || currentStepDetails.key.includes('generating') || currentStepDetails.key.includes('connecting') || currentStepDetails.key.includes('signing') || currentStepDetails.key.includes('paying') || currentStepDetails.key.includes('submitting') || currentStepDetails.key.includes('confirming') ? (
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
                      <span>We'll help you create or connect a wallet to mint on Base.</span>
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
                            <span className="font-medium">Connect with Email (Recommended)</span>
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
                        
                        {/* Fallback: Generic connect wallet */}
                        {!onConnectCDPWallet && !onConnectExternalWallet && onConnectWallet && (
                          <Button
                            onClick={onConnectWallet}
                            size="lg"
                            className="gap-3 w-full h-12 rounded-xl"
                          >
                            <Wallet className="h-5 w-5" />
                            Connect Wallet
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
                      className="gap-2 w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/20 transition-all duration-300 hover:scale-[1.01]"
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
                  {currentStepDetails.phase === 'proof' && 'Generating Zero-Knowledge Proof...'}
                  {currentStepDetails.phase === 'wallet' && 'Waiting for wallet confirmation...'}
                  {currentStepDetails.phase === 'mint' && 'Minting your NFT on Base...'}
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

            {/* Detailed Steps - Expandable */}
            {expandedPhase === currentPhase && currentPhaseGroup && (
              <div className="mt-2 pt-4 border-t border-border/40 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {currentPhaseGroup.title}
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setExpandedPhase(null)}
                    className="h-6 w-6 p-0 hover:bg-muted/50 rounded-full"
                  >
                    <ChevronDown className="h-3.5 w-3.5 rotate-180 opacity-70" />
                  </Button>
                </div>
                <div className="space-y-2 pl-1">
                  {currentPhaseGroup.steps.map((step, index) => {
                    const stepStatus = getStepStatus(step)
                    const isCurrentStep = step.key === currentStep
                    return (
                      <div key={step.key} className="flex items-center gap-3 py-1">
                        <div className="flex-shrink-0 relative">
                          {stepStatus === 'complete' ? (
                            <div className="bg-green-500/10 rounded-full p-0.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                            </div>
                          ) : isCurrentStep ? (
                            <div className="bg-primary/10 rounded-full p-0.5">
                              <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                            </div>
                          ) : (
                            <div className="bg-muted rounded-full p-0.5">
                              <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                            </div>
                          )}
                          {isCurrentStep && index > 0 && (
                             <div className="absolute top-full left-1/2 w-px h-full bg-border -translate-x-1/2 -z-10" />
                          )}
                        </div>
                        <span className={cn(
                          'text-sm transition-colors',
                          stepStatus === 'complete' && 'text-muted-foreground line-through opacity-70',
                          isCurrentStep && 'text-foreground font-medium',
                          stepStatus === 'pending' && 'text-muted-foreground/60'
                        )}>
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Expand/Collapse Button */}
            {!expandedPhase && currentPhase && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setExpandedPhase(currentPhase)}
                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors"
              >
                <ChevronDown className="h-3 w-3 mr-2" />
                Show detailed steps
              </Button>
            )}

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
  )
}
