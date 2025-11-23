import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import './index.css'

// Get env vars
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

if (!googleClientId) {
    console.error('Missing VITE_GOOGLE_CLIENT_ID')
}

function LoginApp() {
    const [status, setStatus] = useState('Initializing...')
    const [error, setError] = useState<string | null>(null)

    const login = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            setStatus('Login successful! Redirecting...')
            // Send message to opener
            if (window.opener) {
                window.opener.postMessage({
                    type: 'GOOGLE_LOGIN_SUCCESS',
                    payload: tokenResponse
                }, window.location.origin)
                window.close()
            } else {
                setError('No opener window found. Please close this tab.')
            }
        },
        onError: (error) => {
            console.error('Login Failed:', error)
            setError('Login failed. Please try again.')
            if (window.opener) {
                window.opener.postMessage({
                    type: 'GOOGLE_LOGIN_ERROR',
                    error
                }, window.location.origin)
            }
        },
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        flow: 'implicit' // Use implicit flow for client-side
    })

    useEffect(() => {
        // Auto trigger login if requested
        const params = new URLSearchParams(window.location.search)
        if (params.get('auto') === 'true') {
            setStatus('Authenticating with Google...')
            login()
        } else {
            setStatus('Ready to sign in')
        }
    }, [login])

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
            <div className="w-full max-w-md p-6 bg-card rounded-lg border border-border shadow-lg text-center">
                <h1 className="text-2xl font-bold mb-4">Sign In</h1>

                {error ? (
                    <div className="p-3 bg-destructive/10 text-destructive rounded-md mb-4">
                        {error}
                    </div>
                ) : (
                    <p className="text-muted-foreground mb-6">{status}</p>
                )}

                {status === 'Ready to sign in' && (
                    <button
                        onClick={() => login()}
                        className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        Sign in with Google
                    </button>
                )}
            </div>
        </div>
    )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {googleClientId ? (
            <GoogleOAuthProvider clientId={googleClientId}>
                <LoginApp />
            </GoogleOAuthProvider>
        ) : (
            <div className="p-4 text-destructive">Configuration Error: Missing Client ID</div>
        )}
    </React.StrictMode>
)
