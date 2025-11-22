// src/pages/CreateMark.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button'; // Assuming shadcn/ui
import { Sparkles, Bookmark } from 'lucide-react'; // Assuming lucide-react for icons
import type { GmailMessageDetail } from '../types/gmail';
import { getEmailSource } from '../lib/utils';
import { EmailCard } from '../components/EmailCard';

interface CreateMarkProps {
  lumaEmails: GmailMessageDetail[]; // Assuming emails are passed as props
}

export const CreateMark: React.FC<CreateMarkProps> = ({ lumaEmails }) => {
  const [emailFilter, setEmailFilter] = useState<'all' | 'luma' | 'substack'>('all');
  const [visibleEmailsCount, setVisibleEmailsCount] = useState(10);
  const [selectedEmail, setSelectedEmail] = useState<GmailMessageDetail | null>(null);

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleEmailsCount(10);
  }, [emailFilter]);

  const filteredEmails = lumaEmails.filter(email => {
    if (emailFilter === 'all') return true;
    return getEmailSource(email) === emailFilter;
  });

  const visibleEmails = filteredEmails.slice(0, visibleEmailsCount);

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Button
          variant={emailFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEmailFilter('all')}
        >
          All ({lumaEmails.length})
        </Button>
        <Button
          variant={emailFilter === 'luma' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEmailFilter('luma')}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Luma ({lumaEmails.filter(e => getEmailSource(e) === 'luma').length})
        </Button>
        <Button
          variant={emailFilter === 'substack' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEmailFilter('substack')}
        >
          <Bookmark className="h-3.5 w-3.5" />
          Substack ({lumaEmails.filter(e => getEmailSource(e) === 'substack').length})
        </Button>
      </div>

      <div className="grid gap-4">
        {visibleEmails.map(email => (
          <EmailCard
            key={email.id}
            email={email}
            onSelect={setSelectedEmail}
            isSelected={selectedEmail?.id === email.id}
          />
        ))}
      </div>

      {visibleEmailsCount < filteredEmails.length && (
        <Button variant="outline" onClick={() => setVisibleEmailsCount(c => c + 10)}>
          Show More
        </Button>
      )}
    </div>
  );
};
