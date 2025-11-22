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
import { Loader2, CheckCircle2, Circle, Wallet, FileCheck, Coins, Zap, Shield, ChevronDown, Info, ArrowRight } from 'lucide-react'
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
  onSignMessage?: () => void
  onPayFee?: () => void
  onChangeWallet?: () => void
  walletAddress?: string
  error?: string | null
  // Support for OTP flow props (kept for compatibility, but might need refactoring if not used)
  showOtpInput?: boolean
  otpEmail?: string
  otpCode?: string
  onOtpEmailChange?: (email: string) => void
  onOtpCodeChange?: (code: string) => void
  isSendingOtp?: boolean
  isVerifyingOtp?: boolean
}

export function UnifiedMintProgress({
  currentStep,
  className,
  onConnectWallet,
  onSignMessage,
  onPayFee,
  onChangeWallet,
  walletAddress,
  error,
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
    <div className={cn('space-y-4', className)}>
      {/* Horizontal Timeline - Top */}
      <div className="flex items-center justify-center gap-2 px-4 py-3">
        {phaseGroups.map((group, index) => {
          const phaseStatus = getPhaseStatus(group.phase)
          const isActive = phaseStatus === 'active'
          const isComplete = phaseStatus === 'complete'
          
          const PhaseIcon = group.icon

          return (
            <React.Fragment key={group.phase}>
              {/* Step Badge */}
              <div className="flex-1 flex justify-center px-2">
                <ProgressBadge
                  label={`${index + 1}. ${group.shortTitle}`}
                  status={isComplete ? 'complete' : isActive ? 'active' : 'pending'}
                  icon={PhaseIcon as any}
                  className="w-full max-w-[180px]"
                />
              </div>
              {/* Arrow */}
              {index < phaseGroups.length - 1 && (
                <ArrowRight className={cn(
                  'h-4 w-4 text-muted-foreground flex-shrink-0',
                  index < phaseGroups.findIndex(g => g.phase === currentPhase) && 'text-green-500'
                )} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Current Step Card - Main Focus */}
      {currentStepDetails && currentPhaseGroup && (
        <Card className="overflow-hidden border-[var(--figma-card-stroke)] backdrop-blur-[var(--figma-card-blur)] bg-[var(--modal-bg)]">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg',
                getStepStatus(currentStepDetails) === 'complete' && 'bg-green-500/10',
                getStepStatus(currentStepDetails) !== 'complete' && 'bg-primary/10'
              )}>
                {getStepStatus(currentStepDetails) === 'complete' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : currentStepDetails.key.includes('loading') || currentStepDetails.key.includes('generating') || currentStepDetails.key.includes('connecting') || currentStepDetails.key.includes('signing') || currentStepDetails.key.includes('paying') || currentStepDetails.key.includes('submitting') || currentStepDetails.key.includes('confirming') ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                  <Circle className="h-4 w-4 text-primary fill-primary" />
                )}
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm">
                  {currentStepDetails.label}
                </CardTitle>
                {currentStepDetails.description && (
                  <CardDescription className="mt-0.5 flex items-start gap-1 text-xs">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{currentStepDetails.description}</span>
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {/* Action Buttons */}
            {currentStepDetails.requiresAction && (
              <div className="space-y-3">
                {currentStepDetails.key === 'wallet-prompt' && onConnectWallet && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--page-text-secondary)' }}>
                      <Info className="h-3 w-3" />
                      <span>Will mint on Base network</span>
                    </div>
                    <Button
                      onClick={onConnectWallet}
                      size="lg"
                      className="gap-2 w-full h-11"
                    >
                      <Wallet className="h-4 w-4" />
                      Connect Wallet
                    </Button>
                  </div>
                )}
                
                {currentStepDetails.key === 'wallet-sign-prompt' && onSignMessage && walletAddress && (
                  <div className="space-y-2">
                    <Card className="border-[var(--figma-card-stroke)] bg-[var(--modal-bg)]">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardDescription className="text-xs mb-0.5">Connected Wallet</CardDescription>
                            <p className="font-mono font-semibold text-xs" style={{ color: 'var(--page-text-primary)' }}>
                              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                            </p>
                          </div>
                          {onChangeWallet && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={onChangeWallet}
                              className="h-7 px-2 text-xs"
                            >
                              Change
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--page-text-secondary)' }}>
                      <Shield className="h-3 w-3" />
                      <span>Sign to verify ownership on Base</span>
                    </div>
                    <Button
                      onClick={onSignMessage}
                      size="lg"
                      className="gap-2 w-full h-11"
                    >
                      <FileCheck className="h-4 w-4" />
                      Sign Message
                    </Button>
                  </div>
                )}
                
                {currentStepDetails.key === 'wallet-fee-prompt' && onPayFee && (
                  <div className="space-y-2">
                    <Card className="border-[var(--figma-card-stroke)] bg-[var(--modal-bg)]">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <CardDescription className="text-xs">Minting Fee</CardDescription>
                          <div className="flex items-center gap-1.5">
                            <USDCLogo 
                              className="h-5 w-5 flex-shrink-0"
                              style={{ color: 'var(--page-text-primary)' }}
                            />
                            <span className="text-base font-bold" style={{ color: 'var(--page-text-primary)' }}>
                              1 USDC
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--page-text-secondary)' }}>
                      <Zap className="h-3 w-3" />
                      <span>Fast and low-cost minting on Base</span>
                    </div>
                    <Button
                      onClick={onPayFee}
                      size="lg"
                      className="gap-2 w-full h-11"
                    >
                      <Coins className="h-4 w-4" />
                      Pay Minting Fee
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Loading State */}
            {!currentStepDetails.requiresAction && (
              <div className="flex items-center gap-3 py-3">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                <span className="text-sm font-medium" style={{ color: 'var(--page-text-secondary)' }}>
                  {currentStepDetails.phase === 'proof' && 'Generating ZK-proof...'}
                  {currentStepDetails.phase === 'wallet' && 'Processing wallet transaction...'}
                  {currentStepDetails.phase === 'mint' && 'Minting on Base network...'}
                </span>
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: 'var(--page-text-secondary)' }}>
                  Overall Progress
                </span>
                <span className="text-xs font-bold" style={{ color: 'var(--page-text-primary)' }}>
                  {currentProgress}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${currentProgress}%`,
                    backgroundColor: 'var(--primary)',
                  }}
                />
              </div>
            </div>

            {/* Detailed Steps - Expandable */}
            {expandedPhase === currentPhase && currentPhaseGroup && (
              <Card className="mt-3 border-[var(--figma-card-stroke)] bg-[var(--modal-bg)]">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs">
                        {currentPhaseGroup.title} Steps
                      </CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setExpandedPhase(null)}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronDown className="h-3 w-3 rotate-180" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {currentPhaseGroup.steps.map((step) => {
                        const stepStatus = getStepStatus(step)
                        const isCurrentStep = step.key === currentStep
                        return (
                          <div key={step.key} className="flex items-center gap-2 py-1">
                            <div className="flex-shrink-0">
                              {stepStatus === 'complete' ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : isCurrentStep ? (
                                <Loader2 className="h-3 w-3 text-primary animate-spin" />
                              ) : (
                                <Circle className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <span className={cn(
                              'text-xs',
                              stepStatus === 'complete' && 'text-green-600 dark:text-green-400',
                              isCurrentStep && 'text-primary font-semibold',
                              stepStatus === 'pending' && 'text-muted-foreground'
                            )}>
                              {step.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Expand/Collapse Button */}
            {!expandedPhase && currentPhase && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setExpandedPhase(currentPhase)}
                className="gap-2 w-full h-8 text-xs"
                style={{ color: 'var(--page-text-secondary)' }}
              >
                <ChevronDown className="h-3 w-3" />
                Show detailed steps
              </Button>
            )}

            {/* Error Display */}
            {error && (
              <Card className="border-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-500/30">
                <CardContent className="p-3">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {error}
                  </p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
