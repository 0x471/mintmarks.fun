import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import * as GoogleOAuth from '@react-oauth/google'

// Mock @react-oauth/google
vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: vi.fn(),
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('AuthContext', () => {
  const mockUseGoogleLogin = vi.mocked(GoogleOAuth.useGoogleLogin)

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const TestComponent = () => {
    const { accessToken, isAuthenticated, login, logout } = useAuth()
    return (
      <div>
        <div data-testid="token">{accessToken || 'no-token'}</div>
        <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
        <button onClick={login}>Login</button>
        <button onClick={logout}>Logout</button>
      </div>
    )
  }

  it('should provide auth context to children', () => {
    const mockLogin = vi.fn()
    mockUseGoogleLogin.mockReturnValue(mockLogin)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('token')).toHaveTextContent('no-token')
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
  })

  it('should load token from localStorage on mount', () => {
    const validToken = 'valid-token'
    const futureExpiry = Date.now() + 3600000 // 1 hour from now

    localStorage.setItem('mintmarks_gmail_access_token', validToken)
    localStorage.setItem('mintmarks_gmail_access_token_expire', futureExpiry.toString())

    const mockLogin = vi.fn()
    mockUseGoogleLogin.mockReturnValue(mockLogin)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('token')).toHaveTextContent(validToken)
    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
  })

  it('should clear expired token on mount', () => {
    const expiredToken = 'expired-token'
    const pastExpiry = Date.now() - 1000 // 1 second ago

    localStorage.setItem('mintmarks_gmail_access_token', expiredToken)
    localStorage.setItem('mintmarks_gmail_access_token_expire', pastExpiry.toString())

    const mockLogin = vi.fn()
    mockUseGoogleLogin.mockReturnValue(mockLogin)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('token')).toHaveTextContent('no-token')
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    expect(localStorage.getItem('mintmarks_gmail_access_token')).toBeNull()
    expect(localStorage.getItem('mintmarks_gmail_access_token_expire')).toBeNull()
  })

  it('should handle successful login', async () => {
    const mockLogin = vi.fn()

    mockLogin.mockImplementation((options) => {
      // Simulate successful login
      options.onSuccess({
        access_token: 'new-token',
        expires_in: 3600,
      })
    })

    mockUseGoogleLogin.mockReturnValue(mockLogin)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Trigger login
    screen.getByText('Login').click()

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('mintmarks_gmail_access_token', 'new-token')
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mintmarks_gmail_access_token_expire',
        expect.any(String)
      )
    })
  })

  it('should handle logout', () => {
    const validToken = 'valid-token'
    const futureExpiry = Date.now() + 3600000

    localStorage.setItem('mintmarks_gmail_access_token', validToken)
    localStorage.setItem('mintmarks_gmail_access_token_expire', futureExpiry.toString())

    const mockLogin = vi.fn()
    mockUseGoogleLogin.mockReturnValue(mockLogin)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')

    // Trigger logout
    screen.getByText('Logout').click()

    expect(screen.getByTestId('token')).toHaveTextContent('no-token')
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    expect(localStorage.removeItem).toHaveBeenCalledWith('mintmarks_gmail_access_token')
    expect(localStorage.removeItem).toHaveBeenCalledWith('mintmarks_gmail_access_token_expire')
  })

  it('should throw error when useAuth is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })
})
