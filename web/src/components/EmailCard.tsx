import type { GmailMessageDetail } from '../types/gmail';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailCardProps {
  email: GmailMessageDetail;
  onMarkIt?: () => void;
  isLoading?: boolean;
  className?: string;
}

export default function EmailCard({ email, onMarkIt, isLoading, className }: EmailCardProps) {
  // Get sender name and email
  const senderMatch = email.from.match(/^"?(.*?)"? <(.*)>$/);
  const senderName = senderMatch ? senderMatch[1] : email.from.split('<')[0].trim();
  
  // Format date
  const date = new Date(email.date);
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);

  return (
    <Card className={cn("card-glass hover:border-[var(--page-border-color)] transition-all duration-300 group", className)}>
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-[var(--page-text-primary)] truncate pr-2">
              {senderName}
            </h3>
            <span className="text-xs text-[var(--page-text-muted)] whitespace-nowrap flex-shrink-0">
              {formattedDate}
            </span>
          </div>
          
          <h4 className="text-sm font-medium text-[var(--page-text-secondary)] mb-1 truncate">
            {email.subject}
          </h4>
          
          <p className="text-xs text-[var(--page-text-muted)] line-clamp-2">
            {email.snippet}
          </p>
        </div>

        <div className="flex-shrink-0 self-center">
          <Button
            variant="default"
            size="sm"
            onClick={onMarkIt}
            disabled={isLoading || !onMarkIt}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Mark it
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
