import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

export type MintStep = 'idle' | 'validating' | 'connecting' | 'generating' | 'minting' | 'complete';

interface ProgressIndicatorProps {
  currentStep: MintStep;
  className?: string;
}

const steps: Array<{ key: MintStep; label: string }> = [
  { key: 'validating', label: 'Validating Proof' },
  { key: 'connecting', label: 'Connecting Wallet' },
  { key: 'generating', label: 'Generating Artwork' },
  { key: 'minting', label: 'Minting NFT' },
  { key: 'complete', label: 'Complete' },
];

export function ProgressIndicator({ currentStep, className }: ProgressIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);
  
  return (
    <div className={cn("w-full space-y-4", className)}>
      {steps.map((step, index) => {
        const isActive = step.key === currentStep;
        const isComplete = currentIndex > index;
        const isPending = currentIndex < index;

        return (
          <div 
            key={step.key}
            className={cn(
              "relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-300",
              isActive && "bg-[var(--glass-bg-secondary)] border-[var(--glass-border)] shadow-sm",
              isComplete && "bg-[var(--glass-bg-primary)] border-[var(--glass-border)] opacity-80",
              isPending && "opacity-50 border-transparent"
            )}
          >
            {/* Connector Line */}
            {index !== steps.length - 1 && (
              <div className={cn(
                "absolute left-[22px] top-14 bottom-[-16px] w-0.5 rounded-full transition-colors duration-300",
                isComplete ? "bg-[var(--page-text-primary)]" : "bg-[var(--page-border-color)]"
              )} />
            )}

            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {isComplete ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : isActive ? (
                <Loader2 className="w-6 h-6 text-[var(--page-text-primary)] animate-spin" />
              ) : (
                <Circle className="w-6 h-6 text-[var(--page-text-muted)]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className={cn(
                "font-medium text-sm transition-colors duration-300",
                isActive && "text-[var(--page-text-primary)]",
                isComplete && "text-green-600 dark:text-green-400",
                isPending && "text-[var(--page-text-secondary)]"
              )}>
                {step.label}
              </h4>
            </div>
          </div>
        );
      })}
    </div>
  );
}

