// SELF Protocol Integration Service
// Extracted from main frontend's working implementation

import { SelfAppBuilder, getUniversalLink, type SelfApp } from '@selfxyz/qrcode';

export interface SelfConfig {
  scopeSeed: string;
  proofOfHumanAddress: string;
  userId: string; // wallet address
  emailNullifier: string;
  endpointType: string; // 'staging_celo' | 'production_celo'
}

/**
 * Creates a SELF app instance for QR code verification
 *
 * CRITICAL: This follows the exact pattern from the working main frontend
 * - scope: Global scope seed (mintmarks.fun)
 * - endpoint: ProofOfHuman contract address (must be lowercase!)
 * - userId: Wallet address (must be lowercase!)
 * - userDefinedData: Email nullifier to link email to human
 */
export function createSelfApp(config: SelfConfig): SelfApp {
  console.log('[SELF] Creating SELF app with config:', {
    scope: config.scopeSeed,
    endpoint: config.proofOfHumanAddress,
    userId: config.userId,
    emailNullifier: config.emailNullifier.substring(0, 20) + '...',
    endpointType: config.endpointType,
  });

  const app = new SelfAppBuilder({
    version: 2,
    appName: 'Mintmarks',
    scope: config.scopeSeed,
    endpoint: config.proofOfHumanAddress,
    userId: config.userId,
    endpointType: config.endpointType as any, // Type assertion for staging_celo
    userIdType: 'hex',
    userDefinedData: config.emailNullifier,
    disclosures: {
      // Match ProofOfHuman.sol verification config (no restrictions)
      // olderThan: 0, forbiddenCountries: [], ofacEnabled: false
      // No minimumAge requirement, no country restrictions
    },
  }).build();

  console.log('[SELF] SELF app created successfully');
  return app;
}

/**
 * Gets the universal link for the SELF app
 * This is used for the QR code
 */
export function getSelfUniversalLink(app: SelfApp): string {
  const link = getUniversalLink(app);
  console.log('[SELF] Universal link generated:', link.substring(0, 50) + '...');
  return link;
}

/**
 * Error codes from SELF Protocol
 * Based on working main frontend's error handling
 */
export const SELF_ERROR_CODES = {
  EMAIL_NULLIFIER_ALREADY_VERIFIED: '0x6abd5694',
  SCOPE_MISMATCH: '0x...', // Add if needed
} as const;

/**
 * Handles SELF Protocol errors
 * @param error Error from SELF verification
 * @returns User-friendly error message or null if error should trigger auto-skip
 */
export function handleSelfError(error: any): { autoSkip: boolean; message?: string } {
  console.error('[SELF] Verification error:', error);
  console.error('[SELF] Error details:', JSON.stringify(error, null, 2));

  // EmailNullifierAlreadyVerified - this is expected if user already verified
  // We should auto-skip to mint step
  if (error?.error_code === SELF_ERROR_CODES.EMAIL_NULLIFIER_ALREADY_VERIFIED) {
    console.log('[SELF] Email nullifier already verified - auto-skipping to mint');
    return {
      autoSkip: true,
      message: 'This email proof has already been verified! Moving to mint step...',
    };
  }

  // Proof generation failed - detailed error
  if (error?.status === 'proof_generation_failed' || error?.message?.includes('proof_generation_failed')) {
    console.error('[SELF] Proof generation failed on SELF Protocol side');
    return {
      autoSkip: false,
      message: `SELF verification failed: Proof generation failed. This might be due to network issues, incorrect configuration, or SELF Protocol limitations. Please try again or contact support.`,
    };
  }

  // Other errors - show to user
  const errorMessage = error?.message || error?.error_message || error?.status || 'Unknown error';
  return {
    autoSkip: false,
    message: `SELF verification failed: ${errorMessage}`,
  };
}
