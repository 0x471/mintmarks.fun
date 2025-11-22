import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchEmails, getEmailRaw, TokenExpiredError, isTokenExpiredError } from './gmail'

describe('Gmail Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = vi.fn() as typeof fetch
  })

  describe('isTokenExpiredError', () => {
    it('should return true for 401 status', () => {
      expect(isTokenExpiredError(401)).toBe(true)
    })

    it('should return false for other status codes', () => {
      expect(isTokenExpiredError(200)).toBe(false)
      expect(isTokenExpiredError(429)).toBe(false)
      expect(isTokenExpiredError(500)).toBe(false)
    })
  })

  describe('searchEmails', () => {
    const mockAccessToken = 'mock-token'

    it('should fetch emails successfully', async () => {
      const mockResponse = {
        messages: [
          { id: 'msg1', threadId: 'thread1' },
          { id: 'msg2', threadId: 'thread2' },
        ],
        nextPageToken: 'next-token',
        resultSizeEstimate: 50,
      }

      const mockMessageDetails = [
        {
          id: 'msg1',
          subject: 'Test Subject 1',
          date: 'Mon, 01 Jan 2024 10:00:00 +0000',
          from: 'sender@example.com',
          snippet: 'Test snippet 1',
        },
        {
          id: 'msg2',
          subject: 'Test Subject 2',
          date: 'Tue, 02 Jan 2024 11:00:00 +0000',
          from: 'sender2@example.com',
          snippet: 'Test snippet 2',
        },
      ]

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            payload: {
              headers: [
                { name: 'Subject', value: 'Test Subject 1' },
                { name: 'From', value: 'sender@example.com' },
                { name: 'Date', value: 'Mon, 01 Jan 2024 10:00:00 +0000' },
              ],
            },
            snippet: 'Test snippet 1',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            payload: {
              headers: [
                { name: 'Subject', value: 'Test Subject 2' },
                { name: 'From', value: 'sender2@example.com' },
                { name: 'Date', value: 'Tue, 02 Jan 2024 11:00:00 +0000' },
              ],
            },
            snippet: 'Test snippet 2',
          }),
        })

      globalThis.fetch = mockFetch

      const result = await searchEmails(mockAccessToken, '', undefined, 30)

      expect(result.emails).toHaveLength(2)
      expect(result.emails[0]).toEqual(mockMessageDetails[0])
      expect(result.emails[1]).toEqual(mockMessageDetails[1])
      expect(result.nextPageToken).toBe('next-token')
      expect(result.hasMore).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should handle empty results', async () => {
      const mockResponse = {
        messages: undefined,
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await searchEmails(mockAccessToken)

      expect(result.emails).toHaveLength(0)
      expect(result.hasMore).toBe(false)
    })

    it('should handle token expired error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })

      await expect(searchEmails(mockAccessToken)).rejects.toThrow(TokenExpiredError)
    })

    it('should handle rate limiting with retry', async () => {
      const mockResponse = {
        messages: [{ id: 'msg1', threadId: 'thread1' }],
      }

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Map([['Retry-After', '1']]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            payload: {
              headers: [
                { name: 'Subject', value: 'Test Subject' },
                { name: 'From', value: 'sender@example.com' },
                { name: 'Date', value: 'Mon, 01 Jan 2024 10:00:00 +0000' },
              ],
            },
            snippet: 'Test snippet',
          }),
        })

      globalThis.fetch = mockFetch

      const result = await searchEmails(mockAccessToken, '', undefined, 1)

      expect(result.emails).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('getEmailRaw', () => {
    const mockAccessToken = 'mock-token'
    const mockMessageId = 'msg123'

    it('should fetch raw email successfully', async () => {
      const rawEmailContent = 'From: sender@example.com\r\nSubject: Test\r\n\r\nTest body'
      const base64Content = btoa(rawEmailContent)

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ raw: base64Content }),
      })

      const result = await getEmailRaw(mockAccessToken, mockMessageId)

      expect(result).toBe(rawEmailContent)
    })

    it('should handle token expired error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })

      await expect(getEmailRaw(mockAccessToken, mockMessageId)).rejects.toThrow(TokenExpiredError)
    })

    it('should decode base64url format correctly', async () => {
      const rawEmailContent = 'From: test@example.com\r\n\r\nHello World'
      const base64Content = btoa(rawEmailContent).replace(/\+/g, '-').replace(/\//g, '_')

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ raw: base64Content }),
      })

      const result = await getEmailRaw(mockAccessToken, mockMessageId)

      expect(result).toBe(rawEmailContent)
    })
  })
})
