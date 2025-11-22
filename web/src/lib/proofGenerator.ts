// Client-side proof generator w/ ZK Email

import { generateEmailVerifierInputs, verifyDKIMSignature } from '@zk-email/zkemail-nr';
import {
  getConstrainedHeaderSequence,
  getHeaderValueSequence,
  getEventNameSequence,
} from './utils';
import { Buffer } from 'buffer';

export interface ProofResult {
  success: boolean;
  proof?: {
    proof: Uint8Array;
    publicInputs: string[];
    proofSize: number;
    proofTime: number;
    verifyTime: number;
    verified: boolean;
  };
  metadata?: {
    pubkeyHash: string;
    emailNullifier: string;
    dateValue: string;
    eventName: string;
  };
  totalTime?: number;
  error?: string;
}

// Circuit JSON will be loaded dynamically
let circuitJson: any = null;

async function loadCircuit() {
  if (circuitJson) return circuitJson;

  const response = await fetch('/circuit.json');
  if (!response.ok) {
    throw new Error(
      'Circuit not found. Please compile the circuit first.'
    );
  }

  // Verify response is JSON, not HTML (common 404 fallback)
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(
      `Circuit file returned ${contentType || 'unknown type'} instead of JSON. ` +
      'Make sure circuit is compiled and vite.config.ts copyCircuitPlugin is working.'
    );
  }

  circuitJson = await response.json();
  return circuitJson;
}

// Validate EML file format
export function validateEmlFile(content: string): { valid: boolean; error?: string } {
  if (!content || content.length === 0) {
    return { valid: false, error: 'File is empty' };
  }

  // Check for DKIM signature
  if (!content.includes('DKIM-Signature:') && !content.includes('dkim-signature:')) {
    return {
      valid: false,
      error: 'No DKIM signature found. This circuit requires DKIM-signed emails.',
    };
  }

  // Check for required headers
  const requiredHeaders = ['From:', 'To:', 'Subject:', 'Date:'];
  const missingHeaders = requiredHeaders.filter(
    (header) => !content.toLowerCase().includes(header.toLowerCase())
  );

  if (missingHeaders.length > 0) {
    return {
      valid: false,
      error: `Missing required headers: ${missingHeaders.join(', ')}`,
    };
  }

  return { valid: true };
}

// Generate circuit inputs from EML file content
async function generateCircuitInputs(emailContent: Buffer | Uint8Array) {
  const email = Buffer.isBuffer(emailContent) ? emailContent : Buffer.from(emailContent);

  // Generate base inputs
  const baseInputs = await generateEmailVerifierInputs(email, {
    maxHeadersLength: 2048, // Matches our circuit constant
    ignoreBodyHashCheck: true,
  });

  // Get DKIM result to extract headers
  const dkimResult = await verifyDKIMSignature(email, undefined, undefined, true);
  const headers = dkimResult.headers;

  // Debug: Log headers to help diagnose Chrome issues
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log('[ProofGenerator] Headers length:', headers.length);
    console.log('[ProofGenerator] Headers preview:', headers.toString().substring(0, 500));
  }

  // Extract Date header and value sequences
  let dateHeaderSequence, dateValueSequence;
  try {
    dateHeaderSequence = getConstrainedHeaderSequence(headers, 'date');
    dateValueSequence = getHeaderValueSequence(dateHeaderSequence, 'date');
  } catch (error) {
    console.error('[ProofGenerator] Failed to find Date header:', error);
    console.error('[ProofGenerator] Available headers:', headers.toString().substring(0, 1000));
    throw new Error(`Date header not found in email. This may be a browser-specific parsing issue. Original error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Extract Subject header and value sequences
  let subjectHeaderSequence, subjectValueSequence;
  try {
    subjectHeaderSequence = getConstrainedHeaderSequence(headers, 'subject');
    subjectValueSequence = getHeaderValueSequence(subjectHeaderSequence, 'subject');
  } catch (error) {
    console.error('[ProofGenerator] Failed to find Subject header:', error);
    throw new Error(`Subject header not found in email. Original error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Extract event name from subject
  const eventNameSequence = getEventNameSequence(headers, subjectValueSequence);

  // Remove extractTo-related fields that we don't use
  const { to_header_sequence, to_address_sequence, ...relevantInputs } = baseInputs as any;

  return {
    ...relevantInputs,
    date_header_sequence: dateHeaderSequence,
    date_value_sequence: dateValueSequence,
    subject_header_sequence: subjectHeaderSequence,
    subject_value_sequence: subjectValueSequence,
    event_name_sequence: eventNameSequence,
  };
}

/**
 * Parse public inputs
 * Public inputs structure:
 * - pubkeyHash (1 field)
 * - emailNullifier (1 field)
 * - dateValue.storage[64 fields] + dateValue.len (1 field)
 * - eventName.storage[256 fields] + eventName.len (1 field)
 */
function parsePublicInputs(publicInputs: string[]): {
  pubkeyHash: string;
  emailNullifier: string;
  dateValue: string;
  eventName: string;
} {
  const MAX_DATE_LENGTH = 64;
  const MAX_EVENT_NAME_LENGTH = 256;

  let idx = 0;
  const pubkeyHash = publicInputs[idx++];
  const emailNullifier = publicInputs[idx++];

  // Parse dateValue BoundedVec
  const dateStorage = publicInputs.slice(idx, idx + MAX_DATE_LENGTH);
  idx += MAX_DATE_LENGTH;
  const dateLen = parseInt(publicInputs[idx++]);
  const dateBytes = dateStorage.slice(0, dateLen).map(f => parseInt(f));
  const dateValue = String.fromCharCode(...dateBytes);

  // Parse eventName BoundedVec
  const eventStorage = publicInputs.slice(idx, idx + MAX_EVENT_NAME_LENGTH);
  idx += MAX_EVENT_NAME_LENGTH;
  const eventLen = parseInt(publicInputs[idx++]);
  const eventBytes = eventStorage.slice(0, eventLen).map(f => parseInt(f));
  const eventName = String.fromCharCode(...eventBytes);

  return {
    pubkeyHash,
    emailNullifier,
    dateValue,
    eventName,
  };
}

export class ProofGenerator {
  async generateProof(
    email: Buffer | Uint8Array,
    onProgress?: (status: string) => void
  ): Promise<ProofResult> {
    const startTime = Date.now();

    try {
      onProgress?.('Loading circuit...');
      const circuit = await loadCircuit();

      onProgress?.('Verifying DKIM signature...');
      const inputs = await generateCircuitInputs(email);

      // Dynamic import for bb.js, enables code splitting
      onProgress?.('Loading prover (WASM)...');
      const { ZKEmailProver } = await import('@zk-email/zkemail-nr/dist/prover.js');

      onProgress?.('Initializing prover...');
      const prover = new ZKEmailProver(circuit, 'honk', 1);

      try {
        // Generate proof
        onProgress?.('Generating proof... (this may take 50-60 seconds)');
        const proofStart = Date.now();
        const proofData = await prover.fullProve(inputs, 'honk');
        const proofTime = (Date.now() - proofStart) / 1000;

        // Verify proof
        onProgress?.('Verifying proof...');
        const verifyStart = Date.now();
        const verified = await prover.verify(proofData, 'honk');
        const verifyTime = (Date.now() - verifyStart) / 1000;

        if (!verified) {
          return {
            success: false,
            error: 'Proof verification failed',
          };
        }

        // Parse metadata from public inputs
        const metadata = parsePublicInputs(proofData.publicInputs);

        // Convert public inputs to hex strings for Solidity contract
        const publicInputsHex = proofData.publicInputs.map((input: string) => {
          const hex = BigInt(input).toString(16).padStart(64, '0');
          return '0x' + hex;
        });

        const totalTime = (Date.now() - startTime) / 1000;

        return {
          success: true,
          proof: {
            proof: proofData.proof,
            publicInputs: publicInputsHex,
            proofSize: proofData.proof.length,
            proofTime,
            verifyTime,
            verified,
          },
          metadata,
          totalTime,
        };
      } finally {
        await prover.destroy();
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }
}
