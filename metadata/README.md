# Mintmarks Metadata Generator

AI-powered metadata and image generation for Mintmarks NFTs.

## Features

- 🎨 **AI Image Generation** - Creates unique event badges using FAL AI (SDXL)
- 📦 **IPFS Storage** - Uploads images and metadata to IPFS via Pinata
- ⛓️ **On-chain Integration** - Sets metadata URI directly on the Mintmarks contract

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Copy `.env.example` to `.env` and fill in your API keys:
```bash
cp .env.example .env
```

Required environment variables:
- `PINATA_JWT` - Get from https://app.pinata.cloud/developers/api-keys
- `FAL_KEY` - Get from https://fal.ai/dashboard/keys
- `PRIVATE_KEY` - Contract owner private key (for setting metadata on-chain)
- `MINTMARKS_ADDRESS` - Deployed Mintmarks contract address

## Usage

### Generate Metadata Only

Generate AI image and metadata for an event:

```bash
pnpm generate "ETHGlobal Buenos Aires"
```

This will:
1. Generate an AI image for the event
2. Upload image to IPFS via Pinata
3. Create and upload metadata JSON to IPFS
4. Return the metadata URI

### Generate and Set Metadata On-Chain

Generate metadata AND set it on the contract:

```bash
pnpm set-metadata 1 "ETHGlobal Buenos Aires"
```

Arguments:
- `1` - Token ID (from minting event)
- `"ETHGlobal Buenos Aires"` - Event name

This will:
1. Generate and upload metadata (same as above)
2. Call `setTokenURI(tokenId, metadataURI)` on the Mintmarks contract
3. Wait for transaction confirmation

## Example Workflow

1. User mints NFT via frontend → gets token ID #1
2. Contract owner generates metadata:
   ```bash
   cd metadata
   pnpm set-metadata 1 "ETHGlobal Buenos Aires"
   ```
3. Metadata is set on-chain and NFT displays on OpenSea/marketplaces

## Automation (Optional)

For production, you can automate this by:
1. Listening to `Minted` events from the contract
2. Extracting `tokenId` and `eventName` from the event
3. Calling `setMetadata(tokenId, eventName)` automatically

Example:
```typescript
mintmarks.on('Minted', async (minter, tokenId, emailNullifier, humanNullifier, eventName) => {
  console.log(`New mint: Token #${tokenId} for event "${eventName}"`)
  await setMetadata(tokenId.toString(), eventName)
})
```

## Cost Estimates

- **FAL AI (SDXL)**: ~$0.01-0.03 per image
- **Pinata (IPFS)**: Free tier supports 1GB storage
- **Gas**: ~0.001 CELO per setTokenURI call

## Output Example

```
Mintmarks Metadata Generator
================================

Event: ETHGlobal Buenos Aires

Generating AI image for: "ETHGlobal Buenos Aires"
   Generated image URL: https://fal.media/files/...
AI image generated (234.56 KB)

Uploading image to IPFS (Pinata)...
Image uploaded: ipfs://QmXxx...
   Gateway: https://gateway.pinata.cloud/ipfs/QmXxx...

Uploading metadata to IPFS (Pinata)...
Metadata uploaded: ipfs://QmYyy...
   Gateway: https://gateway.pinata.cloud/ipfs/QmYyy...

Setting metadata URI on-chain...
Transaction sent: 0x123...
Transaction confirmed! Block: 12345678

================================
Success! Metadata set for token #1
View on OpenSea: https://testnets.opensea.io/assets/celo-sepolia/0x.../1
================================
```

## Metadata Format

```json
{
  "name": "Mintmark: ETHGlobal Buenos Aires",
  "description": "Proof of attendance at ETHGlobal Buenos Aires, verified via ZKEmail. This token represents verified participation in the event.",
  "image": "ipfs://QmXxx...",
  "attributes": [
    {
      "trait_type": "Event",
      "value": "ETHGlobal Buenos Aires"
    },
    {
      "trait_type": "Network",
      "value": "Celo"
    }
  ]
}
```
