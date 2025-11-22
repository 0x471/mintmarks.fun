import { emailFilterConfig } from '../config/emailFilters'
import type { GmailSearchResponse, GmailMessageResponse, GmailMessageDetail } from '../types/gmail'
import { getEmailSource } from '../lib/utils'

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

export function isTokenExpiredError(status: number): boolean {
  return status === 401
}

export interface EmailSearchResult {
  emails: GmailMessageDetail[]
  nextPageToken?: string
  hasMore: boolean
}

// Token expired error class
export class TokenExpiredError extends Error {
  constructor(message: string = 'Token expired. Please sign in again.') {
    super(message)
    this.name = 'TokenExpiredError'
  }
}

// Get email metadata (internal function)
async function getEmailMetadata(
  accessToken: string,
  messageId: string,
  retries = 3
): Promise<GmailMessageDetail> {
  try {
    const response = await fetch(
      `${GMAIL_API_BASE}/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      if (isTokenExpiredError(response.status)) {
        throw new TokenExpiredError()
      }

      // Rate limiting handling
      if (response.status === 429 && retries > 0) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10)
        const delay = retryAfter * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        return getEmailMetadata(accessToken, messageId, retries - 1)
      }

      throw new Error(`Gmail API error: ${response.status}`)
    }

    const data: GmailMessageResponse = await response.json()

    // Extract information from headers
    const headers = data.payload.headers
    const subject = headers.find((h) => h.name === 'Subject')?.value || '(No subject)'
    const from = headers.find((h) => h.name === 'From')?.value || ''
    const date = headers.find((h) => h.name === 'Date')?.value || ''

    return {
      id: data.id,
      subject,
      date,
      from,
      snippet: data.snippet || '',
    }
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error
    }
    throw new Error(`Failed to fetch email metadata: ${error}`)
  }
}

// Search emails
export async function searchEmails(
  accessToken: string,
  query: string = '',
  pageToken?: string,
  pageSize: number = 30
): Promise<EmailSearchResult> {
  try {
    // Build API URL
    let url = `${GMAIL_API_BASE}/messages?maxResults=${pageSize}`
    if (query) {
      url += `&q=${encodeURIComponent(query)}`
    }
    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (isTokenExpiredError(response.status)) {
        throw new TokenExpiredError()
      }
      throw new Error(`Gmail API error: ${response.status}`)
    }

    const data: GmailSearchResponse = await response.json()

    if (!data.messages || data.messages.length === 0) {
      return {
        emails: [],
        hasMore: false,
      }
    }

    // Fetch email details in batches to avoid rate limiting
    const batchSize = 10
    const delayMs = 500
    const emailDetails: GmailMessageDetail[] = []

    for (let i = 0; i < data.messages.length; i += batchSize) {
      const batch = data.messages.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(msg => getEmailMetadata(accessToken, msg.id))
      )
      emailDetails.push(...batchResults)

      // Delay between batches
      if (i + batchSize < data.messages.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    return {
      emails: emailDetails,
      nextPageToken: data.nextPageToken,
      hasMore: !!data.nextPageToken,
    }
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error
    }
    throw new Error(`Failed to search emails: ${error}`)
  }
}

// Get raw email content
export async function getEmailRaw(accessToken: string, messageId: string): Promise<string> {
  try {
    const response = await fetch(
      `${GMAIL_API_BASE}/messages/${messageId}?format=raw`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      if (isTokenExpiredError(response.status)) {
        throw new TokenExpiredError()
      }
      throw new Error(`Gmail API error: ${response.status}`)
    }

    const data = await response.json()

    // Base64url decode - handle Chrome-specific encoding issues
    const base64 = data.raw.replace(/-/g, '+').replace(/_/g, '/')
    
    // Use try-catch for better error handling in Chrome
    let decodedEmail: string;
    try {
      decodedEmail = atob(base64); // RFC2822 format (.eml)
    } catch (error) {
      console.error('[Gmail] Base64 decode error:', error);
      // Try with padding if decoding fails
      const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4);
      decodedEmail = atob(paddedBase64);
    }
    
    // Ensure we have proper line endings (Chrome might handle this differently)
    if (!decodedEmail.includes('\r\n') && decodedEmail.includes('\n')) {
      decodedEmail = decodedEmail.replace(/\n/g, '\r\n');
    }
    
    return decodedEmail;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error
    }
    throw new Error(`Failed to fetch raw email: ${error}`)
  }
}

// Search for Luma and Substack confirmation emails
export async function searchLumaEmails(
  accessToken: string,
  pageToken?: string,
  pageSize: number = 30
): Promise<EmailSearchResult> {
  
  // Build the query dynamically from the config
  const allDomains = Object.values(emailFilterConfig).flatMap(config => config.apiQuery.domains);
  const allKeywords = Object.values(emailFilterConfig).flatMap(config => config.apiQuery.keywords);
  const uniqueDomains = [...new Set(allDomains)];
  const uniqueKeywords = [...new Set(allKeywords)];
  
  const query = `from:(${uniqueDomains.join(' OR ')}) (${uniqueKeywords.join(' OR ')})`;

  const searchResult = await searchEmails(accessToken, query, pageToken, pageSize)
  const emailDetails = searchResult.emails

  // Filter emails based on the processing rules in the config
  const filtered = emailDetails.filter(email => {
    const source = getEmailSource(email);
    if (source === 'other') {
      return false; // Should not happen with the Gmail query, but as a safeguard
    }

    const config = emailFilterConfig[source];
    const subject = email.subject.toLowerCase();
    const snippet = email.snippet.toLowerCase();
    const combined = `${subject} ${snippet}`;

    const hasIncludeKeyword = config.processing.include.some(keyword => combined.includes(keyword));
    const hasExcludeKeyword = config.processing.exclude.some(keyword => combined.includes(keyword));

    return hasIncludeKeyword && !hasExcludeKeyword;
  })

  return {
    ...searchResult,
    emails: filtered,
  }
}
