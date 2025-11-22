import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { AlertCircle, Wallet, FileSignature, ArrowRight, Shield, Lock, Loader2, CheckCircle2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

export type UnifiedMintStep = 
  | 'proof-loading-email'
  | 'proof-importing-sdk'
  | 'proof-loading-blueprint'
  | 'proof-generating'
  | 'proof-validating'
  | 'proof-complete'
  | 'wallet-prompt'
  | 'wallet-connecting'
  | 'wallet-connected'
  | 'wallet-sign-prompt'
  | 'wallet-signing'
  | 'wallet-signed'
  | 'wallet-fee-prompt'
  | 'wallet-fee-paying'
  | 'wallet-complete'
  | 'mint-generating-artwork'
  | 'mint-submitting'
  | 'mint-confirming'
  | 'mint-complete';

interface UnifiedMintProgressProps {
  currentStep: UnifiedMintStep;
  onConnectWallet: () => void;
  onSignMessage: () => void;
  onPayFee: () => void;
  onChangeWallet?: () => void;
  walletAddress?: string;
  error?: string | null;
  // OTP flow props
  showOtpInput?: boolean;
  otpEmail?: string;
  otpCode?: string;
  onOtpEmailChange?: (email: string) => void;
  onOtpCodeChange?: (code: string) => void;
  isSendingOtp?: boolean;
  isVerifyingOtp?: boolean;
}

const stepConfig: Record<UnifiedMintStep, { label: string; description?: string; phase: 'proof' | 'wallet' | 'mint' }> = {
  'proof-loading-email': { label: 'Loading Email', phase: 'proof' },
  'proof-importing-sdk': { label: 'Importing SDK', phase: 'proof' },
  'proof-loading-blueprint': { label: 'Loading Blueprint', phase: 'proof' },
  'proof-generating': { label: 'Generating Proof', phase: 'proof' },
  'proof-validating': { label: 'Validating Proof', phase: 'proof' },
  'proof-complete': { label: 'Proof Complete', phase: 'proof' },
  'wallet-prompt': { label: 'Connect Wallet', phase: 'wallet', description: 'Connect your wallet to continue' },
  'wallet-connecting': { label: 'Connecting...', phase: 'wallet' },
  'wallet-connected': { label: 'Wallet Connected', phase: 'wallet' },
  'wallet-sign-prompt': { label: 'Sign Message', phase: 'wallet', description: 'Sign a message to verify ownership' },
  'wallet-signing': { label: 'Signing...', phase: 'wallet' },
  'wallet-signed': { label: 'Message Signed', phase: 'wallet' },
  'wallet-fee-prompt': { label: 'Pay Minting Fee', phase: 'wallet', description: 'Approve the transaction to mint your mark' },
  'wallet-fee-paying': { label: 'Paying Fee...', phase: 'wallet' },
  'wallet-complete': { label: 'Wallet Setup Complete', phase: 'wallet' },
  'mint-generating-artwork': { label: 'Generating Artwork', phase: 'mint' },
  'mint-submitting': { label: 'Submitting Transaction', phase: 'mint' },
  'mint-confirming': { label: 'Confirming...', phase: 'mint' },
  'mint-complete': { label: 'Mint Complete', phase: 'mint' },
};

export function UnifiedMintProgress({
  currentStep,
  onConnectWallet,
  onSignMessage,
  onPayFee,
  onChangeWallet,
  walletAddress,
  error,
  showOtpInput = false,
  otpEmail = '',
  otpCode = '',
  onOtpEmailChange,
  onOtpCodeChange,
  isSendingOtp = false,
  isVerifyingOtp = false,
}: UnifiedMintProgressProps) {
  const config = stepConfig[currentStep];
  const isWalletPhase = config.phase === 'wallet';
  
  const isLoading = currentStep.includes('loading') || currentStep.includes('connecting') || 
                    currentStep.includes('signing') || currentStep.includes('paying') ||
                    currentStep.includes('submitting') || currentStep.includes('confirming') ||
                    currentStep.includes('generating');
  
  const isPrompt = currentStep.includes('prompt');
  const isComplete = currentStep.includes('complete');

  return (
    <div className="space-y-4">
      {/* Current Step Display */}
      <div className={cn(
        "p-4 rounded-lg border transition-all",
        isLoading && "bg-[var(--glass-bg-secondary)] border-[var(--glass-border)]",
        isPrompt && "bg-[var(--glass-bg-primary)] border-[var(--glass-border)]",
        isComplete && "bg-green-500/10 border-green-500/30"
      )}>
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
          ) : isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <div className="h-5 w-5 rounded-full border-2 border-[var(--page-border-color)]" />
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--page-text-primary)]">
              {config.label}
            </h3>
            {config.description && (
              <p className="text-sm text-[var(--page-text-secondary)] mt-1">
                {config.description}
              </p>
            )}
            {walletAddress && isWalletPhase && (
              <p className="text-xs text-[var(--page-text-muted)] mt-1 font-mono">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* OTP Input Section */}
      {showOtpInput && currentStep === 'wallet-prompt' && (
        <div className="space-y-3 pt-2">
          {!otpCode && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--page-text-primary)]">
                Email Address
              </label>
              <Input
                type="email"
                value={otpEmail}
                onChange={(e) => onOtpEmailChange?.(e.target.value)}
                placeholder="your@email.com"
                disabled={isSendingOtp}
                className="w-full"
              />
            </div>
          )}
          {otpEmail && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--page-text-primary)]">
                Enter OTP Code
              </label>
              <Input
                type="text"
                value={otpCode}
                onChange={(e) => onOtpCodeChange?.(e.target.value)}
                placeholder="123456"
                disabled={isVerifyingOtp}
                maxLength={6}
                className="w-full text-center text-lg tracking-widest"
              />
              <p className="text-xs text-[var(--page-text-secondary)]">
                Check your email ({otpEmail}) for the verification code
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {isPrompt && (
        <div className="flex gap-3 pt-2">
          {currentStep === 'wallet-prompt' && (
            <Button 
              onClick={onConnectWallet} 
              className="flex-1"
              disabled={isSendingOtp || isVerifyingOtp || (showOtpInput && !otpEmail)}
            >
              {isSendingOtp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : isVerifyingOtp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : showOtpInput && otpCode ? (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Verify OTP
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  {showOtpInput ? 'Send OTP' : 'Connect Wallet'}
                </>
              )}
            </Button>
          )}
          {currentStep === 'wallet-sign-prompt' && (
            <Button onClick={onSignMessage} className="flex-1">
              <FileSignature className="mr-2 h-4 w-4" />
              Sign Message
            </Button>
          )}
          {currentStep === 'wallet-fee-prompt' && (
            <Button onClick={onPayFee} className="flex-1">
              Pay Fee
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {onChangeWallet && isWalletPhase && walletAddress && (
            <Button onClick={onChangeWallet} variant="outline" size="sm">
              Change Wallet
            </Button>
          )}
        </div>
      )}

      {/* Security Footer */}
      <div className="flex items-center justify-center gap-4 pt-2 text-xs text-[var(--page-text-muted)]">
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
  );
}
