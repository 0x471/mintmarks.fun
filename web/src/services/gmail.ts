import type { GmailSearchResponse, GmailMessageResponse, GmailMessageDetail } from '../types/gmail'

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
    const subject = headers.find(h => h.name === 'Subject')?.value || '(No subject)'
    const from = headers.find(h => h.name === 'From')?.value || ''
    const date = headers.find(h => h.name === 'Date')?.value || ''

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

    // Base64url decode
    const base64 = data.raw.replace(/-/g, '+').replace(/_/g, '/')

    return atob(base64) // RFC2822 format (.eml)
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error
    }
    throw new Error(`Failed to fetch raw email: ${error}`)
  }
}
