// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test, console} from "forge-std/Test.sol";
import {Mintmarks} from "../src/Mintmarks.sol";
import "@verifier/UltraHonkVerifier.sol";

/**
 * @title Integration Test with Real Proofs
 * @notice Tests the full flow with actual ZK proofs generated from .eml files
 * @dev Loads proof.bin and public_inputs.json from mintmarks_circuits/target/
 */
contract IntegrationTest is Test {
    Mintmarks public mintmarks;
    HonkVerifier public verifier;

    address public owner = address(1);
    address public user = address(2);

    string constant PROOF_PATH = "../mintmarks_circuits/target/proof.bin";
    string constant PUBLIC_INPUTS_PATH = "../mintmarks_circuits/target/public_inputs.json";

    function setUp() public {
        vm.startPrank(owner);

        // Deploy real UltraHonk verifier
        verifier = new HonkVerifier();
        console.log("Deployed UltraHonkVerifier at:", address(verifier));

        // Deploy Mintmarks contract
        mintmarks = new Mintmarks(
            address(verifier),
            "https://mintmarks.fun/api/metadata/{id}"
        );
        console.log("Deployed Mintmarks at:", address(mintmarks));

        vm.stopPrank();
    }

    function testRealProofVerification() public {
        // Load proof and public inputs from files
        bytes memory proof = vm.readFileBinary(PROOF_PATH);
        string memory publicInputsJson = vm.readFile(PUBLIC_INPUTS_PATH);

        bytes32[] memory publicInputs = _parsePublicInputs(publicInputsJson);

        console.log("Loaded proof, size:", proof.length, "bytes");
        console.log("Loaded public inputs, count:", publicInputs.length);
        console.log("Pubkey Hash:", vm.toString(publicInputs[0]));
        console.log("Email Nullifier:", vm.toString(publicInputs[1]));

        // Extract event name for logging
        string memory eventName = _extractEventName(publicInputs);
        console.log("Event Name:", eventName);

        // Test verifier directly
        console.log("\nTesting verifier.verify()...");
        bool verified = verifier.verify(proof, publicInputs);

        assertTrue(verified, "Real proof verification failed!");
        console.log("Proof verified successfully!");
    }

    function testMintWithRealProof() public {
        // Load proof and public inputs
        bytes memory proof = vm.readFileBinary(PROOF_PATH);
        string memory publicInputsJson = vm.readFile(PUBLIC_INPUTS_PATH);
        bytes32[] memory publicInputs = _parsePublicInputs(publicInputsJson);

        string memory eventName = _extractEventName(publicInputs);
        bytes32 nullifier = publicInputs[1];

        console.log("\nTesting token minting with real proof...");
        console.log("Event:", eventName);
        console.log("Nullifier:", vm.toString(nullifier));

        // Fund user
        vm.deal(user, 1 ether);
        vm.startPrank(user);

        // Mint token with real proof
        uint256 tokenId = mintmarks.mint{value: 0.011 ether}(proof, publicInputs);

        console.log("Minted token with tokenId:", tokenId);

        // Verify mint succeeded
        assertEq(mintmarks.balanceOf(user, tokenId), 1);
        assertTrue(mintmarks.isNullifierUsed(nullifier));

        bytes32 pubkeyHash = publicInputs[0];
        assertTrue(mintmarks.collectionExists(eventName, pubkeyHash));

        Mintmarks.EventCollection memory collection = mintmarks.getCollection(tokenId);
        assertEq(collection.eventName, eventName);
        assertEq(collection.pubkeyHash, pubkeyHash);
        assertEq(collection.totalMinted, 1);
        assertEq(collection.creator, user);

        console.log("Token minted successfully!");
        console.log("Collection created at:", collection.createdAt);

        vm.stopPrank();
    }

    function testCannotDoubleMintWithSameProof() public {
        // Load proof and public inputs
        bytes memory proof = vm.readFileBinary(PROOF_PATH);
        string memory publicInputsJson = vm.readFile(PUBLIC_INPUTS_PATH);
        bytes32[] memory publicInputs = _parsePublicInputs(publicInputsJson);

        // First mint succeeds
        vm.deal(user, 1 ether);
        vm.startPrank(user);
        mintmarks.mint{value: 0.011 ether}(proof, publicInputs);

        // Second mint with same nullifier fails
        vm.expectRevert(Mintmarks.AlreadyClaimed.selector);
        mintmarks.mint{value: 0.011 ether}(proof, publicInputs);

        vm.stopPrank();
    }

    // Helper function to parse JSON array of hex strings into bytes32[]
    function _parsePublicInputs(string memory json) internal pure returns (bytes32[] memory) {
        // Remove outer brackets and whitespace
        bytes memory jsonBytes = bytes(json);

        // Count number of elements (count commas + 1)
        uint256 count = 1;
        for (uint256 i = 0; i < jsonBytes.length; i++) {
            if (jsonBytes[i] == ',') count++;
        }

        bytes32[] memory inputs = new bytes32[](count);

        // Parse each hex string
        uint256 idx = 0;
        uint256 start = 0;
        bool inString = false;
        bytes memory currentHex;

        for (uint256 i = 0; i < jsonBytes.length; i++) {
            if (jsonBytes[i] == '"') {
                if (!inString) {
                    start = i + 1;
                    inString = true;
                } else {
                    // Extract hex string (skip "0x" prefix)
                    uint256 hexLen = i - start - 2;
                    currentHex = new bytes(hexLen);
                    for (uint256 j = 0; j < hexLen; j++) {
                        currentHex[j] = jsonBytes[start + 2 + j];
                    }
                    inputs[idx] = _hexStringToBytes32(currentHex);
                    idx++;
                    inString = false;
                }
            }
        }

        return inputs;
    }

    // Convert hex string to bytes32
    function _hexStringToBytes32(bytes memory hexString) internal pure returns (bytes32) {
        require(hexString.length == 64, "Invalid hex string length");

        bytes32 result;
        for (uint256 i = 0; i < 32; i++) {
            uint8 high = _hexCharToUint8(hexString[i * 2]);
            uint8 low = _hexCharToUint8(hexString[i * 2 + 1]);
            result |= bytes32(uint256(high * 16 + low) << (8 * (31 - i)));
        }
        return result;
    }

    // Convert hex character to uint8
    function _hexCharToUint8(bytes1 char) internal pure returns (uint8) {
        uint8 c = uint8(char);
        if (c >= 48 && c <= 57) return c - 48; // 0-9
        if (c >= 97 && c <= 102) return c - 87; // a-f
        if (c >= 65 && c <= 70) return c - 55; // A-F
        revert("Invalid hex character");
    }

    // Extract event name from public inputs (same logic as contract)
    function _extractEventName(bytes32[] memory publicInputs) internal pure returns (string memory) {
        uint256 len = uint256(publicInputs[323]);
        require(len <= 256, "Event name too long");

        bytes memory nameBytes = new bytes(len);
        for (uint256 i = 0; i < len; i++) {
            nameBytes[i] = bytes1(uint8(uint256(publicInputs[67 + i])));
        }

        return string(nameBytes);
    }
}
