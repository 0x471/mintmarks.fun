// Contract Integration Service
// CRITICAL: This handles all blockchain interactions for minting

import { ethers } from 'ethers'
import { CONTRACTS } from '@/config/chains'

// Contract ABIs (minimal fragments needed)
const PROOF_OF_HUMAN_ABI = [
  'function isEmailNullifierVerified(bytes32) view returns (bool)',
  'function isAddressVerified(address) view returns (bool)',
  'function humanUsedForEvent(uint256, string) view returns (bool)',
  'function verifyAndConsumeHuman(bytes32, address, string) returns (uint256)',
]

const MINTMARKS_ABI = [
  'function mint(bytes calldata, bytes32[]) payable returns (uint256)',
  'function usedNullifiers(bytes32) view returns (bool)',
  'function getCollectionId(string, bytes32) view returns (uint256)',
  'event Minted(address indexed minter, uint256 indexed tokenId, bytes32 indexed emailNullifier, uint256 humanNullifier, string eventName)',
]

/**
 * Check if email nullifier or address is already verified on-chain
 * CRITICAL: This enables resume flow and skip logic
 */
export async function checkVerificationStatus(
  provider: ethers.Provider,
  emailNullifier: string,
  walletAddress: string
): Promise<{
  isEmailVerified: boolean
  isAlreadyMinted: boolean
  isAddressVerified: boolean
}> {
  try {
    const proofOfHuman = new ethers.Contract(
      CONTRACTS.CELO_SEPOLIA.PROOF_OF_HUMAN,
      PROOF_OF_HUMAN_ABI,
      provider
    )

    const mintmarks = new ethers.Contract(
      CONTRACTS.CELO_SEPOLIA.MINTMARKS,
      MINTMARKS_ABI,
      provider
    )

    // Ensure emailNullifier is properly formatted as bytes32 (32-byte hex string)
    const emailNullifierBytes32 = emailNullifier.startsWith('0x')
      ? ethers.zeroPadValue(emailNullifier, 32)
      : '0x' + emailNullifier.padStart(64, '0')

    console.log('[Contracts] Email nullifier (bytes32):', emailNullifierBytes32)

    // Check all statuses in parallel
    const [isEmailVerified, isAlreadyMinted, isAddressVerified] = await Promise.all([
      proofOfHuman.isEmailNullifierVerified(emailNullifierBytes32),
      mintmarks.usedNullifiers(emailNullifierBytes32),
      proofOfHuman.isAddressVerified(walletAddress), // Do NOT lowercase - use original case
    ])

    console.log('[Contracts] Verification status:', {
      emailNullifier: emailNullifier.substring(0, 20) + '...',
      isEmailVerified,
      isAlreadyMinted,
      isAddressVerified,
    })

    return {
      isEmailVerified,
      isAlreadyMinted,
      isAddressVerified,
    }
  } catch (error) {
    console.error('[Contracts] Error checking verification status:', error)
    throw error
  }
}

/**
 * Mint NFT with ZK proof and SELF verification
 * CRITICAL: This is the main minting function
 */
export async function mintNFT(
  signer: ethers.Signer,
  proofBytes: Uint8Array,
  publicInputs: string[],
  fee: string
): Promise<{
  txHash: string
  tokenId: string
  collectionId: string
  eventName: string
}> {
  try {
    console.log('[Contracts] Starting mint transaction...')
    console.log('[Contracts] Proof size:', proofBytes.length)
    console.log('[Contracts] Public inputs:', publicInputs.length)
    console.log('[Contracts] Fee:', fee, 'CELO')

    const mintmarks = new ethers.Contract(
      CONTRACTS.CELO_SEPOLIA.MINTMARKS,
      MINTMARKS_ABI,
      signer
    )

    // Convert proof to hex string (required by ethers.js for bytes calldata)
    const proofHex = ethers.hexlify(proofBytes)
    console.log('[Contracts] Proof hex:', proofHex.substring(0, 100) + '...')

    // Public inputs must be hex strings for bytes32[] (NOT BigInt!)
    // Ensure all inputs are properly formatted as 32-byte hex strings
    const publicInputsBytes32 = publicInputs.map(input => {
      // If already a hex string, ensure it's 32 bytes (64 hex chars + 0x prefix)
      if (input.startsWith('0x')) {
        // Pad to 32 bytes if needed
        return ethers.zeroPadValue(input, 32)
      }
      // If decimal string, convert to hex and pad to 32 bytes
      const hex = '0x' + BigInt(input).toString(16).padStart(64, '0')
      return hex
    })

    console.log('[Contracts] Public inputs count:', publicInputsBytes32.length)
    console.log('[Contracts] First 3 public inputs (bytes32):', publicInputsBytes32.slice(0, 3))

    // Send mint transaction with bytes32[] public inputs
    const tx = await mintmarks.mint(
      proofHex,
      publicInputsBytes32,
      { value: ethers.parseEther(fee) }
    )

    console.log('[Contracts] Transaction submitted:', tx.hash)

    // Wait for confirmation
    const receipt = await tx.wait()
    console.log('[Contracts] Transaction confirmed:', receipt.hash)

    // Parse Minted event to extract token ID
    const mintedEvent = receipt.logs
      .map((log: any) => {
        try {
          return mintmarks.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((e: any) => e?.name === 'Minted')

    if (!mintedEvent) {
      throw new Error('Minted event not found in transaction receipt')
    }

    const tokenId = mintedEvent.args.tokenId.toString()
    const collectionId = mintedEvent.args.collectionId.toString()
    const eventName = mintedEvent.args.eventName

    console.log('[Contracts] NFT minted successfully:', {
      tokenId,
      collectionId,
      eventName,
    })

    return {
      txHash: receipt.hash,
      tokenId,
      collectionId,
      eventName,
    }
  } catch (error: any) {
    console.error('[Contracts] Minting error:', error)

    // Parse error message for user-friendly display
    let errorMessage = 'Minting failed'

    if (error.message) {
      if (error.message.includes('EmailNullifierAlreadyVerified')) {
        errorMessage = 'This email proof has already been verified'
      } else if (error.message.includes('EmailNullifierAlreadyUsed')) {
        errorMessage = 'This email has already been used to mint an NFT'
      } else if (error.message.includes('HumanAlreadyUsedForEvent')) {
        errorMessage = 'You have already minted an NFT for this event'
      } else if (error.message.includes('InvalidProof')) {
        errorMessage = 'Invalid ZK proof - please regenerate proof'
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient CELO balance to pay minting fee'
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction rejected by user'
      } else {
        errorMessage = error.message
      }
    }

    throw new Error(errorMessage)
  }
}

/**
 * Calculate minting fee based on whether collection exists
 * CRITICAL: Different fees for new vs existing collections
 */
export async function calculateMintingFee(
  provider: ethers.Provider,
  eventName: string,
  pubkeyHash: string
): Promise<{
  fee: string
  isNewCollection: boolean
}> {
  try {
    const mintmarks = new ethers.Contract(
      CONTRACTS.CELO_SEPOLIA.MINTMARKS,
      MINTMARKS_ABI,
      provider
    )

    // Ensure pubkeyHash is properly formatted as bytes32
    const pubkeyHashBytes32 = pubkeyHash.startsWith('0x')
      ? ethers.zeroPadValue(pubkeyHash, 32)
      : '0x' + pubkeyHash.padStart(64, '0')

    // Get collection ID
    const collectionId = await mintmarks.getCollectionId(eventName, pubkeyHashBytes32)

    // If collection ID is 0, it's a new collection
    const isNewCollection = collectionId.toString() === '0'

    // Fees: 0.011 for new collection (0.01 creation + 0.001 mint)
    //       0.001 for existing collection (just mint)
    const fee = isNewCollection ? '0.011' : '0.001'

    console.log('[Contracts] Fee calculation:', {
      eventName,
      collectionId: collectionId.toString(),
      isNewCollection,
      fee: fee + ' CELO',
    })

    return { fee, isNewCollection }
  } catch (error) {
    console.error('[Contracts] Error calculating fee:', error)
    // Default to higher fee to be safe
    return { fee: '0.011', isNewCollection: true }
  }
}

/**
 * Get provider from window.ethereum or CDP
 * CRITICAL: Handles both MetaMask and CDP wallets
 */
export function getProvider(): ethers.BrowserProvider | null {
  if (typeof window === 'undefined') return null

  if ((window as any).ethereum) {
    return new ethers.BrowserProvider((window as any).ethereum)
  }

  return null
}

/**
 * Get signer from provider
 */
export async function getSigner(
  provider: ethers.BrowserProvider
): Promise<ethers.Signer> {
  return await provider.getSigner()
}
