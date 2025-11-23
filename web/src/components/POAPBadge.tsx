import type { GmailMessageDetail } from '../types/gmail';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, XCircle, Bookmark, Calendar, Fingerprint } from 'lucide-react';

interface POAPBadgeProps {
  email: GmailMessageDetail;
  size?: 'sm' | 'md' | 'lg';
  showVerified?: boolean;
  status?: 'pending' | 'verified' | 'failed';
  className?: string;
}

export function POAPBadge({ 
  email, 
  size = 'md', 
  showVerified = false,
  status,
  className 
}: POAPBadgeProps) {
  // Get sender name and extract source
  const senderMatch = email.from.match(/^"?(.*?)"? <(.*)>$/);
  const senderName = senderMatch ? senderMatch[1] : email.from.split('<')[0].trim();
  
  // Format date for badge
  const date = new Date(email.date);
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(date);

  // Clean event name from subject
  const eventName = email.subject.replace(/^.*Registration Confirmation:?\s*/i, '').trim() || email.subject;

  // Determine size classes
  const sizeClasses = {
    sm: 'w-48 min-h-[240px]',
    md: 'w-64 min-h-[320px]',
    lg: 'w-80 min-h-[400px]',
  };

  const contentSizeClasses = {
    sm: 'p-4 gap-3',
    md: 'p-6 gap-4',
    lg: 'p-8 gap-6',
  };

  const titleSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const iconSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className={cn(
      "relative group perspective-1000",
      sizeClasses[size],
      className
    )}>
      <div className={cn(
        "absolute inset-0 rounded-2xl border shadow-xl transition-all duration-500 transform-style-3d group-hover:rotate-y-12",
        "bg-gradient-to-br from-[var(--glass-bg-primary)] to-[var(--glass-bg-secondary)]",
        "border-[var(--glass-border)]",
        "backdrop-blur-[var(--glass-blur)]"
      )}>
        {/* Status Indicator */}
        {showVerified && status && (
          <div className="absolute top-4 right-4 z-20">
            {status === 'verified' && (
              <div className="bg-green-500/10 text-green-600 p-1.5 rounded-full border border-green-500/20 shadow-sm backdrop-blur-md">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            {status === 'pending' && (
              <div className="bg-blue-500/10 text-blue-600 p-1.5 rounded-full border border-blue-500/20 shadow-sm backdrop-blur-md animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
            {status === 'failed' && (
              <div className="bg-red-500/10 text-red-600 p-1.5 rounded-full border border-red-500/20 shadow-sm backdrop-blur-md">
                <XCircle className="w-5 h-5" />
              </div>
            )}
          </div>
        )}

        {/* Badge Content */}
        <div className={cn("h-full flex flex-col items-center text-center", contentSizeClasses[size])}>
          {/* Badge Icon/Logo */}
          <div className={cn(
            "rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-2 ring-1 ring-white/20 shadow-inner",
            iconSizeClasses[size]
          )}>
            <Bookmark className={cn("text-[var(--page-text-primary)] opacity-80", 
              size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8'
            )} />
          </div>

          {/* Event Info */}
          <div className="flex-1 flex flex-col items-center justify-center gap-2 w-full">
            <h3 className={cn(
              "font-bold text-[var(--page-text-primary)] line-clamp-3 leading-tight",
              titleSizeClasses[size]
            )}>
              {eventName}
            </h3>
            <p className="text-sm text-[var(--page-text-secondary)] font-medium">
              {senderName}
            </p>
          </div>

          {/* Metadata Footer */}
          <div className="w-full pt-4 border-t border-[var(--glass-border)] flex items-center justify-between text-xs text-[var(--page-text-muted)]">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5" />
              <span className="font-mono opacity-70">#{email.id.slice(-4)}</span>
            </div>
          </div>
        </div>

        {/* Shine Effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>
    </div>
  );
}
