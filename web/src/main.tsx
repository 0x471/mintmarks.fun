import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
import App from './App.tsx';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const ErrorMessage = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    textAlign: 'center'
  }}>
    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#dc2626' }}>
      Google OAuth Configuration Missing
    </h1>
    <p style={{ marginBottom: '1rem', color: '#525252' }}>
      VITE_GOOGLE_CLIENT_ID is not set in your .env file.
    </p>
    <p style={{ color: '#737373', fontSize: '0.875rem' }}>
      Please add VITE_GOOGLE_CLIENT_ID to your .env file and restart the development server.
    </p>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </GoogleOAuthProvider>
    ) : (
      <ErrorMessage />
    )}
  </StrictMode>
);
