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
      // Search for emails with these keywords - cast a wide net
      keywords: ['confirmed', 'registration', 'subscribed', 'welcome', 'event', 'thanks', 'joining', 'attended', 'thank you'],
    },
    processing: {
      include: [
        'thanks for joining',           // Post-event attendance (PRIMARY)
        'thank you for joining',        // Alternative wording
        'thanks for attending',         // Alternative wording
        'thank you for attending',      // Alternative wording
        'you attended',                 // Attendance confirmation
        'attendance confirmed',         // Attendance confirmation
        'confirmed for',                // Generic confirmation (SECONDARY)
        'registration confirmed',       // Pre-event registration (FALLBACK)
        'you\'re registered',           // Registration (FALLBACK)
        'rsvp confirmed',               // RSVP (FALLBACK)
      ],
      exclude: [
        'pending approval', 'awaiting approval', 'waiting for approval', // Pending (but NOT just "pending")
        'reminder:', 'starting soon', 'happening tomorrow', 'happening today', // Reminders (more specific)
        'event update', 'has been changed', 'canceled', 'cancelled', // Updates (more specific)
        'failed to register', 'registration failed', 'registration unsuccessful', // Failed registrations
        // REMOVED: 'unsubscribe' - this appears in email footers and blocks valid emails!
        // REMOVED: generic 'reminder', 'update', 'pending' - too aggressive
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
