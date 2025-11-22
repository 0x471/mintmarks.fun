import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { CDPReactProvider, type Config } from '@coinbase/cdp-react';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
import App from './App.tsx';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const cdpProjectId = import.meta.env.VITE_CDP_PROJECT_ID || 'test-project-12345';
const cdpAppName = import.meta.env.VITE_CDP_APP_NAME || 'mintmarks';

// CDP Configuration
const cdpConfig: Config = {
  projectId: cdpProjectId,
  appName: cdpAppName,
  appLogoUrl: 'https://via.placeholder.com/64',
  ethereum: {
    createOnLogin: 'eoa' as const, // EOA oluşturma ayarı
  },
};

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
        <CDPReactProvider config={cdpConfig}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </CDPReactProvider>
      </GoogleOAuthProvider>
    ) : (
      <ErrorMessage />
    )}
  </StrictMode>
);
