import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface UserInfo {
  email: string
  name?: string
  picture?: string
}

export function AuthStatus() {
  const { isAuthenticated, accessToken, logout, login } = useAuth()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchUserInfo()
    } else {
      setUserInfo(null)
    }
  }, [isAuthenticated, accessToken])

  const handleLogout = () => {
    logout()
  }

  const fetchUserInfo = async () => {
    if (!accessToken) return

    setLoading(true)
    try {
      // Fetch user info from Google OAuth
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUserInfo({
          email: data.email || 'Unknown',
          name: data.name,
          picture: data.picture,
        })
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        padding: '1rem',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        border: isAuthenticated ? '2px solid #10b981' : '2px solid #6b7280',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        minWidth: '250px',
        zIndex: 1000,
      }}
    >
      {isAuthenticated ? (
        <>
          {/* Green status indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 8px #10b981',
                animation: 'pulse 2s infinite',
              }}
            />
            <span style={{ fontWeight: 'bold', color: '#10b981' }}>Signed In</span>
          </div>

          {/* User info */}
          {loading ? (
            <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              Loading...
            </div>
          ) : userInfo ? (
            <div>
              {userInfo.name && (
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                  {userInfo.name}
                </div>
              )}
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                {userInfo.email}
              </div>
            </div>
          ) : (
            <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              Unable to load user info
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444'
            }}
          >
            🚪 Sign Out
          </button>
        </>
      ) : (
        <>
          {/* Gray status indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#6b7280',
              }}
            />
            <span style={{ fontWeight: 'bold', color: '#6b7280' }}>Signed Out</span>
          </div>

          {/* Sign In button */}
          <button
            onClick={login}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6'
            }}
          >
            🔐 Sign In with Google
          </button>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  )
}
