// src/components/EmailCard.tsx
import React from 'react';
import type { GmailMessageDetail } from '../types/gmail';
import { getEmailSource } from '../lib/utils';
import { Badge } from './ui/badge'; // Assuming a shadcn/ui badge component

interface EmailCardProps {
  email: GmailMessageDetail;
  onSelect: (email: GmailMessageDetail) => void;
  isSelected: boolean;
}

export const EmailCard: React.FC<EmailCardProps> = ({ email, onSelect, isSelected }) => {
  const source = getEmailSource(email);

  return (
    <div 
      className={`p-4 border rounded-lg cursor-pointer ${isSelected ? 'border-primary' : 'border-border'}`}
      onClick={() => onSelect(email)}
    >
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">{email.subject}</h3>
        {source !== 'other' && <Badge variant="outline">{source}</Badge>}
      </div>
      <p className="text-sm text-muted-foreground truncate">{email.snippet}</p>
    </div>
  );
};
