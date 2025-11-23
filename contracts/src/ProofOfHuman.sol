// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {SelfStructs} from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import {SelfUtils} from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import {IIdentityVerificationHubV2} from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ProofOfHuman
 * @notice SELF Protocol integration for proof of unique human verification
 * @dev Links email nullifiers to SELF human nullifiers for sybil resistance
 */
contract ProofOfHuman is SelfVerificationRoot, Ownable {
    // ============ Errors ============

    error EmailNullifierAlreadyVerified();
    error EmailNullifierNotVerified();
    error OnlyMintmarksContract();
    error MinterAddressMismatch();
    error HumanAlreadyClaimedEvent();

    // ============ State Variables ============

    /// @notice Verification config storage
    SelfStructs.VerificationConfigV2 public verificationConfig;
    bytes32 public verificationConfigId;

    /// @notice Authorized Mintmarks contract (only this can consume humans)
    address public mintmarksContract;

    /// @notice PRIMARY MAPPING: Email nullifier → SELF human nullifier
    mapping(bytes32 => uint256) public emailNullifierToHumanNullifier;

    /// @notice Email nullifier → verified wallet address (allows multiple events per human with different wallets)
    mapping(bytes32 => address) public emailNullifierToAddress;

    /// @notice Email nullifier → whether it's been verified by SELF
    mapping(bytes32 => bool) public emailNullifierVerified;

    /// @notice ADDRESS-BASED GLOBAL VERIFICATION: Allows verify once, mint multiple events
    /// @dev Once an address verifies with SELF once, it can mint any event without re-verifying
    mapping(address => uint256) public addressToHumanNullifier;
    mapping(address => bool) public addressVerified;

    /// @notice Per-event usage tracking: humanNullifier → eventName → used
    mapping(uint256 => mapping(string => bool)) public humanUsedForEvent;

    // ============ Events ============

    event HumanVerified(
        uint256 indexed humanNullifier,
        bytes32 indexed emailNullifier,
        address indexed userAddress
    );

    event HumanConsumed(
        uint256 indexed humanNullifier,
        bytes32 indexed emailNullifier,
        string eventName,
        address minter
    );

    event MintmarksContractUpdated(address indexed newContract);

    // ============ Constructor ============

    /**
     * @notice Initialize ProofOfHuman contract
     * @param identityVerificationHubV2Address SELF Protocol hub address
     * @param scopeSeed Unique scope identifier for this app
     */
    constructor(
        address identityVerificationHubV2Address,
        string memory scopeSeed
    ) SelfVerificationRoot(identityVerificationHubV2Address, scopeSeed) Ownable(msg.sender) {
        // Configure SELF verification (ONLY unique passport nullifier, no restrictions)
        verificationConfig = SelfUtils.formatVerificationConfigV2(
            SelfUtils.UnformattedVerificationConfigV2({
                olderThan: 0, // No age restriction - accept all ages
                forbiddenCountries: new string[](0), // No country restrictions
                ofacEnabled: false // No OFAC checks
            })
        );

        verificationConfigId = IIdentityVerificationHubV2(identityVerificationHubV2Address)
            .setVerificationConfigV2(verificationConfig);
    }

    // ============ SELF Hook ============

    /**
     * @notice Custom verification hook called after SELF verification
     * @param output Verification output from SELF hub (contains nullifier)
     * @param userData Encoded emailNullifier from QR code
     * @dev This is called automatically by SELF Protocol after TEE verification
     * @dev UPDATED: Now tracks address-level verification for verify-once-mint-multiple pattern
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal override {
        uint256 humanNullifier = output.nullifier;
        address userAddress = address(uint160(output.userIdentifier));

        // SELF Protocol passes userDefinedData as UTF-8 encoded string bytes
        // Hash the userData to get a consistent bytes32 identifier
        bytes32 emailNullifier = keccak256(userData);

        // Verify email nullifier not already verified
        if (emailNullifierVerified[emailNullifier]) {
            revert EmailNullifierAlreadyVerified();
        }

        // Store email-specific mappings
        emailNullifierToHumanNullifier[emailNullifier] = humanNullifier;
        emailNullifierToAddress[emailNullifier] = userAddress;
        emailNullifierVerified[emailNullifier] = true;

        // Store address-level verification (for verify-once pattern)
        // This allows user to mint multiple events after first SELF verification
        addressToHumanNullifier[userAddress] = humanNullifier;
        addressVerified[userAddress] = true;

        emit HumanVerified(humanNullifier, emailNullifier, userAddress);
    }

    /**
     * @notice Get verification config ID for SELF Protocol
     * @return Verification configuration ID
     * @dev Required override from SelfVerificationRoot
     */
    function getConfigId(
        bytes32, /* destinationChainId */
        bytes32, /* userIdentifier */
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    // ============ Mintmarks Integration ============

    /**
     * @notice Set authorized Mintmarks contract (only owner)
     * @param _mintmarks Address of Mintmarks contract
     */
    function setMintmarksContract(address _mintmarks) external onlyOwner {
        mintmarksContract = _mintmarks;
        emit MintmarksContractUpdated(_mintmarks);
    }

    /**
     * @notice Verify and consume human for event minting (only Mintmarks)
     * @param emailNullifier Email nullifier from Noir proof public inputs
     * @param minter Address attempting to mint
     * @param eventName Name of event being claimed
     * @return humanNullifier The human's unique identifier
     * @dev Supports dual-path verification:
     *      Path A: Email nullifier verified by SELF (first event or explicit re-verification)
     *      Path B: Address verified by SELF (subsequent events - verify once, mint multiple)
     */
    function verifyAndConsumeHuman(
        bytes32 emailNullifier,
        address minter,
        string calldata eventName
    ) external returns (uint256 humanNullifier) {
        // Only Mintmarks can call this
        if (msg.sender != mintmarksContract) {
            revert OnlyMintmarksContract();
        }

        // Convert bytes32 to the same format used during SELF verification
        // SELF passes the hex string "0x123..." as UTF-8 bytes, which we hash
        // So we need to reconstruct that: convert bytes32 -> hex string -> UTF-8 bytes -> hash
        bytes memory hexString = bytes(string(abi.encodePacked(
            "0x",
            _toHexString(emailNullifier)
        )));
        bytes32 hashedEmailNullifier = keccak256(hexString);

        // VERIFY-ONCE-MINT-MULTIPLE PATTERN:
        // Check if email nullifier was SELF-verified OR if address is verified
        // This allows users to verify once with their address and mint multiple events
        if (!emailNullifierVerified[hashedEmailNullifier] && !addressVerified[minter]) {
            revert EmailNullifierNotVerified();
        }

        // Get human nullifier from the appropriate source
        if (emailNullifierVerified[hashedEmailNullifier]) {
            // Path A: Email nullifier was directly verified
            humanNullifier = emailNullifierToHumanNullifier[hashedEmailNullifier];
        } else {
            // Path B: Address was verified (verify-once-mint-multiple)
            humanNullifier = addressToHumanNullifier[minter];
        }
        require(humanNullifier != 0, "No human for address or email");

        // Common check: Verify human hasn't claimed this event
        if (humanUsedForEvent[humanNullifier][eventName]) {
            revert HumanAlreadyClaimedEvent();
        }

        // Mark as used for this event
        humanUsedForEvent[humanNullifier][eventName] = true;

        emit HumanConsumed(humanNullifier, emailNullifier, eventName, minter);

        return humanNullifier;
    }

    // ============ View Functions ============

    /**
     * @notice Check if email nullifier has been verified by SELF
     * @param emailNullifier Email nullifier from proof
     * @return True if verified
     */
    function isEmailNullifierVerified(bytes32 emailNullifier) external view returns (bool) {
        return emailNullifierVerified[emailNullifier];
    }

    /**
     * @notice Get human nullifier for email nullifier
     * @param emailNullifier Email nullifier from proof
     * @return humanNullifier (0 if not verified)
     */
    function getHumanForEmail(bytes32 emailNullifier) external view returns (uint256) {
        return emailNullifierToHumanNullifier[emailNullifier];
    }

    /**
     * @notice Check if human has claimed specific event
     * @param humanNullifier Human's unique identifier
     * @param eventName Name of event
     * @return True if already claimed
     */
    function hasHumanClaimedEvent(
        uint256 humanNullifier,
        string calldata eventName
    ) external view returns (bool) {
        return humanUsedForEvent[humanNullifier][eventName];
    }

    /**
     * @notice Get verified address for email nullifier
     * @param emailNullifier Email nullifier from proof
     * @return Address that verified this email (0 if not verified)
     */
    function getAddressForEmail(bytes32 emailNullifier) external view returns (address) {
        return emailNullifierToAddress[emailNullifier];
    }

    /**
     * @notice Check if an address has been verified by SELF (for verify-once pattern)
     * @param user Address to check
     * @return True if address has verified with SELF at least once
     */
    function isAddressVerified(address user) external view returns (bool) {
        return addressVerified[user];
    }

    /**
     * @notice Get human nullifier for a verified address
     * @param user Address to check
     * @return humanNullifier (0 if not verified)
     */
    function getHumanForAddress(address user) external view returns (uint256) {
        return addressToHumanNullifier[user];
    }

    // ============ Internal Helper Functions ============

    /**
     * @notice Convert bytes32 to lowercase hex string (without "0x" prefix)
     * @param data The bytes32 to convert
     * @return Lowercase hex string representation
     */
    function _toHexString(bytes32 data) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory result = new bytes(64); // 32 bytes = 64 hex chars

        for (uint256 i = 0; i < 32; i++) {
            result[i * 2] = hexChars[uint8(data[i] >> 4)];
            result[i * 2 + 1] = hexChars[uint8(data[i] & 0x0f)];
        }

        return string(result);
    }
}
