import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { searchEmails, TokenExpiredError } from '../services/gmail'
import type { GmailMessageDetail } from '../types/gmail'

export function EmailList({ onEmailSelect }: { onEmailSelect: (emailId: string) => void }) {
  const { accessToken, login, isAuthenticated, handleTokenExpiration } = useAuth()
  const [emails, setEmails] = useState<GmailMessageDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextPageToken, setNextPageToken] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadEmails()
    }
  }, [isAuthenticated, accessToken])

  const loadEmails = async () => {
    if (!accessToken) {
      login()
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await searchEmails(accessToken, '', undefined, 30)
      setEmails(result.emails)
      setNextPageToken(result.nextPageToken)
      setHasMore(result.hasMore)
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        handleTokenExpiration()
        setError('Session expired. Please sign in again.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load emails')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!accessToken || !nextPageToken || loadingMore) return

    setLoadingMore(true)
    setError(null)

    try {
      const result = await searchEmails(accessToken, '', nextPageToken, 30)
      setEmails(prev => [...prev, ...result.emails])
      setNextPageToken(result.nextPageToken)
      setHasMore(result.hasMore)
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        handleTokenExpiration()
        setError('Session expired. Please sign in again.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load more emails')
      }
    } finally {
      setLoadingMore(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center p-8">
        <p className="mb-4">Please sign in with Google to view your emails.</p>
        <button onClick={login} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
          Sign in with Google
        </button>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center p-8 text-muted-foreground">Loading emails...</div>
  }

  if (error) {
    return (
      <div className="text-center p-8 text-destructive">
        <p className="mb-4">{error}</p>
        <button onClick={loadEmails} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Your Emails ({emails.length})</h2>
      <div className="space-y-4">
        {emails.map(email => (
          <div
            key={email.id}
            className="border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onEmailSelect(email.id)}
          >
            <h3 className="font-medium mb-1">{email.subject}</h3>
            <p className="text-sm text-muted-foreground mb-2">
              From: {email.from} | Date: {email.date}
            </p>
            <p className="text-sm text-muted-foreground/80 line-clamp-2">{email.snippet}</p>
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}
