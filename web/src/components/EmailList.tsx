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
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>Please sign in with Google to view your emails.</p>
        <button onClick={login}>Sign in with Google</button>
      </div>
    )
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading emails...</div>
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
        <p>{error}</p>
        <button onClick={loadEmails}>Retry</button>
      </div>
    )
  }

  return (
    <div>
      <h2>Your Emails ({emails.length})</h2>
      <div>
        {emails.map(email => (
          <div
            key={email.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              cursor: 'pointer',
            }}
            onClick={() => onEmailSelect(email.id)}
          >
            <h3>{email.subject}</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              From: {email.from} | Date: {email.date}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>{email.snippet}</p>
          </div>
        ))}
      </div>
      {hasMore && (
        <button onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
