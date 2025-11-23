#!/usr/bin/env tsx
import { config } from 'dotenv'
import * as fal from '@fal-ai/serverless-client'

// Load environment variables
config()

// Initialize clients
const PINATA_JWT = process.env.PINATA_JWT
const FAL_KEY = process.env.FAL_KEY

if (!PINATA_JWT) {
  console.error('Error: PINATA_JWT environment variable not set')
  console.error('   Get your JWT from: https://app.pinata.cloud/developers/api-keys')
  process.exit(1)
}

if (!FAL_KEY) {
  console.error('Error: FAL_KEY environment variable not set')
  console.error('   Get your key from: https://fal.ai')
  process.exit(1)
}

fal.config({ credentials: FAL_KEY })

// Upload file to Pinata IPFS
async function uploadToPinata(buffer: Buffer, filename: string): Promise<string> {
  const blob = new Blob([buffer], { type: 'image/png' })
  const formData = new FormData()
  formData.append('file', blob, filename)

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PINATA_JWT}`
    },
    body: formData
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Pinata upload failed: ${error}`)
  }

  const data = await response.json()
  return data.IpfsHash
}

// Upload JSON to Pinata IPFS
async function uploadJSONToPinata(json: object, name: string): Promise<string> {
  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PINATA_JWT}`
    },
    body: JSON.stringify({
      pinataContent: json,
      pinataMetadata: { name }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Pinata JSON upload failed: ${error}`)
  }

  const data = await response.json()
  return data.IpfsHash
}

// Generate AI image for event
async function generateAIImage(eventName: string): Promise<Buffer> {
  console.log(`Generating AI image for: "${eventName}"`)

  // [PROMPT]
  const prompt = `A minimalist digital badge for '${eventName}', modern geometric design, gradient background in Celo brand colors (blue #0052FF to green #35D07F), clean typography, professional event pass aesthetic, square format, NFT artwork style, high quality, detailed`

  const result: any = await fal.subscribe('fal-ai/fast-sdxl', {
    input: {
      prompt,
      image_size: 'square_hd', // 1024x1024
      num_inference_steps: 25,
      num_images: 1,
      negative_prompt: 'blurry, low quality, distorted, ugly, text, words, letters'
    }
  })

  // Download generated image
  const imageUrl = result.images[0].url
  console.log(`   Generated image URL: ${imageUrl}`)

  const response = await fetch(imageUrl)
  const arrayBuffer = await response.arrayBuffer()

  return Buffer.from(arrayBuffer)
}

// Upload to IPFS via Pinata and return metadata URI
export async function generateAndUploadMetadata(
  eventName: string
): Promise<{ metadataURI: string; imageURI: string; gatewayURL: string }> {
  console.log(`\nMintmarks Metadata Generator`)
  console.log(`================================\n`)
  console.log(`Event: ${eventName}\n`)

  // Step 1: Generate AI image
  const imageBuffer = await generateAIImage(eventName)
  console.log(`AI image generated (${(imageBuffer.length / 1024).toFixed(2)} KB)\n`)

  // Step 2: Upload image to IPFS via Pinata
  console.log(`Uploading image to IPFS (Pinata)...`)

  const imageCID = await uploadToPinata(imageBuffer, 'mintmark.png')
  console.log(`Image uploaded: ipfs://${imageCID}`)
  console.log(`   Gateway: https://gateway.pinata.cloud/ipfs/${imageCID}\n`)

  // Step 3: Create metadata JSON
  const metadata = {
    name: `Mintmark: ${eventName}`,
    description: `Proof of attendance at ${eventName}, verified via ZKEmail. This token represents verified participation in the event.`,
    image: `ipfs://${imageCID}`,
    attributes: [
      {
        trait_type: 'Event',
        value: eventName
      },
      {
        trait_type: 'Network',
        value: 'Celo'
      },
    ]
  }

  // Step 4: Upload metadata to IPFS via Pinata
  console.log(`Uploading metadata to IPFS (Pinata)...`)

  const metadataCID = await uploadJSONToPinata(metadata, 'metadata.json')
  console.log(`Metadata uploaded: ipfs://${metadataCID}`)
  console.log(`   Gateway: https://gateway.pinata.cloud/ipfs/${metadataCID}`)

  const metadataURI = `ipfs://${metadataCID}`
  const imageURI = `ipfs://${imageCID}`
  const gatewayURL = `https://gateway.pinata.cloud/ipfs/${metadataCID}`

  return { metadataURI, imageURI, gatewayURL }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const eventName = process.argv[2]

  if (!eventName) {
    console.error('\nError: Event name required\n')
    console.error('Usage: pnpm generate "Event Name"\n')
    console.error('Example:')
    console.error('  pnpm generate "ETHGlobal Buenos Aires"\n')
    process.exit(1)
  }

  generateAndUploadMetadata(eventName)
    .then(({ metadataURI, imageURI, gatewayURL }) => {
      console.log(`\nSuccess!\n`)
      console.log(`================================`)
      console.log(`Metadata URI: ${metadataURI}`)
      console.log(`Image URI:    ${imageURI}`)
      console.log(`================================\n`)
      console.log(`Next step - Mint with:`)
      console.log(`cd ../contracts`)
      console.log(`TOKEN_URI="${metadataURI}" forge script script/Mint.s.sol --rpc-url $CELO_SEPOLIA_RPC_URL --broadcast\n`)
    })
    .catch(error => {
      console.error('\nError:', error.message)
      if (error.message.includes('401') || error.message.includes('403')) {
        console.error('\nCheck your API keys in .env file:')
        console.error('- PINATA_JWT')
        console.error('- FAL_KEY\n')
      }
      process.exit(1)
    })
}
