import { useState } from 'react';
import { ProofGenerator, validateEmlFile, type ProofResult } from './lib/proofGenerator';
import { useAuth } from './contexts/AuthContext';
import { getEmailRaw, TokenExpiredError } from './services/gmail';
import { EmailList } from './components/EmailList';
import { AuthStatus } from './components/AuthStatus';
import { WalletCreationPrompt } from './components/WalletCreationPrompt';
import { useWalletStatus } from './hooks/useWalletStatus';
import './App.css';
import { Buffer } from 'buffer';

// Helper for error handling
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Reusable proof generation logic
async function generateProofFromBuffer(
  buffer: Buffer,
  onProgress: (status: string) => void
): Promise<ProofResult> {
  const generator = new ProofGenerator();
  return generator.generateProof(buffer, onProgress);
}

function App() {
  const { accessToken, login, isAuthenticated, handleTokenExpiration } = useAuth();
  const walletStatus = useWalletStatus();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProofResult | null>(null);
  const [progress, setProgress] = useState('');
  const [viewMode, setViewMode] = useState<'upload' | 'gmail'>('upload');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Validate file extension
      if (!selectedFile.name.endsWith('.eml')) {
        setResult({
          success: false,
          error: 'Please select a .eml file',
        });
        return;
      }

      // Validate file content
      const content = await selectedFile.text();
      const validation = validateEmlFile(content);

      if (!validation.valid) {
        setResult({
          success: false,
          error: validation.error,
        });
        return;
      }

      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleEmailSelect = async (emailId: string) => {
    if (!accessToken) {
      login();
      return;
    }

    setLoading(true);
    setProgress('Fetching email from Gmail...');
    setResult(null);

    try {
      // Fetch raw email content
      const rawEmail = await getEmailRaw(accessToken, emailId);

      // Validate email content
      const validation = validateEmlFile(rawEmail);
      if (!validation.valid) {
        setResult({
          success: false,
          error: validation.error,
        });
        return;
      }

      const emailBuffer = Buffer.from(rawEmail, 'utf-8');
      const proofResult = await generateProofFromBuffer(emailBuffer, setProgress);
      setResult(proofResult);
    } catch (error: unknown) {
      if (error instanceof TokenExpiredError) {
        handleTokenExpiration();
        setResult({
          success: false,
          error: 'Session expired. Please sign in again.',
        });
      } else {
        setResult({
          success: false,
          error: getErrorMessage(error) || 'Unknown error occurred',
        });
      }
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const handleGenerateProof = async () => {
    if (!file) return;

    setLoading(true);
    setProgress('Reading email file...');
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const emailBuffer = Buffer.from(buffer);
      const proofResult = await generateProofFromBuffer(emailBuffer, setProgress);
      setResult(proofResult);
    } catch (error: unknown) {
      setResult({
        success: false,
        error: getErrorMessage(error) || 'Unknown error occurred',
      });
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="app">
      <AuthStatus />
      <div className="container">
        <header>
          <h1>mintmarks.fun</h1>
          <p className="subtitle">:)</p>
          <p className="description">
            <br />
            <strong>Everything runs in your browser, your email never leaves your device.</strong>
          </p>
        </header>

        {/* Wallet Creation Prompt - Show when user is logged in but has no wallet */}
        {isAuthenticated && accessToken && walletStatus.needsWallet && !walletStatus.isLoading && (
          <div style={{ marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
            <WalletCreationPrompt autoCreate={false} />
          </div>
        )}

        {/* View mode toggle */}
        <div className="view-toggle">
          <button
            onClick={() => setViewMode('upload')}
            className={`toggle-btn ${viewMode === 'upload' ? 'active' : ''}`}
          >
            Upload .eml File
          </button>
          <button
            onClick={() => setViewMode('gmail')}
            className={`toggle-btn ${viewMode === 'gmail' ? 'active' : ''}`}
          >
            Select from Gmail
          </button>
        </div>

        {/* File upload view */}
        {viewMode === 'upload' && (
          <div className="upload-section">
            <div className="file-input-wrapper">
              <input
                type="file"
                accept=".eml"
                onChange={handleFileChange}
                disabled={loading}
                id="eml-upload"
              />
              <label htmlFor="eml-upload" className={file ? 'has-file' : ''}>
                {file ? `${file.name}` : '📎 Choose .eml file'}
              </label>
            </div>

            <button
              onClick={handleGenerateProof}
              disabled={!file || loading}
              className="generate-button"
            >
              {loading ? 'Generating Proof...' : 'Generate ZK Proof'}
            </button>

            {progress && (
              <div className="progress">
                <div className="spinner"></div>
                <span>{progress}</span>
              </div>
            )}
          </div>
        )}

        {/* Gmail email list view */}
        {viewMode === 'gmail' && (
          <div>
            {!isAuthenticated ? (
              <div className="auth-prompt">
                <p>Please sign in with Google to view your emails.</p>
                <button onClick={login}>Sign in with Google</button>
              </div>
            ) : (
              <EmailList onEmailSelect={handleEmailSelect} />
            )}
          </div>
        )}

        {result && (
          <div className={`result ${result.success ? 'success' : 'error'}`}>
            {result.success ? (
              <>
                <h2>Proof Generated Successfully!</h2>

                {result.metadata && (
                  <div className="metadata">
                    <h3>Event Details</h3>
                    <div className="metadata-grid">
                      <div className="metadata-item">
                        <span className="label">Event:</span>
                        <span className="value">{result.metadata.eventName}</span>
                      </div>
                      <div className="metadata-item">
                        <span className="label">Date:</span>
                        <span className="value">{result.metadata.dateValue}</span>
                      </div>
                      <div className="metadata-item">
                        <span className="label">Pubkey Hash:</span>
                        <span className="value hash">{result.metadata.pubkeyHash}</span>
                      </div>
                      <div className="metadata-item">
                        <span className="label">Email Nullifier:</span>
                        <span className="value hash">{result.metadata.emailNullifier}</span>
                      </div>
                    </div>
                  </div>
                )}

                {result.proof && (
                  <>
                    <div className="timing">
                      <h3>Performance</h3>
                      <div className="metadata-grid">
                        <div className="metadata-item">
                          <span className="label">Proof Time:</span>
                          <span className="value">{result.proof.proofTime.toFixed(2)}s</span>
                        </div>
                        <div className="metadata-item">
                          <span className="label">Verify Time:</span>
                          <span className="value">{result.proof.verifyTime.toFixed(2)}s</span>
                        </div>
                        <div className="metadata-item">
                          <span className="label">Total Time:</span>
                          <span className="value">{result.totalTime?.toFixed(2)}s</span>
                        </div>
                        <div className="metadata-item">
                          <span className="label">Proof Size:</span>
                          <span className="value">{(result.proof.proofSize / 1024).toFixed(2)} KB</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <h2>Error</h2>
                <div className="error-message">
                  <pre>{result.error}</pre>
                </div>
              </>
            )}
          </div>
        )}

        <footer>
          <p>
            Built with <a href="..." target="_blank">...</a> and{' '}
            <a href="..." target="_blank">...</a>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
