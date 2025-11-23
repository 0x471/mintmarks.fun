# Mintmarks + SELF Integration - FINAL ARCHITECTURE

## Critical Insight: Proof Hash as Primary Key

### The Correct Mapping Direction

**❌ WRONG (My initial approach):**
```solidity
humanNullifier → proofHash
// Problem: Need to pass proofHash as parameter to mint()
```

**✅ CORRECT (Your suggestion):**
```solidity
proofHash → humanNullifier
// Benefit: Compute hash from submitted proof, look up human automatically!
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  STEP 0: Generate Noir Proof (Off-Chain)                         │
├──────────────────────────────────────────────────────────────────┤
│  1. User opens webapp                                            │
│  2. User uploads .eml file                                       │
│  3. Extract DKIM signature                                       │
│  4. Generate Noir proof in browser (30-60 sec)                   │
│  5. Compute proofHash = keccak256(proof, publicInputs)           │
│  6. User connects wallet → get address                           │
│  7. Display QR code with:                                        │
│     - userId: user's wallet address                              │
│     - userDefinedData: abi.encode(proofHash)                     │
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
│      proofHash = abi.decode(userData, (bytes32))                 │
│                                                                   │
│      // KEY MAPPING: proof hash → human nullifier                │
│      proofHashToHumanNullifier[proofHash] = humanNullifier       │
│      humanNullifierToAddress[humanNullifier] = userAddress       │
│                                                                   │
│      emit HumanVerified(humanNullifier, proofHash, userAddress)  │
│    }                                                              │
│                                                                   │
│  ✅ User sees: "Human verified! Ready to mint"                   │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│  STEP 2: Submit Noir Proof & Mint (ONLY USER TRANSACTION)        │
├──────────────────────────────────────────────────────────────────┤
│  User → Mintmarks.mint(proof, publicInputs)  // NO proofHash!   │
│                               ↓                                   │
│  Mintmarks Contract:                                             │
│    mint(proof, publicInputs) {                                   │
│      // 1. Compute proof hash from submitted proof               │
│      bytes32 proofHash = keccak256(abi.encodePacked(             │
│        proof, publicInputs                                       │
│      ))                                                           │
│                                                                   │
│      // 2. Look up human nullifier using proof hash              │
│      bytes32 humanNullifier = proofOfHuman                       │
│        .proofHashToHumanNullifier(proofHash)                     │
│      require(humanNullifier != bytes32(0),                       │
│              "No SELF verification for this proof")              │
│                                                                   │
│      // 3. Verify Noir proof                                     │
│      require(verifier.verify(proof, publicInputs))               │
│                                                                   │
│      // 4. Extract data from proof                               │
│      emailNullifier = publicInputs[1]                            │
│      eventName = _extractEventName(publicInputs)                 │
│      pubkeyHash = publicInputs[0]                                │
│                                                                   │
│      // 5. Check human not used for this event                   │
│      require(!proofOfHuman.humanUsedForEvent(                    │
│        humanNullifier, eventName                                 │
│      ), "Human already claimed this event")                      │
│                                                                   │
│      // 6. Check email not used                                  │
│      require(!usedEmailNullifiers[emailNullifier])               │
│      usedEmailNullifiers[emailNullifier] = true                  │
│                                                                   │
│      // 7. Call ProofOfHuman to mark human as used               │
│      proofOfHuman.consumeHuman(                                  │
│        proofHash,                                                │
│        msg.sender,                                               │
│        eventName                                                 │
│      )                                                            │
│      // This verifies:                                           │
│      //  - msg.sender matches SELF verified address              │
│      //  - Marks humanNullifier as used for this event           │
│                                                                   │
│      // 8. Create collection if new                              │
│      tokenId = _getOrCreateCollection(eventName, pubkeyHash)     │
│                                                                   │
│      // 9. Mint NFT                                              │
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

## Contract 1: ProofOfHuman (SELF Hook)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {SelfUtils} from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import {IIdentityVerificationHubV2} from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";

contract ProofOfHuman is SelfVerificationRoot {
    // ============ State Variables ============

    // PRIMARY MAPPING: Noir proof hash → SELF human nullifier
    mapping(bytes32 => bytes32) public proofHashToHumanNullifier;

    // Supporting mappings
    mapping(bytes32 => address) public humanNullifierToAddress;
    mapping(bytes32 => mapping(string => bool)) public humanUsedForEvent;

    // Authorized Mintmarks contract
    address public mintmarksContract;

    // SELF verification config
    SelfStructs.VerificationConfigV2 public verificationConfig;
    bytes32 public verificationConfigId;

    // ============ Events ============

    event HumanVerified(
        bytes32 indexed humanNullifier,
        bytes32 indexed proofHash,
        address indexed userAddress
    );

    event HumanConsumed(
        bytes32 indexed humanNullifier,
        bytes32 indexed proofHash,
        string eventName,
        address minter
    );

    // ============ Errors ============

    error ProofHashAlreadyRegistered();
    error OnlyMintmarksContract();
    error ProofNotVerified();
    error AddressMismatch();
    error HumanAlreadyClaimedEvent();

    // ============ Constructor ============

    constructor(
        address _selfHubAddress,
        string memory _scopeSeed
    ) SelfVerificationRoot(_selfHubAddress, _scopeSeed) {
        // Configure SELF verification (proof of human only, no disclosures)
        verificationConfig = SelfUtils.formatVerificationConfigV2(
            SelfUtils.UnformattedVerificationConfigV2({
                minimumAge: 0,
                excludedCountries: new bytes2[](0),
                ofac: false,
                requireName: false,
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

    // ============ SELF Verification Hook ============

    /**
     * @notice Called by SELF verifier when user completes verification
     * @param output SELF verification output containing humanNullifier
     * @param userData Contains proofHash (keccak256 of Noir proof)
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal override {
        bytes32 humanNullifier = output.nullifier;
        address userAddress = address(uint160(output.userIdentifier));
        bytes32 proofHash = abi.decode(userData, (bytes32));

        // Prevent re-using same proof hash
        if (proofHashToHumanNullifier[proofHash] != bytes32(0)) {
            revert ProofHashAlreadyRegistered();
        }

        // Store mappings: proof hash → human
        proofHashToHumanNullifier[proofHash] = humanNullifier;
        humanNullifierToAddress[humanNullifier] = userAddress;

        emit HumanVerified(humanNullifier, proofHash, userAddress);
    }

    function getConfigId(
        bytes32,
        bytes32,
        bytes memory
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    // ============ Mintmarks Integration ============

    function setMintmarksContract(address _mintmarks) external onlyOwner {
        mintmarksContract = _mintmarks;
    }

    /**
     * @notice Called by Mintmarks when user mints NFT
     * @param proofHash Hash of the Noir proof being submitted
     * @param minter Address submitting the proof
     * @param eventName Event being claimed
     */
    function consumeHuman(
        bytes32 proofHash,
        address minter,
        string calldata eventName
    ) external {
        if (msg.sender != mintmarksContract) revert OnlyMintmarksContract();

        // Get human nullifier for this proof
        bytes32 humanNullifier = proofHashToHumanNullifier[proofHash];
        if (humanNullifier == bytes32(0)) revert ProofNotVerified();

        // Verify minter matches address that did SELF verification
        address verifiedAddress = humanNullifierToAddress[humanNullifier];
        if (verifiedAddress != minter) revert AddressMismatch();

        // Check human hasn't claimed this event
        if (humanUsedForEvent[humanNullifier][eventName]) {
            revert HumanAlreadyClaimedEvent();
        }

        // Mark human as used for this event
        humanUsedForEvent[humanNullifier][eventName] = true;

        emit HumanConsumed(humanNullifier, proofHash, eventName, minter);
    }

    // ============ View Functions ============

    function getHumanForProof(bytes32 proofHash)
        external
        view
        returns (bytes32)
    {
        return proofHashToHumanNullifier[proofHash];
    }

    function getAddressForHuman(bytes32 humanNullifier)
        external
        view
        returns (address)
    {
        return humanNullifierToAddress[humanNullifier];
    }

    function hasHumanClaimedEvent(
        bytes32 humanNullifier,
        string calldata eventName
    ) external view returns (bool) {
        return humanUsedForEvent[humanNullifier][eventName];
    }
}
```

---

## Contract 2: Mintmarks (Updated)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IUltraVerifier} from "./interfaces/IUltraVerifier.sol";
import {ProofOfHuman} from "./ProofOfHuman.sol";

contract Mintmarks is ERC1155, Ownable {
    // ============ State Variables ============

    IUltraVerifier public immutable VERIFIER;
    ProofOfHuman public immutable PROOF_OF_HUMAN;

    uint256 public constant EXPECTED_PUBLIC_INPUTS = 324;

    // Email nullifier tracking
    mapping(bytes32 => bool) public usedEmailNullifiers;

    // Collection management
    uint256 public nextTokenId = 1;
    mapping(bytes32 => uint256) public collectionIdToTokenId;
    mapping(uint256 => EventCollection) public collections;
    mapping(uint256 => string) private _tokenURIs;

    struct EventCollection {
        uint256 tokenId;
        string eventName;
        bytes32 pubkeyHash;
        uint256 totalMinted;
        uint256 createdAt;
        address creator;
    }

    // Fees
    uint256 public collectionCreationFee = 0.01 ether;
    uint256 public mintingFee = 0.001 ether;

    // ============ Events ============

    event Minted(
        address indexed minter,
        uint256 indexed tokenId,
        bytes32 emailNullifier,
        bytes32 humanNullifier,
        string eventName
    );

    event CollectionCreated(
        uint256 indexed tokenId,
        string eventName,
        address creator
    );

    // ============ Errors ============

    error InvalidInputsLength();
    error NoSelfVerification();
    error InvalidNoirProof();
    error EmailAlreadyUsed();
    error InsufficientFee();
    error InsufficientMintingFee();

    // ============ Constructor ============

    constructor(
        address _verifier,
        address _proofOfHuman,
        string memory _baseURI
    ) ERC1155(_baseURI) Ownable(msg.sender) {
        VERIFIER = IUltraVerifier(_verifier);
        PROOF_OF_HUMAN = ProofOfHuman(_proofOfHuman);
    }

    // ============ Main Mint Function (ONLY USER TX) ============

    /**
     * @notice Mint NFT by submitting Noir proof
     * @param proof The Noir proof bytes
     * @param publicInputs The Noir public inputs
     * @return tokenId The minted token ID
     *
     * @dev User must have completed SELF verification with proofHash first
     */
    function mint(
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external payable returns (uint256 tokenId) {
        if (publicInputs.length != EXPECTED_PUBLIC_INPUTS) {
            revert InvalidInputsLength();
        }

        // 1. Compute proof hash
        bytes32 proofHash = keccak256(abi.encodePacked(proof, publicInputs));

        // 2. Look up human nullifier (verifies SELF verification completed)
        bytes32 humanNullifier = PROOF_OF_HUMAN.proofHashToHumanNullifier(proofHash);
        if (humanNullifier == bytes32(0)) {
            revert NoSelfVerification();
        }

        // 3. Verify Noir proof
        if (!VERIFIER.verify(proof, publicInputs)) {
            revert InvalidNoirProof();
        }

        // 4. Extract data from proof
        bytes32 pubkeyHash = publicInputs[0];
        bytes32 emailNullifier = publicInputs[1];
        string memory eventName = _extractEventName(publicInputs);

        // 5. Check email nullifier not used
        if (usedEmailNullifiers[emailNullifier]) {
            revert EmailAlreadyUsed();
        }
        usedEmailNullifiers[emailNullifier] = true;

        // 6. Consume human (verifies address + marks as used for event)
        //    This will revert if:
        //    - msg.sender doesn't match SELF verified address
        //    - Human already claimed this event
        PROOF_OF_HUMAN.consumeHuman(proofHash, msg.sender, eventName);

        // 7. Get or create collection
        bytes32 collectionId = keccak256(abi.encodePacked(eventName, pubkeyHash));
        tokenId = collectionIdToTokenId[collectionId];

        if (tokenId == 0) {
            // New collection - charge creation fee
            if (msg.value < collectionCreationFee + mintingFee) {
                revert InsufficientFee();
            }
            tokenId = _createCollection(eventName, pubkeyHash, collectionId, msg.sender);
        } else {
            // Existing collection - charge minting fee only
            if (msg.value < mintingFee) {
                revert InsufficientMintingFee();
            }
            collections[tokenId].totalMinted++;
        }

        // 8. Mint NFT
        _mint(msg.sender, tokenId, 1, "");

        emit Minted(msg.sender, tokenId, emailNullifier, humanNullifier, eventName);
    }

    // ============ Internal Functions ============

    function _createCollection(
        string memory eventName,
        bytes32 pubkeyHash,
        bytes32 collectionId,
        address creator
    ) internal returns (uint256 tokenId) {
        tokenId = nextTokenId++;

        collectionIdToTokenId[collectionId] = tokenId;
        collections[tokenId] = EventCollection({
            tokenId: tokenId,
            eventName: eventName,
            pubkeyHash: pubkeyHash,
            totalMinted: 1,
            createdAt: block.timestamp,
            creator: creator
        });

        emit CollectionCreated(tokenId, eventName, creator);
    }

    function _extractEventName(
        bytes32[] calldata publicInputs
    ) internal pure returns (string memory) {
        uint256 len = uint256(publicInputs[323]);
        require(len <= 256, "Event name too long");

        bytes memory nameBytes = new bytes(len);
        for (uint256 i = 0; i < len; i++) {
            nameBytes[i] = bytes1(uint8(uint256(publicInputs[67 + i])));
        }

        return string(nameBytes);
    }

    // ... (other helper functions: uri(), setTokenURI(), etc.)
}
```

---

## Key Improvements

### 1. Simpler Mint Function
**Before:**
```solidity
mint(proof, publicInputs, proofHash) // Need to pass hash
```

**After:**
```solidity
mint(proof, publicInputs) // Hash computed automatically!
```

### 2. Natural Mapping Flow
```
Proof → Human (not Human → Proof)
```
When you have the proof, look up the human. More intuitive!

### 3. Automatic Protection
If user tries to mint without SELF verification:
```solidity
humanNullifier = proofHashToHumanNullifier[proofHash];
// Returns bytes32(0) if no SELF verification
require(humanNullifier != bytes32(0)) // Reverts!
```

### 4. Single Source of Truth
The proofHash mapping is the PRIMARY key that links everything together.

---

## Security Analysis

### Attack: Submit proof without SELF verification
```
User generates proof → tries to mint directly
❌ proofHash not in mapping → humanNullifier = 0 → reverts
```

### Attack: Reuse someone else's SELF verification
```
Alice does SELF with proofHashA
Bob generates different proof → proofHashB
Bob tries to mint
❌ proofHashB not in mapping → reverts
```

### Attack: Use same proof twice
```
Alice: SELF verifies → mints Event A
Alice: tries to mint Event A again with same proof
❌ humanUsedForEvent[humanNullifier][EventA] = true → reverts
```

### Attack: Use different email, same human
```
Alice: SELF verifies → mints Event A with email1
Alice: SELF verifies again → mints Event A with email2
❌ humanUsedForEvent[humanNullifier][EventA] = true → reverts
```

---

## Implementation Checklist

- [ ] Create ProofOfHuman.sol
- [ ] Update Mintmarks.sol with ProofOfHuman integration
- [ ] Remove proofHash parameter from mint() function
- [ ] Add proofHash → humanNullifier mapping
- [ ] Implement consumeHuman() with all checks
- [ ] Create self-verify webapp
- [ ] Implement client-side proof hash computation
- [ ] Test full flow on Celo Sepolia

**This architecture is CORRECT and CLEAN!** Ready to implement! 🚀
