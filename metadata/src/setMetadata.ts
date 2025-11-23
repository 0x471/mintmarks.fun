#!/usr/bin/env tsx
import { config } from 'dotenv'
import { generateAndUploadMetadata } from './generateMetadata.js'
import { ethers } from 'ethers'

// Load environment variables
config()

const PRIVATE_KEY = process.env.PRIVATE_KEY
const RPC_URL = process.env.RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org'
const MINTMARKS_ADDRESS = process.env.MINTMARKS_ADDRESS

if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable not set')
  process.exit(1)
}

if (!MINTMARKS_ADDRESS) {
  console.error('Error: MINTMARKS_ADDRESS environment variable not set')
  process.exit(1)
}

/**
 * Generate metadata and set it on-chain for a specific token
 */
async function setMetadata(tokenId: string, eventName: string) {
  console.log(`\nMintmarks Metadata Setter`)
  console.log(`================================\n`)
  console.log(`Token ID: ${tokenId}`)
  console.log(`Event: ${eventName}\n`)

  // Step 1: Generate and upload metadata to IPFS
  const { metadataURI, imageURI, gatewayURL } = await generateAndUploadMetadata(eventName)

  console.log(`\nMetadata generated successfully!`)
  console.log(`Metadata URI: ${metadataURI}`)
  console.log(`Image URI: ${imageURI}`)
  console.log(`Gateway URL: ${gatewayURL}\n`)

  // Step 2: Set metadata URI on-chain
  console.log(`Setting metadata URI on-chain...`)

  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

  const mintmarksAbi = [
    'function setTokenURI(uint256 tokenId, string memory metadataURI) external',
  ]

  const mintmarks = new ethers.Contract(MINTMARKS_ADDRESS, mintmarksAbi, wallet)

  const tx = await mintmarks.setTokenURI(tokenId, metadataURI)
  console.log(`Transaction sent: ${tx.hash}`)

  const receipt = await tx.wait()
  console.log(`Transaction confirmed! Block: ${receipt.blockNumber}`)

  console.log(`\n================================`)
  console.log(`Success! Metadata set for token #${tokenId}`)
  console.log(`View on CeloScan: https://sepolia.celoscan.io/token/${MINTMARKS_ADDRESS}?a=${tokenId}`)
  console.log(`View on OpenSea: https://testnets.opensea.io/assets/celo-sepolia/${MINTMARKS_ADDRESS}/${tokenId}`)
  console.log(`================================\n`)
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const tokenId = process.argv[2]
  const eventName = process.argv[3]

  if (!tokenId || !eventName) {
    console.error('\nError: Token ID and event name required\n')
    console.error('Usage: pnpm set-metadata <tokenId> <eventName>\n')
    console.error('Example:')
    console.error('  pnpm set-metadata 1 "ETHGlobal Buenos Aires"\n')
    process.exit(1)
  }

  setMetadata(tokenId, eventName)
    .catch(error => {
      console.error('\nError:', error.message)
      process.exit(1)
    })
}
