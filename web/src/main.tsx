import React, { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { CDPReactProvider, type Config } from '@coinbase/cdp-react';
import { AuthProvider } from './contexts/AuthContext';
import { NetworkProvider } from './contexts/NetworkContext';
import './index.css';
import App from './App.tsx';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const cdpProjectId = import.meta.env.VITE_CDP_PROJECT_ID; // Removed fallback to prevent accidental wallet creation on test project
const cdpAppName = import.meta.env.VITE_CDP_APP_NAME || 'mintmarks';

// ✅ Best Practice: Environment variable validation
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  if (!cdpProjectId) {
    console.error('[CDP] ❌ VITE_CDP_PROJECT_ID is not set. Application will not start.');
  }
}

// Detect MetaMask or other wallet extensions
const detectExternalWallet = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) return false;
  
  // Check if MetaMask is installed
  const isMetaMask = ethereum.isMetaMask === true;
  
  // Check if Coinbase Wallet is installed
  const isCoinbaseWallet = ethereum.isCoinbaseWallet === true;
  
  // Check if other common wallets are installed
  const hasOtherWallet = ethereum.providers && Array.isArray(ethereum.providers) && ethereum.providers.length > 0;
  
  return isMetaMask || isCoinbaseWallet || hasOtherWallet;
};

const hasExternalWallet = detectExternalWallet();

// CDP Configuration
// When external wallets (like MetaMask) are present, CDP should not override window.ethereum
const cdpConfig: Config = {
  projectId: cdpProjectId,
  appName: cdpAppName,
  appLogoUrl: 'https://via.placeholder.com/64',
  ethereum: {
    createOnLogin: 'eoa' as const, // EOA oluşturma ayarı
    // Don't override existing providers when external wallets are detected
    // CDP will use its own provider internally without conflicting with MetaMask
  },
};

// Log wallet detection for debugging (only in development)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  if (hasExternalWallet) {
    console.log('[CDP] External wallet detected (MetaMask/Coinbase/etc). CDP will use its own provider.');
  } else {
    console.log('[CDP] No external wallet detected. CDP will manage window.ethereum.');
  }
}

const ErrorMessage = ({ missingVar }: { missingVar: string }) => (
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
      Configuration Missing
    </h1>
    <p style={{ marginBottom: '1rem', color: '#525252' }}>
      {missingVar} is not set in your .env file.
    </p>
    <p style={{ color: '#737373', fontSize: '0.875rem' }}>
      Please add {missingVar} to your .env file and restart the development server.
    </p>
  </div>
);

// Wrap CDP provider to handle MetaMask conflicts gracefully
const CDPProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  // Suppress MetaMask override errors in console
  const originalError = console.error;
  const originalWarn = console.warn;
  
  useEffect(() => {
    // Filter out MetaMask override warnings (they're harmless)
    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      if (
        message.includes('Cannot set property ethereum') ||
        message.includes('has only a getter') ||
        message.includes('MetaMask encountered an error')
      ) {
        // Silently ignore MetaMask override warnings
        return;
      }
      originalError.apply(console, args);
    };
    
    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      if (
        message.includes('MetaMask') && 
        message.includes('ethereum')
      ) {
        // Silently ignore MetaMask warnings
        return;
      }
      originalWarn.apply(console, args);
    };
    
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);
  
  return <>{children}</>;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {!googleClientId ? (
      <ErrorMessage missingVar="VITE_GOOGLE_CLIENT_ID" />
    ) : !cdpProjectId ? (
      <ErrorMessage missingVar="VITE_CDP_PROJECT_ID" />
    ) : (
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          <NetworkProvider>
            <CDPProviderWrapper>
              <CDPReactProvider config={cdpConfig as Config}>
                <App />
              </CDPReactProvider>
            </CDPProviderWrapper>
          </NetworkProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    )}
  </StrictMode>
);
