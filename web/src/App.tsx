import { useState } from 'react';
import { ProofGenerator, validateEmlFile, type ProofResult } from './lib/proofGenerator';
import { useAuth } from './contexts/AuthContext';
import { getEmailRaw, TokenExpiredError } from './services/gmail';
import { EmailList } from './components/EmailList';
import './App.css';
import { Buffer } from 'buffer';

function App() {
  const { accessToken, login, isAuthenticated, handleTokenExpiration } = useAuth();
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

      // Convert to buffer
      const emailBuffer = Buffer.from(rawEmail, 'utf-8');

      // Generate proof
      const generator = new ProofGenerator();
      const proofResult = await generator.generateProof(emailBuffer, (status) => {
        setProgress(status);
      });

      setResult(proofResult);
    } catch (error: any) {
      if (error instanceof TokenExpiredError) {
        handleTokenExpiration();
        setResult({
          success: false,
          error: 'Session expired. Please sign in again.',
        });
      } else {
        setResult({
          success: false,
          error: error.message || 'Unknown error occurred',
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

      const generator = new ProofGenerator();
      const proofResult = await generator.generateProof(emailBuffer, (status) => {
        setProgress(status);
      });

      setResult(proofResult);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Unknown error occurred',
      });
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header>
          <h1>mintmarks.fun</h1>
          <p className="subtitle">:)</p>
          <p className="description">
            <br />
            <strong>Everything runs in your browser, your email never leaves your device.</strong>
          </p>
        </header>

        {/* View mode toggle */}
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => setViewMode('upload')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: viewMode === 'upload' ? '#3b82f6' : '#e5e7eb',
              color: viewMode === 'upload' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Upload .eml File
          </button>
          <button
            onClick={() => setViewMode('gmail')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: viewMode === 'gmail' ? '#3b82f6' : '#e5e7eb',
              color: viewMode === 'gmail' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
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
              <div style={{ textAlign: 'center', padding: '2rem' }}>
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
