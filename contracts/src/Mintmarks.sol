// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IUltraVerifier} from "./interfaces/IUltraVerifier.sol";
import "@verifier/UltraHonkVerifier.sol";

/**
 * @title Mintmarks
 * @notice Proof-of-attendance system using ERC1155 and UltraHonk ZK proofs
 * @dev Each event becomes a collection, minted by verified attendees
 */
contract Mintmarks is ERC1155, Ownable {
    // ============ Errors ============

    error InvalidPublicInputs();
    error AlreadyClaimed();
    error InvalidProof();
    error InsufficientFee();
    error InsufficientMintingFee();
    error WithdrawFailed();
    error EventNameTooLong();

    // ============ State Variables ============

    /// @notice UltraHonk proof verifier contract
    IUltraVerifier public immutable verifier;

    /// @notice Number of public inputs expected from circuit
    uint256 public constant EXPECTED_PUBLIC_INPUTS = 324;

    /// @notice Maximum event name length in bytes
    uint256 public constant MAX_EVENT_NAME_LENGTH = 256;

    /// @notice Fee paid by first minter to create collection
    uint256 public collectionCreationFee = 0.01 ether;

    /// @notice Fee paid by all minters
    uint256 public mintingFee = 0.001 ether;

    /// @notice Next token ID to assign
    uint256 public nextTokenId = 1;

    /// @notice Mapping from collection ID (hash of event name + pubkey) to token ID
    mapping(bytes32 => uint256) public collectionIdToTokenId;

    /// @notice Mapping from token ID to collection data
    mapping(uint256 => EventCollection) public collections;

    /// @notice Mapping from email nullifier to whether it's been used
    mapping(bytes32 => bool) public usedNullifiers;

    // ============ Structs ============

    /**
     * @notice Event collection metadata
     * @param tokenId The ERC1155 token ID
     * @param eventName The event name extracted from email
     * @param pubkeyHash Hash of email domain's DKIM public key (identifies sender)
     * @param totalMinted Number of tokens minted for this event
     * @param createdAt Blockchain timestamp when collection was created
     * @param creator Address of first minter who paid creation fee
     */
    struct EventCollection {
        uint256 tokenId;
        string eventName;
        bytes32 pubkeyHash;
        uint256 totalMinted;
        uint256 createdAt;
        address creator;
    }

    // ============ Events ============

    event Minted(
        address indexed minter,
        uint256 indexed tokenId,
        bytes32 indexed nullifier,
        string eventName
    );

    event CollectionCreated(
        uint256 indexed tokenId,
        string eventName,
        address creator
    );

    event CollectionCreationFeeUpdated(uint256 newFee);
    event MintingFeeUpdated(uint256 newFee);
    event Withdrawn(address indexed recipient, uint256 amount);

    // ============ Constructor ============

    /**
     * @notice Initialize the Mintmarks contract
     * @param _verifier Address of the UltraHonk verifier contract
     * @param _uri Base URI for token metadata
     */
    constructor(
        address _verifier,
        string memory _uri
    ) ERC1155(_uri) Ownable(msg.sender) {
        verifier = IUltraVerifier(_verifier);
    }

    // ============ Metadata Functions ============

    /**
     * @notice Returns the name of the token collection
     * @return The name string
     */
    function name() public pure returns (string memory) {
        return "Mintmarks";
    }

    /**
     * @notice Returns the symbol of the token collection
     * @return The symbol string
     */
    function symbol() public pure returns (string memory) {
        return "MRK";
    }

    // ============ Core Functions ============

    /**
     * @notice Mint token by verifying proof of attendance
     * @param proof UltraHonk proof bytes
     * @param publicInputs Circuit public inputs (324 fields as bytes32[])
     * @return tokenId Minted token ID
     */
    function mint(
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external payable returns (uint256 tokenId) {
        // Validate public inputs length
        if (publicInputs.length != EXPECTED_PUBLIC_INPUTS) {
            revert InvalidPublicInputs();
        }

        // Extract data from public inputs
        bytes32 pubkeyHash = publicInputs[0];
        bytes32 emailNullifier = publicInputs[1];
        string memory eventName = _extractEventName(publicInputs);

        // Create unique collection ID from event name + pubkey hash
        // This prevents collisions: same event name from different domains = different collections
        bytes32 collectionId = keccak256(abi.encodePacked(eventName, pubkeyHash));

        // Check nullifier not used
        if (usedNullifiers[emailNullifier]) {
            revert AlreadyClaimed();
        }

        // Verify proof
        if (!verifier.verify(proof, publicInputs)) {
            revert InvalidProof();
        }

        // Get or create collection
        tokenId = collectionIdToTokenId[collectionId];

        if (tokenId == 0) {
            // New collection - charge creation fee + minting fee
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

        // Register nullifier
        usedNullifiers[emailNullifier] = true;

        // Mint token
        _mint(msg.sender, tokenId, 1, "");

        emit Minted(msg.sender, tokenId, emailNullifier, eventName);
    }

    /**
     * @notice Create new event collection
     * @param eventName Name of the event
     * @param pubkeyHash Hash of DKIM public key (identifies email sender domain)
     * @param collectionId Unique collection identifier (hash of name + pubkey)
     * @param creator Address of first minter
     * @return tokenId New token ID
     */
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

    /**
     * @notice Extract event name from public inputs
     * @param publicInputs Circuit public inputs
     * @return eventName Decoded event name string
     * @dev Event name is stored in publicInputs[67..322] with length at [323]
     */
    function _extractEventName(
        bytes32[] calldata publicInputs
    ) internal pure returns (string memory) {
        // eventName.len at publicInputs[323]
        uint256 len = uint256(publicInputs[323]);
        if (len > MAX_EVENT_NAME_LENGTH) {
            revert EventNameTooLong();
        }

        // eventName.storage at publicInputs[67..322]
        bytes memory nameBytes = new bytes(len);
        for (uint256 i = 0; i < len; i++) {
            // Extract the least significant byte from each bytes32
            nameBytes[i] = bytes1(uint8(uint256(publicInputs[67 + i])));
        }

        return string(nameBytes);
    }

    // ============ View Functions ============

    /**
     * @notice Get collection data by token ID
     * @param tokenId The token ID to query
     * @return Collection data struct
     */
    function getCollection(uint256 tokenId) external view returns (EventCollection memory) {
        return collections[tokenId];
    }

    /**
     * @notice Get token ID for an event collection
     * @param eventName Name of the event
     * @param pubkeyHash Hash of DKIM public key
     * @return Token ID (0 if collection doesn't exist)
     */
    function getTokenIdByCollection(
        string memory eventName,
        bytes32 pubkeyHash
    ) external view returns (uint256) {
        bytes32 collectionId = keccak256(abi.encodePacked(eventName, pubkeyHash));
        return collectionIdToTokenId[collectionId];
    }

    /**
     * @notice Check if a nullifier has been used
     * @param nullifier The nullifier to check
     * @return True if nullifier has been used
     */
    function isNullifierUsed(bytes32 nullifier) external view returns (bool) {
        return usedNullifiers[nullifier];
    }

    /**
     * @notice Check if collection exists for event + pubkey combination
     * @param eventName Name of the event
     * @param pubkeyHash Hash of DKIM public key
     * @return True if collection exists
     */
    function collectionExists(
        string memory eventName,
        bytes32 pubkeyHash
    ) external view returns (bool) {
        bytes32 collectionId = keccak256(abi.encodePacked(eventName, pubkeyHash));
        return collectionIdToTokenId[collectionId] != 0;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update collection creation fee
     * @param newFee New fee amount in wei
     */
    function setCollectionCreationFee(uint256 newFee) external onlyOwner {
        collectionCreationFee = newFee;
        emit CollectionCreationFeeUpdated(newFee);
    }

    /**
     * @notice Update minting fee
     * @param newFee New fee amount in wei
     */
    function setMintingFee(uint256 newFee) external onlyOwner {
        mintingFee = newFee;
        emit MintingFeeUpdated(newFee);
    }

    /**
     * @notice Withdraw contract balance to owner
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = owner().call{value: balance}("");
        if (!success) {
            revert WithdrawFailed();
        }
        emit Withdrawn(owner(), balance);
    }

    /**
     * @notice Update base URI for token metadata
     * @param newuri New base URI
     */
    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }
}
