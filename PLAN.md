# Mintmarks + SELF Protocol Integration Plan

## Critical Requirements Analysis

### User's Core Requirement (REVISED)
> "user will do only one tx, the noir one and self is gonna be automatic in the hook one"

**Correct Architecture:**
1. **Two separate contracts:**
   - `ProofOfHuman` - Modified SELF hook contract
   - `Mintmarks` - Main minting contract

2. **Flow:**
   - User scans QR with proofUID → SELF verifies (automatic, no user tx)
   - ProofOfHuman hook stores: `humanNullifier → proofUID` mapping
   - User submits Noir proof to Mintmarks (ONLY user tx)
   - Mintmarks queries ProofOfHuman to verify human uniqueness
   - Mintmarks mints NFT

3. **Single User Transaction:**
   - User ONLY submits Noir proof
   - SELF verification happens automatically via callback
   - No need for separate proof registration transaction

---

## Architecture: Two-Contract Design

### The Problem

**Current Mintmarks Flow:**
```
User → submitTx(NoirProof) → Contract verifies → Mint NFT
```
❌ **Missing sybil resistance** - one human can use multiple emails

**SELF Protocol Flow:**
```
User → Scan QR → SELF App (TEE) → SELF Verifier → Callback Hook
```
✅ **Provides unique human nullifier**

**Challenge:** Link both proofs with minimal user friction (one tx only)

---

## Solution: Separate ProofOfHuman Hook Contract

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  STEP 0: Off-Chain Preparation                                   │
├──────────────────────────────────────────────────────────────────┤
│  1. User opens webapp                                            │
│  2. User uploads .eml file                                       │
│  3. Extract DKIM signature from email                            │
│  4. Generate Noir proof in browser (30-60 sec)                   │
│  5. Compute proofUID = keccak256(proof, publicInputs)            │
│  6. User connects wallet → get address                           │
│  7. Display QR code with:                                        │
│     - userId: user's wallet address                              │
│     - userDefinedData: abi.encode(proofUID)                      │
│     - endpoint: ProofOfHuman contract address                    │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│  STEP 1: SELF Verification (Automatic - No User TX)              │
├──────────────────────────────────────────────────────────────────┤
│  User scans QR → SELF App → Verify in TEE → Submit to chain     │
│                               ↓                                   │
│  SELF Verifier Contract:                                         │
│    1. Verify SELF ZK proof (passport)                            │
│    2. Extract humanNullifier                                     │
│    3. Call ProofOfHuman.customVerificationHook()                 │
│                               ↓                                   │
│  ProofOfHuman Contract:                                          │
│    customVerificationHook(output, userData) {                    │
│      humanNullifier = output.nullifier                           │
│      userAddress = address(output.userIdentifier)                │
│      proofUID = abi.decode(userData, (bytes32))                  │
│                                                                   │
│      // Store mappings:                                          │
│      humanNullifierToProofUID[humanNullifier] = proofUID         │
│      proofUIDToHumanNullifier[proofUID] = humanNullifier         │
│      proofUIDStatus[proofUID] = "VERIFIED"                       │
│      humanNullifierToAddress[humanNullifier] = userAddress       │
│                                                                   │
│      emit HumanVerified(humanNullifier, proofUID, userAddress)   │
│    }                                                              │
│                                                                   │
│  ✅ User sees success message: "Human verified! Ready to mint"    │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│  STEP 2: Submit Noir Proof & Mint (ONLY USER TRANSACTION)        │
├──────────────────────────────────────────────────────────────────┤
│  User → Mintmarks.mint(proof, publicInputs, proofUID)            │
│                               ↓                                   │
│  Mintmarks Contract:                                             │
│    mint(proof, publicInputs, proofUID) {                         │
│      // 1. Verify proofUID matches hash of submitted proof       │
│      bytes32 computedUID = keccak256(abi.encodePacked(           │
│        proof, publicInputs                                       │
│      ))                                                           │
│      require(computedUID == proofUID, "Proof hash mismatch")     │
│                                                                   │
│      // 2. Verify Noir proof                                     │
│      require(verifier.verify(proof, publicInputs))               │
│                                                                   │
│      // 3. Extract data from proof                               │
│      emailNullifier = publicInputs[1]                            │
│      eventName = _extractEventName(publicInputs)                 │
│      pubkeyHash = publicInputs[0]                                │
│                                                                   │
│      // 4. Query ProofOfHuman to verify human                    │
│      humanNullifier = proofOfHuman.verifyAndConsumeHuman(        │
│        proofUID,                                                 │
│        msg.sender,                                               │
│        eventName                                                 │
│      )                                                            │
│      // This checks:                                             │
│      //  - proofUID was verified by SELF                         │
│      //  - humanNullifier not used for this event                │
│      //  - msg.sender matches verified address                   │
│      //  - Marks humanNullifier as used for this event           │
│                                                                   │
│      // 5. Check email nullifier                                 │
│      require(!usedEmailNullifiers[emailNullifier])               │
│      usedEmailNullifiers[emailNullifier] = true                  │
│                                                                   │
│      // 6. Create collection if new                              │
│      tokenId = _getOrCreateCollection(eventName, pubkeyHash)     │
│                                                                   │
│      // 7. Mint NFT                                              │
│      _mint(msg.sender, tokenId, 1, "")                           │
│                                                                   │
│      emit Minted(msg.sender, tokenId, emailNullifier,            │
│                  humanNullifier, eventName)                      │
│    }                                                              │
│                                                                   │
│  ✅ NFT MINTED!                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Critical Design Decisions

### 1. Data Encoding Strategy

**Challenge:** SELF `userDefinedData` has size limits

**Options:**

**A) Full Proof Embedding (Simple)**
```typescript
userDefinedData = abi.encode(proof, publicInputs)
```
❌ **Problem:** Noir proof is ~14KB, may exceed SELF limits
❌ **Problem:** QR code would be massive

**B) Proof Storage + Identifier (Recommended)**
```solidity
// Step 1: User pre-submits proof (or stores off-chain)
mapping(bytes32 => ProofData) public proofRegistry;

function registerProof(bytes proof, bytes32[] inputs) external returns (bytes32 proofId) {
    proofId = keccak256(abi.encodePacked(msg.sender, proof, inputs, block.number));
    proofRegistry[proofId] = ProofData(proof, inputs, msg.sender, false);
    emit ProofRegistered(msg.sender, proofId);
}

// Step 2: SELF verification references proofId
userDefinedData = abi.encode(proofId)

// Step 3: Hook looks up and verifies
function customVerificationHook(...) {
    bytes32 proofId = abi.decode(userData, (bytes32));
    ProofData storage data = proofRegistry[proofId];
    // Verify proof belongs to user
    require(data.submitter == address(uint160(output.userIdentifier)));
    // Verify Noir proof...
}
```
✅ **Pros:** Small QR code, manageable data size
⚠️ **Cons:** Requires pre-submission transaction

**C) Off-chain Proof Storage (Best UX)**
```typescript
// Step 1: Store proof in IPFS/Arweave
const proofCID = await uploadToIPFS({ proof, publicInputs });

// Step 2: Include CID in SELF verification
userDefinedData = abi.encode(proofCID)

// Step 3: Hook retrieves via oracle or optimistic verification
```
❌ **Problem:** Adds complexity, requires oracle
❌ **Problem:** Not truly atomic

**DECISION: Use Option B (Proof Registry)**
- User submits proof once (Transaction 1)
- SELF verification completes minting (Transaction 2 - via callback)
- Trade-off: 2 transactions, but SELF callback is atomic verification + minting

---

### 2. Nullifier Linking Strategy

```solidity
// Two nullifiers per mint:
struct MintRecord {
    bytes32 emailNullifier;    // From Noir DKIM proof
    bytes32 humanNullifier;    // From SELF proof
    uint256 tokenId;           // Event token
    address minter;
    uint256 timestamp;
}

// Prevent double-claims:
mapping(bytes32 => bool) public usedEmailNullifiers;           // email can't be reused
mapping(bytes32 => mapping(uint256 => bool)) public humanUsedForEvent; // human can't claim same event twice

// Allow tracking:
mapping(address => bytes32) public addressToHumanNullifier;    // link address to human
mapping(bytes32 => MintRecord[]) public humanMintHistory;      // track what human has minted
```

**Rules:**
- ✅ One email = one mint globally (prevents email reuse)
- ✅ One human = one mint per event (prevents sybil per event)
- ✅ One human can mint DIFFERENT events (legitimate use case)
- ✅ Same human can use different addresses (privacy)

**Example:**
```
Alice (human #123):
  - Event A with email1@gmail.com → ✅ Minted
  - Event B with email2@gmail.com → ✅ Minted (different event, ok)
  - Event A with email3@gmail.com → ❌ Denied (same human + same event)

Bob tries to use Alice's email1:
  - Event C with email1@gmail.com → ❌ Denied (email already used)
```

---

### 3. Contract Architecture

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {IUltraVerifier} from "./interfaces/IUltraVerifier.sol";

contract Mintmarks is ERC1155, Ownable, SelfVerificationRoot {
    // ============ State Variables ============

    IUltraVerifier public immutable VERIFIER;
    uint256 public constant EXPECTED_PUBLIC_INPUTS = 324;

    // Proof registry
    struct ProofData {
        bytes proof;
        bytes32[] publicInputs;
        address submitter;
        uint256 timestamp;
        bool consumed;
    }
    mapping(bytes32 => ProofData) public proofRegistry;

    // Nullifier tracking
    mapping(bytes32 => bool) public usedEmailNullifiers;
    mapping(bytes32 => mapping(uint256 => bool)) public humanUsedForEvent;
    mapping(address => bytes32) public addressToHumanNullifier;

    // Collection management (existing)
    uint256 public nextTokenId = 1;
    mapping(bytes32 => uint256) public collectionIdToTokenId;
    mapping(uint256 => EventCollection) public collections;
    mapping(uint256 => string) private _tokenURIs;

    // ============ Events ============

    event ProofRegistered(address indexed submitter, bytes32 indexed proofId);
    event HumanLinked(address indexed user, bytes32 indexed humanNullifier);
    event Minted(
        address indexed minter,
        uint256 indexed tokenId,
        bytes32 emailNullifier,
        bytes32 humanNullifier,
        string eventName
    );

    // ============ Constructor ============

    constructor(
        address _verifier,
        address _selfHubAddress,
        string memory _selfScopeSeed,
        string memory _baseURI
    )
        ERC1155(_baseURI)
        Ownable(msg.sender)
        SelfVerificationRoot(_selfHubAddress, _selfScopeSeed)
    {
        VERIFIER = IUltraVerifier(_verifier);

        // Configure SELF verification (proof of human only, no disclosures)
        verificationConfig = SelfUtils.formatVerificationConfigV2(
            SelfUtils.UnformattedVerificationConfigV2({
                minimumAge: 0,              // No age requirement
                excludedCountries: new bytes2[](0),  // No country restrictions
                ofac: false,                // No OFAC check
                requireName: false,         // No personal data
                requireIssuingState: false,
                requireNationality: false,
                requireDateOfBirth: false,
                requirePassportNumber: false,
                requireGender: false,
                requireExpiryDate: false
            })
        );

        verificationConfigId = IIdentityVerificationHubV2(_selfHubAddress)
            .setVerificationConfigV2(verificationConfig);
    }

    // ============ Step 1: Register Noir Proof ============

    function registerProof(
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external returns (bytes32 proofId) {
        require(publicInputs.length == EXPECTED_PUBLIC_INPUTS, "Invalid inputs length");

        // Generate unique proof ID
        proofId = keccak256(abi.encodePacked(
            msg.sender,
            proof,
            publicInputs,
            block.number
        ));

        require(proofRegistry[proofId].timestamp == 0, "Proof already registered");

        // Store proof data
        proofRegistry[proofId] = ProofData({
            proof: proof,
            publicInputs: publicInputs,
            submitter: msg.sender,
            timestamp: block.timestamp,
            consumed: false
        });

        emit ProofRegistered(msg.sender, proofId);
        return proofId;
    }

    // ============ Step 2: SELF Verification Hook (Atomic Minting) ============

    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal override {
        // 1. Extract data
        bytes32 humanNullifier = output.nullifier;
        address user = address(uint160(output.userIdentifier));
        bytes32 proofId = abi.decode(userData, (bytes32));

        // 2. Retrieve registered proof
        ProofData storage data = proofRegistry[proofId];
        require(data.timestamp > 0, "Proof not found");
        require(!data.consumed, "Proof already consumed");
        require(data.submitter == user, "Proof submitter mismatch");

        // 3. Verify Noir proof
        require(VERIFIER.verify(data.proof, data.publicInputs), "Invalid Noir proof");

        // 4. Extract public inputs
        bytes32 pubkeyHash = data.publicInputs[0];
        bytes32 emailNullifier = data.publicInputs[1];
        string memory eventName = _extractEventName(data.publicInputs);

        // 5. Check nullifiers
        require(!usedEmailNullifiers[emailNullifier], "Email already used");

        bytes32 collectionId = keccak256(abi.encodePacked(eventName, pubkeyHash));
        uint256 tokenId = collectionIdToTokenId[collectionId];

        if (tokenId == 0) {
            // New collection
            tokenId = _createCollection(eventName, pubkeyHash, collectionId, user);
        }

        require(!humanUsedForEvent[humanNullifier][tokenId], "Human already claimed this event");

        // 6. Mark as used
        usedEmailNullifiers[emailNullifier] = true;
        humanUsedForEvent[humanNullifier][tokenId] = true;
        addressToHumanNullifier[user] = humanNullifier;
        data.consumed = true;

        // 7. Update collection count
        collections[tokenId].totalMinted++;

        // 8. Mint NFT
        _mint(user, tokenId, 1, "");

        emit HumanLinked(user, humanNullifier);
        emit Minted(user, tokenId, emailNullifier, humanNullifier, eventName);
    }

    // ============ SELF Config ============

    function getConfigId(
        bytes32,
        bytes32,
        bytes memory
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    // ... (existing helper functions: _extractEventName, _createCollection, etc.)
}
```

---

## Webapp Architecture: `self-verify/`

### Tech Stack
- **Framework:** Next.js 15 (App Router)
- **SELF SDK:** `@selfxyz/qrcode`
- **Blockchain:** `wagmi` + `viem`
- **Styling:** TailwindCSS
- **Proof Generation:** `@aztec/bb.js` + `@noir-lang/noir_js` (client-side)

### User Flow

```
┌──────────────────────────────────────────────────────────────┐
│  Page 1: Upload Email (.eml file)                            │
├──────────────────────────────────────────────────────────────┤
│  1. User uploads .eml file                                   │
│  2. Browser extracts DKIM signature                          │
│  3. Generate Noir proof (client-side WASM)                   │
│  4. Submit to contract: registerProof(proof, inputs)         │
│  5. Get proofId back                                         │
│  6. Redirect to /verify?proofId=0x...                        │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  Page 2: SELF Verification (/verify)                         │
├──────────────────────────────────────────────────────────────┤
│  1. Read proofId from URL params                             │
│  2. Get user's wallet address                                │
│  3. Generate SELF QR code:                                   │
│     - userId: user address                                   │
│     - userDefinedData: abi.encode(proofId)                   │
│     - scope: "mintmarks-proof-of-human"                      │
│  4. User scans QR with SELF app                              │
│  5. SELF app verifies human → submits to SELF verifier       │
│  6. SELF verifier calls Mintmarks.customVerificationHook()   │
│  7. Hook verifies both proofs + mints NFT                    │
│  8. Frontend polls contract for minting event                │
│  9. Redirect to /success with NFT details                    │
└──────────────────────────────────────────────────────────────┘
```

### File Structure

```
self-verify/
├── app/
│   ├── page.tsx                    # Home: Upload email + generate proof
│   ├── verify/
│   │   └── page.tsx                # SELF QR code verification
│   ├── success/
│   │   └── page.tsx                # Success page with NFT info
│   └── layout.tsx                  # Root layout
│
├── components/
│   ├── EmailUploader.tsx           # Drag-drop .eml file upload
│   ├── ProofGenerator.tsx          # Client-side Noir proof generation
│   ├── SelfQRCode.tsx              # SELF QR code component
│   └── WalletConnect.tsx           # Wallet connection
│
├── lib/
│   ├── noir/                       # Noir proving logic
│   │   ├── prover.ts               # WASM proof generation
│   │   └── circuit.ts              # Circuit loading
│   ├── contract.ts                 # Contract ABI + interactions
│   └── utils.ts                    # Helpers
│
├── public/
│   └── circuit/                    # Noir circuit artifacts
│       ├── circuit.wasm
│       └── proving_key.bin
│
├── .env.example
├── package.json
└── README.md
```

---

## Self-Criticism & Edge Cases

### Critical Flaws to Address

**1. Proof Registry Gas Costs**
- Storing 14KB proof on-chain is EXPENSIVE
- **Solution:** Store proof hash, verify off-chain via Noir VM in browser, submit only verification result
- **Alternative:** Use proof compression or aggregation

**2. Front-running Attack**
```
Scenario:
1. Alice registers proofId = 0x123
2. Alice starts SELF verification
3. Bob sees proofId in mempool
4. Bob scans QR with proofId=0x123 using HIS wallet
5. Bob gets Alice's NFT
```
- **Solution:** Verify `proofData.submitter == userIdentifier` in hook (already implemented)
- **Additional:** Time-lock proofs (expire after 1 hour)

**3. SELF Data Size Limits**
- userDefinedData might have size limits
- **Solution:** Use proofId (32 bytes) instead of full proof ✅

**4. Failed SELF Verification**
- User registers proof, but SELF verification fails
- Proof is locked and can't be reused
- **Solution:** Allow proof re-registration or time-based expiry

**5. Multiple Events, Same Human**
- Is this allowed? YES (per design)
- Need to clearly communicate in UI

**6. Proof Generation Time**
- Noir proving can take 30-60 seconds in browser
- **Solution:** Show clear progress, allow background processing

**7. SELF App Requirements**
- Users MUST have SELF app installed
- MUST have verified passport in app
- **Solution:** Clear onboarding instructions, fallback flow

### Gas Optimization

```solidity
// Instead of storing full proof:
struct ProofData {
    bytes32 proofHash;              // 32 bytes
    bytes32 publicInputsHash;       // 32 bytes
    address submitter;              // 20 bytes
    uint96 timestamp;               // 12 bytes (saves 20 bytes vs uint256)
    bool consumed;                  // 1 byte
}
// Total: ~97 bytes vs 14KB+

// User submits proof to browser
// Browser verifies proof locally
// Submit only hashes to contract
// Hook verifies hashes match
```

**Trade-off:** Moves verification responsibility, but saves massive gas

---

## Implementation Checklist

### Phase 1: Contract Updates
- [ ] Import SELF contracts (`@selfxyz/contracts`)
- [ ] Extend `SelfVerificationRoot`
- [ ] Add proof registry system
- [ ] Add dual nullifier tracking
- [ ] Implement `customVerificationHook()`
- [ ] Update `getConfigId()` for SELF config
- [ ] Add events for monitoring
- [ ] Write comprehensive tests

### Phase 2: Webapp Development
- [ ] Initialize Next.js project
- [ ] Install dependencies (@selfxyz/qrcode, wagmi, viem)
- [ ] Setup Noir circuit compilation (copy from mintmarks_circuits)
- [ ] Build email upload component
- [ ] Implement client-side proof generation
- [ ] Create proof registration flow
- [ ] Build SELF QR code page
- [ ] Add event polling for mint completion
- [ ] Create success page
- [ ] Add error handling & UX polish

### Phase 3: Integration Testing
- [ ] Deploy updated Mintmarks to Celo Sepolia
- [ ] Register SELF verification config
- [ ] Test proof registration
- [ ] Test SELF verification flow
- [ ] Test nullifier enforcement
- [ ] Test edge cases (double-claim, front-running, etc.)
- [ ] Test different events, same human
- [ ] Test gas costs

### Phase 4: Documentation
- [ ] Update README with new flow
- [ ] Create user guide with screenshots
- [ ] Document smart contract changes
- [ ] Add inline code comments
- [ ] Create troubleshooting guide

---

## Open Questions

1. **Proof storage gas costs - which approach?**
   - A) Store full proof on-chain (expensive but simple)
   - B) Store hash, verify off-chain (cheap but complex)
   - C) Use proof compression/aggregation

2. **Proof expiry policy?**
   - Should registered proofs expire after X hours?
   - Can users re-register same proof?

3. **SELF config requirements?**
   - Minimum age: 0 or 18?
   - Any country exclusions needed?
   - OFAC check required?

4. **Multi-event UX?**
   - Should UI show "you already minted this event"?
   - Should it suggest other events user can mint?

5. **Metadata URI strategy?**
   - Generate metadata after minting in hook?
   - Or set metadata URI separately (current approach)?

---

## Success Criteria

✅ **User completes entire flow in ~2 minutes:**
1. Upload email (5 sec)
2. Generate proof (30-60 sec browser proving)
3. Register proof (10 sec transaction)
4. Scan SELF QR (10 sec)
5. SELF verification (20 sec)
6. Minting completes (automatic in callback)

✅ **Security guarantees:**
- One email = one mint globally
- One human = one mint per event
- Both nullifiers verified atomically
- No front-running possible

✅ **Gas efficiency:**
- Proof registration: ~50K gas (optimized)
- SELF callback + mint: ~200K gas
- Total: ~250K gas (~$0.10 on Celo)

✅ **UX quality:**
- Clear progress indicators
- Helpful error messages
- Mobile-responsive design
- Works on all browsers with WASM support

---

## Timeline Estimate

- **Contract updates:** 3-4 hours
- **Webapp scaffolding:** 2-3 hours
- **Proof generation integration:** 3-4 hours
- **SELF QR flow:** 2-3 hours
- **Testing & debugging:** 4-6 hours
- **Documentation:** 2 hours

**Total:** 16-22 hours

---

## Next Steps

1. **APPROVE PLAN** → Proceed with implementation
2. **MODIFY PLAN** → Address concerns, iterate on design
3. **ALTERNATIVE APPROACH** → Suggest different architecture

**Ready to execute?** 🚀
