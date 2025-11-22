import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useGoogleLogin } from '@react-oauth/google'

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

  // Google OAuth login
  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log('Google login successful')
      const token = tokenResponse.access_token
      const expiresIn = tokenResponse.expires_in || 3600

      // Calculate expiry time
      const expireTime = Date.now() + (expiresIn * 1000) - TOKEN_EXPIRY_BUFFER

      setAccessToken(token)
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
      localStorage.setItem(TOKEN_EXPIRE_KEY, expireTime.toString())
    },
    onError: () => {
      console.error('Google login failed')
    },
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
  })

  const login = () => {
    googleLogin()
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
