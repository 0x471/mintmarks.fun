# Mintmarks.fun - Implementation Complete ✅

## Overview

Mintmarks.fun is a privacy-preserving proof-of-attendance NFT system that combines:
- **ZK Email Proofs** (Noir) - Verify email attendance without revealing email content
- **SELF Protocol** - Sybil resistance via passport verification in TEE
- **Celo Blockchain** - Low-cost, eco-friendly NFT minting

## ✅ What's Implemented

### 1. Smart Contracts (Deployed on Celo Sepolia)

**Deployed Addresses (LATEST - with verify-once-mint-multiple):**
- HonkVerifier: `0x493d3ce4c48a29ea009046a7f760c1e7872ef8c0`
- ProofOfHuman: `0xef3f7c040b6102345d40e5db678a27a31d46c233`
- Mintmarks: `0x6fcabb7c0aecb72b40de25f4e0ff15f47793c451`

**Key Features:**
- ✅ ZK proof verification (UltraHonk/Noir)
- ✅ SELF Protocol integration for sybil resistance
- ✅ **Verify-once-mint-multiple pattern**: User verifies with SELF once, can mint unlimited events
- ✅ Multi-event support (one human can mint once per event, not once total)
- ✅ Event collections with automatic deduplication
- ✅ Fee system (0.01 CELO collection creation + 0.001 CELO per mint)
- ✅ On-chain metadata URI storage per token

**Latest Architecture: Verify-Once-Mint-Multiple**
Implemented address-based verification to work around SELF Protocol's one-verification-per-scope limitation:
- `addressVerified[wallet]` tracks global verification status
- `addressToHumanNullifier[wallet]` links wallet to human
- Dual-path verification: Email-verified OR address-verified
- First event: User must verify with SELF (stores address verification)
- Subsequent events: Auto-skips SELF verification, uses stored human nullifier
- Result: Better UX + works within SELF Protocol constraints

### 2. Frontend (React + Vite + ZK Email)

**Full User Flow:**
1. **Upload** - Select .eml file from email client
2. **Generate Proof** - Browser-based ZK proof generation (30-60s)
3. **SELF Verify** - Scan QR code with SELF app to prove unique human
4. **Mint NFT** - Submit transaction to mint attendance NFT
5. **Complete** - View minted NFT and transaction

**Key Features:**
- ✅ Client-side ZK proof generation (WASM)
- ✅ DKIM verification
- ✅ Email nullifier extraction from proof public outputs
- ✅ SELF Protocol QR code integration
- ✅ Wallet connection (MetaMask/injected)
- ✅ Contract integration with proper fee handling
- ✅ Transaction confirmation and error handling
- ✅ Auto-detection of already verified emails
- ✅ Graceful error recovery (EmailNullifierAlreadyVerified)

**Environment Variables (LATEST):**
```env
VITE_PROOF_OF_HUMAN_ADDRESS=0xef3f7c040b6102345d40e5db678a27a31d46c233
VITE_MINTMARKS_ADDRESS=0x6fcabb7c0aecb72b40de25f4e0ff15f47793c451
VITE_VERIFIER_ADDRESS=0x493d3ce4c48a29ea009046a7f760c1e7872ef8c0
VITE_SELF_SCOPE_SEED=mintmarks.fun
```

### 3. Metadata Generation (AI + IPFS)

**Automated Metadata Pipeline:**
- ✅ AI image generation (FAL AI + SDXL)
- ✅ IPFS upload via Pinata
- ✅ Metadata JSON generation
- ✅ On-chain metadata URI setting

**Usage:**
```bash
cd metadata
pnpm set-metadata 1 "ETHGlobal Buenos Aires"
```

This generates:
1. AI-generated event badge image
2. Uploads to IPFS
3. Creates ERC-1155 metadata JSON
4. Calls `setTokenURI(tokenId, metadataURI)` on contract

**Output:**
- Metadata URI: `ipfs://Qm...`
- Gateway URL: `https://gateway.pinata.cloud/ipfs/Qm...`
- OpenSea compatibility ✅

### 4. Architecture Highlights

**Privacy Guarantees:**
- Email content never leaves user's browser
- Only email nullifier (hash) is public
- ZK proof verifies DKIM signature without revealing email
- SELF verification proves unique human without revealing identity

**Sybil Resistance:**
- SELF Protocol provides passport-based human verification
- Each human (by passport nullifier) can mint each event once
- No age/country/OFAC restrictions (pure uniqueness)

**Multi-Event Support:**
```
User → Passport → humanNullifier (fixed per person)
Event A Email → emailNullifier_A → humanNullifier → Mint Event A ✅
Event B Email → emailNullifier_B → humanNullifier → Mint Event B ✅
```

**Event Collections:**
```
Collection ID = keccak256(eventName + pubkeyHash)
- Same event name from same domain → same collection
- Same event name from different domain → different collection
- Prevents collision attacks
```

## 📊 System Flow

```
1. User receives email confirmation from event
   └─> Downloads .eml file

2. User uploads .eml to mintmarks.fun
   └─> Browser extracts DKIM signature, headers, event name
   └─> Generates ZK proof (Noir circuit, ~30-60s)
   └─> Extracts emailNullifier from proof public outputs

3. User scans QR code with SELF app
   └─> SELF app verifies passport in TEE
   └─> Generates humanNullifier (unique per passport)
   └─> Submits transaction to ProofOfHuman contract
   └─> Contract stores: emailNullifier → humanNullifier mapping

4. User clicks "Mint NFT"
   └─> Frontend calls Mintmarks.mint(proof, publicInputs)
   └─> Contract verifies:
       a) ProofOfHuman.verifyAndConsumeHuman()
          - Email nullifier was verified by SELF
          - msg.sender matches verified address
          - Human hasn't claimed this event before
       b) Noir proof verification (DKIM signature)
   └─> Mints ERC-1155 token to user
   └─> Emits Minted event with tokenId, eventName

5. Contract owner generates metadata
   └─> Listens to Minted events (or manual trigger)
   └─> Runs: pnpm set-metadata <tokenId> "<eventName>"
   └─> AI generates event badge image
   └─> Uploads to IPFS
   └─> Calls setTokenURI(tokenId, ipfs://...)
   └─> NFT displays on OpenSea/marketplaces
```

## 🔧 Technical Stack

**Smart Contracts:**
- Solidity 0.8.28
- Foundry for development
- OpenZeppelin (ERC-1155, Ownable)
- SELF Protocol contracts (@selfxyz/contracts)
- UltraHonk verifier (Noir)

**Frontend:**
- React 19 + TypeScript
- Vite
- ethers.js v6
- @zk-email/zkemail-nr (DKIM verification)
- @selfxyz/qrcode (SELF integration)
- Noir WASM (proof generation)

**Backend/Metadata:**
- Node.js + TypeScript
- FAL AI (SDXL image generation)
- Pinata (IPFS pinning)
- ethers.js (contract interaction)

**Blockchain:**
- Celo Sepolia Testnet (Chain ID: 11142220)
- RPC: https://forno.celo-sepolia.celo-testnet.org
- Explorer: https://sepolia.celoscan.io/

## 🐛 Issues Fixed

### 1. ScopeMismatch Error
**Problem:** SELF Protocol rejected verification requests
**Root Cause:** Contract addresses were checksummed (uppercase letters)
**Fix:** Changed all addresses to lowercase (non-checksummed) in configs

### 2. EmailNullifierAlreadyVerified on 2nd Try
**Problem:** Users couldn't verify twice with same email proof
**Root Cause:** Correct behavior! Each email proof should only verify once
**Fix:** Added error handling to auto-advance to mint step if already verified

### 3. Multi-Event Wallet Conflict
**Problem:** Verifying Event B with Wallet 2 would break Event A (minted with Wallet 1)
**Root Cause:** `humanNullifierToAddress[humanNullifier]` was overwritten
**Fix:** Changed to `emailNullifierToAddress[emailNullifier]` mapping

### 4. One-Time-Only Minting
**Problem:** Original contract only allowed one mint per human globally
**Root Cause:** Single verification prevented multiple event participation
**Fix:** Proper architecture with `humanUsedForEvent[humanNullifier][eventName]`

## 📝 Configuration Files

**contracts/configs/celo.json (LATEST):**
```json
{
  "network": "celo-sepolia",
  "chainId": 11142220,
  "rpcUrl": "https://forno.celo-sepolia.celo-testnet.org",
  "selfHubAddress": "0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74",
  "scopeSeed": "mintmarks.fun",
  "contracts": {
    "verifier": "0x493d3ce4c48a29ea009046a7f760c1e7872ef8c0",
    "proofOfHuman": "0xef3f7c040b6102345d40e5db678a27a31d46c233",
    "mintmarks": "0x6fcabb7c0aecb72b40de25f4e0ff15f47793c451"
  },
  "fees": {
    "collection": "0.01",
    "minting": "0.001",
    "total": "0.011"
  },
  "metadataUri": "https://mintmarks.fun/api/metadata/{id}"
}
```

## 🚀 Deployment Steps (Already Done)

1. ✅ Compiled Noir circuit
2. ✅ Generated UltraHonk verifier
3. ✅ Deployed contracts to Celo Sepolia
4. ✅ Updated frontend .env with contract addresses (lowercase)
5. ✅ Tested SELF verification flow
6. ✅ Implemented minting UI
7. ✅ Created metadata generation pipeline

## 📦 Repository Structure

```
mintmarks.fun/
├── contracts/              # Solidity contracts + Foundry
│   ├── src/
│   │   ├── Mintmarks.sol       # Main ERC-1155 NFT contract
│   │   └── ProofOfHuman.sol    # SELF Protocol integration
│   ├── configs/celo.json       # Deployment config
│   └── script/Deploy.s.sol     # Deployment script
├── mintmarks_circuits/     # Noir ZK circuits
│   ├── src/main.nr             # Main circuit
│   └── contract/               # Generated verifier
├── web/                    # React frontend
│   ├── src/
│   │   ├── App.tsx             # Main UI flow
│   │   └── lib/proofGenerator.ts  # ZK proof generation
│   └── .env                    # Contract addresses
├── metadata/               # Metadata generation
│   ├── src/
│   │   ├── generateMetadata.ts # AI + IPFS
│   │   └── setMetadata.ts      # On-chain setter
│   └── README.md               # Usage docs
└── pnpm-workspace.yaml     # Monorepo config
```

## 🎯 Next Steps (Optional Enhancements)

1. **Automated Metadata** - Event listener + auto-generation
2. **Frontend Polish** - Better loading states, animations
3. **Multiple Networks** - Deploy to Celo mainnet
4. **Batch Minting** - Allow multiple events in one transaction
5. **Marketplace Integration** - Custom NFT gallery
6. **Event Organizer Dashboard** - Create & manage collections
7. **Email Templates** - Support more event platforms beyond Luma
8. **Mobile App** - Native mobile experience

## 🎉 Ready to Use!

The system is fully functional and deployed. Users can:

1. Visit the frontend at your deployed URL
2. Upload .eml files from event confirmations
3. Verify with SELF Protocol app
4. Mint attendance NFTs for 0.011 CELO
5. View NFTs on OpenSea (after metadata is set)

**Contract Owner Tasks:**
- Monitor `Minted` events
- Run `pnpm set-metadata <tokenId> "<eventName>"` for new collections
- Optionally automate metadata generation

## 📚 Documentation

- Frontend: `web/README.md`
- Contracts: `contracts/README.md`
- Metadata: `metadata/README.md`
- Circuits: `mintmarks_circuits/README.md`

## 🔗 Links

- **Deployed Contracts:** [Celo Sepolia Explorer](https://sepolia.celoscan.io/)
- **ProofOfHuman (LATEST):** https://sepolia.celoscan.io/address/0xef3f7c040b6102345d40e5db678a27a31d46c233
- **Mintmarks (LATEST):** https://sepolia.celoscan.io/address/0x6fcabb7c0aecb72b40de25f4e0ff15f47793c451
- **SELF Protocol:** https://docs.self.xyz/
- **Noir:** https://noir-lang.org/

---

**Built with ❤️ for ETHGlobal Buenos Aires 2025**
