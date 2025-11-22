// src/config/emailFilters.ts

export type EmailSource = 'luma' | 'substack';

export interface FilterConfig {
  apiQuery: {
    domains: string[];
    keywords: string[];
  };
  processing: {
    include: string[];
    exclude: string[];
  };
}

export const emailFilterConfig: Record<EmailSource, FilterConfig> = {
  luma: {
    apiQuery: {
      domains: ['luma.co', 'lu.ma', 'user.luma-mail.com', 'luma-mail.com'],
      keywords: ['confirmed', 'registration', 'subscribed', 'welcome', 'event'],
    },
    processing: {
      include: ['registration confirmed', 'confirmed for', 'you\'re registered', 'rsvp confirmed', 'attendance confirmed'],
      exclude: [
        'pending', 'pending approval', 'awaiting approval', 'waiting', // Pending
        'reminder', 'starting soon', 'happening', 'tomorrow', 'today', // Reminders
        'update', 'changed', 'canceled', 'cancelled', // Updates
        'unsubscribe', 'unsubscribed', 'unsubscribe from', // Unsubscribe
      ],
    },
  },
  substack: {
    apiQuery: {
      domains: ['substack.com'],
      keywords: ['confirmed', 'registration', 'subscribed', 'welcome', 'event'],
    },
    processing: {
      include: [
        'confirmed', 'welcome', 'subscribed', 'subscription', 'registered',
        'registration', 'event', 'rsvp', 'you\'re in', 'you\'re registered',
        'you\'re subscribed',
      ],
      exclude: [
        'unsubscribe', 'unsubscribed', 'unsubscribe from', 'manage preferences',
        'preferences', 'email preferences', 'notification settings',
        // Also include general exclusions
        'pending', 'pending approval', 'awaiting approval', 'waiting',
        'reminder', 'starting soon', 'happening', 'tomorrow', 'today',
        'update', 'changed', 'canceled', 'cancelled',
      ],
    },
  },
};
