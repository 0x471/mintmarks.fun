import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'


// Constants
const TOKEN_STORAGE_KEY = 'mintmarks_gmail_access_token'
const TOKEN_EXPIRE_KEY = 'mintmarks_gmail_access_token_expire'
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000 // 5 minutes buffer

interface AuthContextType {
  accessToken: string | null
  isAuthenticated: boolean
  login: () => void
  logout: () => void
  handleTokenExpiration: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
    const storedExpireTime = localStorage.getItem(TOKEN_EXPIRE_KEY)

    if (storedToken && storedExpireTime) {
      const expireTime = parseInt(storedExpireTime, 10)
      const now = Date.now()

      // Check if token is still valid
      if (now < expireTime - TOKEN_EXPIRY_BUFFER) {
        setAccessToken(storedToken)
      } else {
        // Token expired, clear it
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        localStorage.removeItem(TOKEN_EXPIRE_KEY)
      }
    }
  }, [])



  // Check for token in URL hash on mount (handling redirect callback)
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1)) // remove #
      const token = params.get('access_token')
      const expiresIn = params.get('expires_in')

      if (token) {
        console.log('Token found in URL processing login...')
        const expiresInSeconds = expiresIn ? parseInt(expiresIn, 10) : 3600
        const expireTime = Date.now() + (expiresInSeconds * 1000) - TOKEN_EXPIRY_BUFFER

        setAccessToken(token)
        localStorage.setItem(TOKEN_STORAGE_KEY, token)
        localStorage.setItem(TOKEN_EXPIRE_KEY, expireTime.toString())

        // Clean URL
        window.history.replaceState(null, '', window.location.pathname)
      }
    }
  }, [])

  const login = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      console.error('Missing VITE_GOOGLE_CLIENT_ID')
      return
    }

    const redirectUri = window.location.origin
    const scope = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
    const responseType = 'token'
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}`

    window.location.href = authUrl
  }

  const logout = () => {
    setAccessToken(null)
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(TOKEN_EXPIRE_KEY)
  }

  const handleTokenExpiration = () => {
    logout()
  }

  // Token expiry check helper
  const isTokenExpired = (): boolean => {
    const storedExpireTime = localStorage.getItem(TOKEN_EXPIRE_KEY)
    if (!storedExpireTime) return true
    const expireTime = parseInt(storedExpireTime, 10)
    return Date.now() >= expireTime
  }

  const isAuthenticated = !!accessToken && !isTokenExpired()

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        isAuthenticated,
        login,
        logout,
        handleTokenExpiration,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
