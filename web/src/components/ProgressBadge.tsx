import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

interface ProgressBadgeProps {
  label: string
  status: 'complete' | 'active' | 'pending'
  icon: LucideIcon
  className?: string
}

export function ProgressBadge({ label, status, icon: Icon, className }: ProgressBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
        status === 'complete' && "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
        status === 'active' && "bg-primary/10 border-primary/20 text-primary",
        status === 'pending' && "bg-muted/50 border-muted text-muted-foreground",
        className
      )}
    >
      <div className="relative flex-shrink-0">
        {status === 'active' && (
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        )}
        <Icon className={cn("h-4 w-4", status === 'active' && "animate-pulse")} />
      </div>
      
      <span className="text-xs font-medium whitespace-nowrap truncate">
        {label}
      </span>

      <div className="ml-auto pl-2">
        {status === 'complete' ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : status === 'active' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Circle className="h-3 w-3" />
        )}
      </div>
    </div>
  )
}

