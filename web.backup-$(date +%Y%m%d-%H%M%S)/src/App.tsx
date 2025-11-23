import { useState, useEffect } from 'react';
import { ProofGenerator, validateEmlFile, type ProofResult } from './lib/proofGenerator';
import { SelfQRcodeWrapper, SelfAppBuilder, getUniversalLink, type SelfApp } from '@selfxyz/qrcode';
import { ethers } from 'ethers';
import './App.css';
import { Buffer } from 'buffer';

// Contract addresses from environment or defaults
const PROOF_OF_HUMAN_ADDRESS = import.meta.env.VITE_PROOF_OF_HUMAN_ADDRESS || '0x...';
const MINTMARKS_ADDRESS = import.meta.env.VITE_MINTMARKS_ADDRESS || '0x...';
const VERIFIER_ADDRESS = import.meta.env.VITE_VERIFIER_ADDRESS || '0x...';
const SELF_SCOPE_SEED = import.meta.env.VITE_SELF_SCOPE_SEED || 'mintmarks.fun';

// Contract fees (in CELO)
const COLLECTION_CREATION_FEE = '0.01';
const MINTING_FEE = '0.001';
const TOTAL_FEE_NEW = '0.011'; // For new collections
const TOTAL_FEE_EXISTING = '0.001'; // For existing collections

// Helper function to hash email nullifier the same way the contract does
// Contract uses: keccak256(userData) where userData is UTF-8 encoded string
const hashEmailNullifier = (emailNullifier: string): string => {
  return ethers.keccak256(ethers.toUtf8Bytes(emailNullifier));
};

type AppStep = 'upload' | 'self-verify' | 'mint' | 'complete';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProofResult | null>(null);
  const [progress, setProgress] = useState('');
  const [step, setStep] = useState<AppStep>('upload');

  // SELF verification state
  const [emailNullifier, setEmailNullifier] = useState<string>('');
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [universalLink, setUniversalLink] = useState('');
  const [selfVerified, setSelfVerified] = useState(false);

  // Wallet state
  const [account, setAccount] = useState<string>('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  // Minting state
  const [minting, setMinting] = useState(false);
  const [mintTxHash, setMintTxHash] = useState<string>('');
  const [mintedTokenId, setMintedTokenId] = useState<string>('');

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      setAccount(accounts[0]);
      setProvider(browserProvider);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (!selectedFile.name.endsWith('.eml')) {
        setResult({
          success: false,
          error: 'Please select a .eml file',
        });
        return;
      }

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

  const handleGenerateProof = async () => {
    if (!file || !account) return;

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

      if (proofResult.success && proofResult.metadata) {
        // Extract email nullifier from public outputs
        const nullifier = proofResult.metadata.emailNullifier;
        setEmailNullifier(nullifier);

        // Move to SELF verification step
        setStep('self-verify');
      }
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

  // Auto-create SELF app when we reach self-verify step
  useEffect(() => {
    if (step === 'self-verify' && emailNullifier && account && !selfApp) {
      // First check if already verified
      checkExistingVerification();

      try {
        // NOTE: SELF Protocol only allows ONE verification per user per scope!
        // User should verify ONCE for "mintmarks.fun", then can mint any event.
        // If user already verified, they should skip this step.
        console.log('Creating SELF app with scope:', SELF_SCOPE_SEED);

        // SELF Protocol passes userDefinedData as UTF-8 encoded string bytes
        // Contract will hash it with keccak256 for consistent identification
        console.log('Email nullifier (from proof):', emailNullifier);

        const app = new SelfAppBuilder({
          version: 2,
          appName: 'Mintmarks',
          scope: SELF_SCOPE_SEED,
          endpoint: PROOF_OF_HUMAN_ADDRESS,
          userId: account,
          endpointType: 'staging_celo',
          userIdType: 'hex',
          userDefinedData: emailNullifier, // Pass as plain string, contract will hash it
          disclosures: {},
        }).build();

        setSelfApp(app);
        setUniversalLink(getUniversalLink(app));
      } catch (error: any) {
        console.error('Failed to create SELF app:', error);
      }
    }
  }, [step, emailNullifier, account, selfApp]);

  const handleSelfVerified = async () => {
    console.log('SELF verification succeeded! Waiting for transaction confirmation...');

    // Wait for the SELF verification transaction to be mined
    // Poll the contract until verification is confirmed on-chain
    try {
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max wait (SELF testnet can be slow)

      while (attempts < maxAttempts) {
        const proofOfHumanAbi = [
          'function isAddressVerified(address user) external view returns (bool)',
          'function isEmailNullifierVerified(bytes32 emailNullifier) external view returns (bool)',
        ];

        const proofOfHuman = new ethers.Contract(
          PROOF_OF_HUMAN_ADDRESS,
          proofOfHumanAbi,
          provider
        );

        const isAddressVerified = await proofOfHuman.isAddressVerified(account);
        const hashedEmailNullifier = hashEmailNullifier(emailNullifier);
        const isEmailVerified = await proofOfHuman.isEmailNullifierVerified(hashedEmailNullifier);

        if (isAddressVerified && isEmailVerified) {
          console.log('✅ Verification confirmed on-chain!');
          alert('✅ SELF Verification Complete!\n\nYour identity has been verified. You can now mint your NFT!');
          setSelfVerified(true);
          setStep('mint');
          return;
        }

        console.log(`Waiting for confirmation... (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        attempts++;
      }

      // Timeout - verification not confirmed yet, do one final check
      console.log('Polling timeout reached. Doing final verification check...');
      const proofOfHumanAbi = [
        'function isAddressVerified(address user) external view returns (bool)',
        'function isEmailNullifierVerified(bytes32 emailNullifier) external view returns (bool)',
      ];
      const proofOfHuman = new ethers.Contract(
        PROOF_OF_HUMAN_ADDRESS,
        proofOfHumanAbi,
        provider
      );
      const isAddressVerified = await proofOfHuman.isAddressVerified(account);
      const isEmailVerified = await proofOfHuman.isEmailNullifierVerified(emailNullifier);

      if (isAddressVerified && isEmailVerified) {
        console.log('✅ Verification confirmed on final check!');
        alert('✅ SELF Verification Complete!\n\nYour identity has been verified. You can now mint your NFT!');
        setSelfVerified(true);
        setStep('mint');
      } else {
        console.error('❌ Verification did not complete within 60 seconds');
        alert('❌ SELF verification transaction did not complete!\n\nThis can happen if:\n1. Testnet is slow/congested\n2. Transaction failed\n\nPlease:\n1. Wait 1-2 minutes\n2. Refresh the page\n3. Try uploading the .eml file again\n\nDO NOT click Mint until verification succeeds!');
        setSelfVerified(false);
        setStep('upload');
        return;
      }
    } catch (error) {
      console.error('Error waiting for verification:', error);
      setSelfVerified(true);
      setStep('mint');
    }
  };

  // Check if address is verified or email nullifier is already verified/minted
  const checkExistingVerification = async () => {
    if (!emailNullifier || !provider || !account) return;

    try {
      const proofOfHumanAbi = [
        'function isEmailNullifierVerified(bytes32 emailNullifier) external view returns (bool)',
        'function isAddressVerified(address user) external view returns (bool)',
      ];
      const mintmarksAbi = [
        'function usedNullifiers(bytes32 emailNullifier) external view returns (bool)',
      ];

      const proofOfHuman = new ethers.Contract(
        PROOF_OF_HUMAN_ADDRESS,
        proofOfHumanAbi,
        provider
      );
      const mintmarks = new ethers.Contract(
        MINTMARKS_ADDRESS,
        mintmarksAbi,
        provider
      );

      // CHECK 1: Is this address already verified? (verify-once-mint-multiple pattern)
      const isAddressVerified = await proofOfHuman.isAddressVerified(account);

      // CHECK 2: Is this specific email nullifier verified?
      // Hash the email nullifier the same way the contract does: keccak256(toUtf8Bytes(string))
      const hashedEmailNullifier = hashEmailNullifier(emailNullifier);
      const isEmailVerified = await proofOfHuman.isEmailNullifierVerified(hashedEmailNullifier);

      // CHECK 3: Is this email nullifier already used to mint?
      const isAlreadyMinted = await mintmarks.usedNullifiers(hashedEmailNullifier);

      console.log('Verification status:', {
        account,
        emailNullifier,
        hashedEmailNullifier,
        isAddressVerified,
        isEmailVerified,
        isAlreadyMinted,
      });

      // Priority 1: Already minted - error
      if (isAlreadyMinted) {
        console.error('Email nullifier already minted!');
        alert('❌ This email proof has already been used to mint an NFT!\n\nYou cannot mint again with the same email proof. Please use a different event confirmation email.');
        setStep('upload');
        setFile(null);
        setResult(null);
        setSelfVerified(false);
        return;
      }

      // Check if this specific email nullifier is already verified via SELF
      if (isEmailVerified) {
        console.log('✅ Email nullifier already verified! Skipping SELF verification');
        alert('✅ This email proof is already verified with SELF!\n\nYou can mint from any wallet.\n\nSkipping to mint step...');
        setSelfVerified(true);
        setStep('mint');
        return;
      }

      // Not verified at all - show SELF QR code (normal flow)
      console.log('No existing verification found, showing SELF QR code');
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  };

  const copyToClipboard = () => {
    if (!universalLink) return;
    navigator.clipboard.writeText(universalLink).then(() => {
      alert('Universal link copied!');
    });
  };

  // Mint NFT
  const handleMint = async () => {
    if (!result?.proof || !result?.metadata || !provider) {
      alert('Missing proof data or wallet connection');
      return;
    }

    setMinting(true);

    try {
      const signer = await provider.getSigner();

      // Mintmarks contract ABI (just the mint function)
      const mintmarksAbi = [
        'function mint(bytes calldata proof, bytes32[] calldata publicInputs) external payable returns (uint256 tokenId)',
        'event Minted(address indexed minter, uint256 indexed tokenId, bytes32 emailNullifier, uint256 humanNullifier, string eventName)',
      ];

      const mintmarks = new ethers.Contract(MINTMARKS_ADDRESS, mintmarksAbi, signer);

      // Convert proof to bytes
      const proofBytes = ethers.hexlify(result.proof.proof);

      // Convert publicInputs to bytes32[]
      const publicInputs = result.proof.publicInputs;

      console.log('Minting with:');
      console.log('- Proof length:', result.proof.proof.length);
      console.log('- Public inputs count:', publicInputs.length);
      console.log('- Event name:', result.metadata.eventName);
      console.log('- Email nullifier:', result.metadata.emailNullifier);

      // Assume new collection (max fee)
      // User gets refund if collection already exists
      const value = ethers.parseEther(TOTAL_FEE_NEW);

      console.log('Sending transaction with value:', TOTAL_FEE_NEW, 'CELO');

      // PRE-CHECK 1: Has this human already claimed this event?
      try {
        const proofOfHumanAbi = [
          'function getHumanForAddress(address user) external view returns (uint256)',
          'function hasHumanClaimedEvent(uint256 humanNullifier, string calldata eventName) external view returns (bool)',
          'function addressVerified(address user) external view returns (bool)',
        ];
        const proofOfHuman = new ethers.Contract(
          PROOF_OF_HUMAN_ADDRESS,
          proofOfHumanAbi,
          provider
        );

        // Check if address is verified (if not, SELF verification will catch this later)
        const isVerified = await proofOfHuman.addressVerified(account);
        if (isVerified) {
          const humanNullifier = await proofOfHuman.getHumanForAddress(account);
          const alreadyClaimed = await proofOfHuman.hasHumanClaimedEvent(
            humanNullifier,
            result.metadata.eventName
          );

          if (alreadyClaimed) {
            console.error('❌ Event already claimed by this human!');
            throw new Error(
              `❌ You have already minted "${result.metadata.eventName}"!\n\n` +
              `Each person can only mint once per event.\n\n` +
              `You can mint OTHER events, but not this one again (even with different .eml files).`
            );
          }

          console.log('✓ Event not yet claimed by this human');
        }
      } catch (claimCheckError: any) {
        // If the error is our custom "already claimed" error, re-throw it
        if (claimCheckError.message.includes('already minted')) {
          throw claimCheckError;
        }
        // Otherwise, log and continue (pre-check is optional)
        console.warn('Pre-check failed (non-fatal):', claimCheckError);
      }

      // Skip proof pre-check - let the mint transaction handle verification
      // (staticCall has gas limits that can cause false failures)
      console.log('Submitting mint transaction with explicit gas limit...');

      // Call mint function with explicit gas limit (UltraHonk verification is gas-intensive)
      // Celo block limit is ~20M, so we use 19M to be safe
      const tx = await mintmarks.mint(proofBytes, publicInputs, {
        value,
        gasLimit: 19000000 // 19M gas - max safe for Celo Sepolia
      });
      console.log('Transaction sent:', tx.hash);
      setMintTxHash(tx.hash);

      // Wait for confirmation
      console.log('Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log('Transaction confirmed!', receipt);

      // Extract tokenId from Minted event
      const mintedEvent = receipt.logs
        .map((log: any) => {
          try {
            return mintmarks.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((event: any) => event && event.name === 'Minted');

      if (mintedEvent) {
        const tokenId = mintedEvent.args.tokenId.toString();
        setMintedTokenId(tokenId);
        console.log('Minted token ID:', tokenId);
      }

      setStep('complete');
    } catch (error: any) {
      console.error('Minting failed:', error);

      // Parse error message
      let errorMsg = error.message || 'Unknown error';

      // Check for specific contract errors
      if (errorMsg.includes('AlreadyClaimed') || error.data?.includes('0x646cf558')) {
        errorMsg = '❌ This email proof has already been used to mint!\n\nYou cannot mint twice with the same email proof.';
      } else if (errorMsg.includes('HumanAlreadyClaimedEvent') || error.data?.includes('0x1caf89e0')) {
        errorMsg = '❌ You have already minted this event!\n\nEach person can only mint once per event.';
      } else if (errorMsg.includes('EmailNullifierNotVerified') || error.data?.includes('0x721e69e4')) {
        errorMsg = '❌ Email not verified by SELF!\n\nPlease complete SELF verification first.';
      } else if (errorMsg.includes('MinterAddressMismatch') || error.data?.includes('0x7fcb8d84')) {
        errorMsg = '❌ Wallet address mismatch!\n\nYou must mint from the same wallet you used for SELF verification.';
      } else if (errorMsg.includes('InsufficientFee')) {
        errorMsg = '❌ Insufficient fee sent!\n\nPlease ensure you have enough CELO.';
      } else if (errorMsg.includes('InvalidProof')) {
        errorMsg = '❌ Proof verification failed!\n\nThe zero-knowledge proof could not be verified on-chain.';
      } else if (errorMsg.includes('user rejected') || errorMsg.includes('User denied')) {
        errorMsg = 'Transaction rejected by user';
      } else if (errorMsg.includes('missing revert data')) {
        errorMsg = '⚠️ Transaction would fail!\n\nThe contract is rejecting this mint. This usually means:\n• Email proof already used to mint\n• SELF verification not completed\n• Or you already minted this event\n\nPlease check your verification status.';
      }

      alert(`Minting failed:\n\n${errorMsg}`);

      // If it's a verification issue, go back to verification check
      if (errorMsg.includes('Email not verified') || errorMsg.includes('already used')) {
        console.log('Verification issue detected, rechecking state...');
        checkExistingVerification();
      }
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header>
          <h1>mintmarks.fun</h1>
          <p className="subtitle">Proof of Attendance + Proof of Human</p>
          <p className="description">
            <br />
            <strong>Everything runs in your browser. Your email never leaves your device.</strong>
          </p>
        </header>

        {/* Wallet Connection */}
        {!account && (
          <div className="wallet-section">
            <button onClick={connectWallet} className="connect-wallet-button">
              Connect Wallet
            </button>
          </div>
        )}

        {account && (
          <div className="account-info">
            <span>Connected: {account.slice(0, 6)}...{account.slice(-4)}</span>
          </div>
        )}

        {/* Step 1: Upload & Generate Proof */}
        {step === 'upload' && account && (
          <div className="upload-section">
            <h2>Step 1: Generate ZK Proof</h2>
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

            {result?.error && (
              <div className="error-message">
                <p>❌ {result.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: SELF Verification */}
        {step === 'self-verify' && selfApp && result?.success && (
          <div className="self-verify-section">
            <h2>Step 2: Verify with SELF Protocol</h2>
            <p>✅ Proof generated! Now prove you're a unique human.</p>

            {result.metadata && (
              <div className="metadata" style={{ marginBottom: '20px' }}>
                <h3>Proof Details</h3>
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
                    <span className="label">Email Nullifier:</span>
                    <span className="value hash">{emailNullifier.slice(0, 10)}...{emailNullifier.slice(-10)}</span>
                  </div>
                </div>
                <div style={{ marginTop: '15px', padding: '12px', background: '#e3f2fd', borderRadius: '6px', fontSize: '14px' }}>
                  <strong>ℹ️ Verify Once, Mint Forever:</strong> You only need to verify with SELF once. After your first verification, you can mint any event without scanning the QR code again!
                </div>
              </div>
            )}

            <div className="qr-wrapper">
              <SelfQRcodeWrapper
                selfApp={selfApp}
                onSuccess={handleSelfVerified}
                onError={async (error) => {
                  console.error('SELF verification error:', error);
                  // Check if already verified
                  if (error?.error_code === '0x6abd5694') {
                    // EmailNullifierAlreadyVerified - check actual on-chain state
                    console.log('Detected EmailNullifierAlreadyVerified, checking on-chain state...');
                    await checkExistingVerification();
                  } else {
                    alert(`SELF verification failed: ${error?.reason || 'Unknown error'}`);
                  }
                }}
              />
            </div>

            <div className="self-actions">
              <button onClick={copyToClipboard} className="copy-button">
                Copy Universal Link
              </button>
              <button onClick={() => window.open(universalLink, '_blank')} className="open-button">
                Open SELF App
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Ready to Mint */}
        {step === 'mint' && result?.success && selfVerified && (
          <div className="mint-section">
            <h2>Step 3: Mint Your NFT! 🎉</h2>
            <p>✅ Proof generated</p>
            <p>✅ SELF verification complete</p>

            <div style={{ marginTop: '15px', padding: '12px', background: '#e8f5e9', borderRadius: '6px', fontSize: '14px' }}>
              <strong>✓ Ready to Mint!</strong> Your email proof has been verified and you're confirmed as a unique human. Click the button below to mint your attendance NFT.
            </div>

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
                </div>
              </div>
            )}

            <div className="fee-info" style={{ marginTop: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0 }}>Minting Fee</h3>
              <p style={{ margin: '5px 0' }}>
                Max fee: <strong>{TOTAL_FEE_NEW} CELO</strong>
              </p>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                (Refund if collection exists: {MINTING_FEE} CELO only)
              </p>
            </div>

            {mintTxHash && (
              <div className="tx-info" style={{ marginTop: '15px', fontSize: '14px' }}>
                <p>Transaction: <a href={`https://sepolia.celoscan.io/tx/${mintTxHash}`} target="_blank" rel="noopener noreferrer">{mintTxHash.slice(0, 10)}...{mintTxHash.slice(-8)}</a></p>
              </div>
            )}

            <button
              onClick={handleMint}
              disabled={minting}
              className="generate-button"
              style={{ marginTop: '20px' }}
            >
              {minting ? 'Minting NFT...' : '🚀 Mint NFT'}
            </button>

            {result.proof && (
              <div className="timing" style={{ marginTop: '20px' }}>
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
            )}
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && mintedTokenId && (
          <div className="complete-section">
            <h2>🎊 Minted Successfully!</h2>

            {result?.metadata && (
              <div className="metadata">
                <h3>{result.metadata.eventName}</h3>
                <p>Token ID: <strong>#{mintedTokenId}</strong></p>
              </div>
            )}

            {mintTxHash && (
              <div className="metadata" style={{ marginTop: '20px' }}>
                <h3>Transaction</h3>
                <a
                  href={`https://sepolia.celoscan.io/tx/${mintTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0052FF', textDecoration: 'none' }}
                >
                  View on Explorer →
                </a>
              </div>
            )}

            <button
              onClick={() => {
                setStep('upload');
                setFile(null);
                setResult(null);
                setSelfVerified(false);
                setMintTxHash('');
                setMintedTokenId('');
              }}
              className="generate-button"
              style={{ marginTop: '30px' }}
            >
              Mint Another Event
            </button>
          </div>
        )}

        <footer>
          <p>
            Built with Noir + SELF Protocol + ZK Email
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
