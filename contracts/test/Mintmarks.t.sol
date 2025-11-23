// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test, console} from "forge-std/Test.sol";
import {Mintmarks} from "../src/Mintmarks.sol";
import {IUltraVerifier} from "../src/interfaces/IUltraVerifier.sol";

contract MockVerifier is IUltraVerifier {
    bool public shouldVerify = true;

    function verify(bytes calldata, bytes32[] calldata) external view override returns (bool) {
        return shouldVerify;
    }

    function setShouldVerify(bool _shouldVerify) external {
        shouldVerify = _shouldVerify;
    }
}

contract MintmarksTest is Test {
    Mintmarks public mintmarks;
    MockVerifier public verifier;

    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);

    bytes public mockProof = hex"1234";
    bytes32[] public mockPublicInputs;

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

    function setUp() public {
        vm.startPrank(owner);

        // Deploy mock verifier
        verifier = new MockVerifier();

        // Deploy Mintmarks contract (using mock address for ProofOfHuman in tests)
        mintmarks = new Mintmarks(
            address(verifier),
            address(0x1), // Mock ProofOfHuman address for testing
            "https://mintmarks.fun/api/metadata/{id}"
        );

        vm.stopPrank();

        // Setup mock public inputs (324 fields)
        mockPublicInputs = new bytes32[](324);

        // [0] pubkeyHash
        mockPublicInputs[0] = bytes32(uint256(0x123));

        // [1] emailNullifier
        mockPublicInputs[1] = bytes32(uint256(0x456));

        // [2..65] dateValue.storage (not used, but must exist)
        // [66] dateValue.len
        mockPublicInputs[66] = bytes32(uint256(0));

        // [67..322] eventName.storage
        // Set event name "Test Event"
        bytes memory eventName = "Test Event";
        for (uint256 i = 0; i < eventName.length; i++) {
            mockPublicInputs[67 + i] = bytes32(uint256(uint8(eventName[i])));
        }

        // [323] eventName.len
        mockPublicInputs[323] = bytes32(eventName.length);
    }

    function testInitialState() public view {
        assertEq(mintmarks.owner(), owner);
        assertEq(address(mintmarks.verifier()), address(verifier));
        assertEq(mintmarks.collectionCreationFee(), 0.01 ether);
        assertEq(mintmarks.mintingFee(), 0.001 ether);
        assertEq(mintmarks.nextTokenId(), 1);
    }

    function testMintNewCollection() public {
        vm.deal(user1, 1 ether);
        vm.startPrank(user1);

        uint256 expectedTokenId = 1;
        bytes32 nullifier = mockPublicInputs[1];

        vm.expectEmit(true, true, true, true);
        emit CollectionCreated(expectedTokenId, "Test Event", user1);

        vm.expectEmit(true, true, true, true);
        emit Minted(user1, expectedTokenId, nullifier, "Test Event");

        uint256 tokenId = mintmarks.mint{value: 0.011 ether}(mockProof, mockPublicInputs);

        assertEq(tokenId, expectedTokenId);
        assertEq(mintmarks.balanceOf(user1, tokenId), 1);
        assertEq(mintmarks.nextTokenId(), 2);

        Mintmarks.EventCollection memory collection = mintmarks.getCollection(tokenId);
        assertEq(collection.tokenId, tokenId);
        assertEq(collection.eventName, "Test Event");
        assertEq(collection.pubkeyHash, mockPublicInputs[0]);
        assertEq(collection.totalMinted, 1);
        assertEq(collection.creator, user1);
        assertGt(collection.createdAt, 0);

        assertTrue(mintmarks.isNullifierUsed(nullifier));
        assertTrue(mintmarks.collectionExists("Test Event", mockPublicInputs[0]));

        vm.stopPrank();
    }

    function testMintExistingCollection() public {
        // First mint creates collection
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        uint256 tokenId = mintmarks.mint{value: 0.011 ether}(mockProof, mockPublicInputs);

        // Change nullifier for second mint
        mockPublicInputs[1] = bytes32(uint256(0x789));

        // Second mint to same collection (cheaper fee)
        vm.deal(user2, 1 ether);
        vm.prank(user2);
        uint256 tokenId2 = mintmarks.mint{value: 0.001 ether}(mockProof, mockPublicInputs);

        assertEq(tokenId, tokenId2);
        assertEq(mintmarks.balanceOf(user2, tokenId), 1);

        Mintmarks.EventCollection memory collection = mintmarks.getCollection(tokenId);
        assertEq(collection.totalMinted, 2);
    }

    function testRevertInvalidPublicInputsLength() public {
        vm.deal(user1, 1 ether);
        vm.prank(user1);

        bytes32[] memory invalidInputs = new bytes32[](100); // Wrong length

        vm.expectRevert(Mintmarks.InvalidPublicInputs.selector);
        mintmarks.mint{value: 0.011 ether}(mockProof, invalidInputs);
    }

    function testRevertAlreadyClaimed() public {
        vm.deal(user1, 1 ether);
        vm.startPrank(user1);

        // First mint succeeds
        mintmarks.mint{value: 0.011 ether}(mockProof, mockPublicInputs);

        // Second mint with same nullifier fails
        vm.expectRevert(Mintmarks.AlreadyClaimed.selector);
        mintmarks.mint{value: 0.011 ether}(mockProof, mockPublicInputs);

        vm.stopPrank();
    }

    function testRevertInvalidProof() public {
        verifier.setShouldVerify(false);

        vm.deal(user1, 1 ether);
        vm.prank(user1);

        vm.expectRevert(Mintmarks.InvalidProof.selector);
        mintmarks.mint{value: 0.011 ether}(mockProof, mockPublicInputs);
    }

    function testRevertInsufficientFeeNewCollection() public {
        vm.deal(user1, 1 ether);
        vm.prank(user1);

        vm.expectRevert(Mintmarks.InsufficientFee.selector);
        mintmarks.mint{value: 0.001 ether}(mockProof, mockPublicInputs); // Only minting fee
    }

    function testRevertInsufficientFeeExistingCollection() public {
        // Create collection
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        mintmarks.mint{value: 0.011 ether}(mockProof, mockPublicInputs);

        // Try to mint with insufficient fee
        mockPublicInputs[1] = bytes32(uint256(0x789)); // Different nullifier

        vm.deal(user2, 1 ether);
        vm.prank(user2);

        vm.expectRevert(Mintmarks.InsufficientMintingFee.selector);
        mintmarks.mint{value: 0.0001 ether}(mockProof, mockPublicInputs);
    }

    function testSetCollectionCreationFee() public {
        vm.prank(owner);
        mintmarks.setCollectionCreationFee(0.02 ether);

        assertEq(mintmarks.collectionCreationFee(), 0.02 ether);
    }

    function testSetMintingFee() public {
        vm.prank(owner);
        mintmarks.setMintingFee(0.002 ether);

        assertEq(mintmarks.mintingFee(), 0.002 ether);
    }

    function testWithdraw() public {
        // Mint to add funds to contract
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        mintmarks.mint{value: 0.011 ether}(mockProof, mockPublicInputs);

        uint256 contractBalance = address(mintmarks).balance;
        assertEq(contractBalance, 0.011 ether);

        uint256 ownerBalanceBefore = owner.balance;

        vm.prank(owner);
        mintmarks.withdraw();

        assertEq(address(mintmarks).balance, 0);
        assertEq(owner.balance, ownerBalanceBefore + contractBalance);
    }

    function testGetTokenIdByCollection() public {
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        uint256 tokenId = mintmarks.mint{value: 0.011 ether}(mockProof, mockPublicInputs);

        bytes32 pubkeyHash = mockPublicInputs[0];
        uint256 queriedTokenId = mintmarks.getTokenIdByCollection("Test Event", pubkeyHash);
        assertEq(queriedTokenId, tokenId);

        // Non-existent event name returns 0
        uint256 nonExistentTokenId = mintmarks.getTokenIdByCollection("Non Existent Event", pubkeyHash);
        assertEq(nonExistentTokenId, 0);

        // Same event name, different pubkey = different collection
        bytes32 differentPubkey = bytes32(uint256(0x999));
        uint256 differentCollectionId = mintmarks.getTokenIdByCollection("Test Event", differentPubkey);
        assertEq(differentCollectionId, 0);
    }

    function testMultipleCollections() public {
        // Create first collection "Test Event"
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        uint256 tokenId1 = mintmarks.mint{value: 0.011 ether}(mockProof, mockPublicInputs);

        // Create second collection "Another Event"
        bytes memory eventName2 = "Another Event";
        for (uint256 i = 0; i < eventName2.length; i++) {
            mockPublicInputs[67 + i] = bytes32(uint256(uint8(eventName2[i])));
        }
        for (uint256 i = eventName2.length; i < 256; i++) {
            mockPublicInputs[67 + i] = bytes32(0);
        }
        mockPublicInputs[323] = bytes32(eventName2.length);
        mockPublicInputs[1] = bytes32(uint256(0x999)); // Different nullifier

        vm.deal(user2, 1 ether);
        vm.prank(user2);
        uint256 tokenId2 = mintmarks.mint{value: 0.011 ether}(mockProof, mockPublicInputs);

        assertEq(tokenId1, 1);
        assertEq(tokenId2, 2);
        assertEq(mintmarks.nextTokenId(), 3);

        Mintmarks.EventCollection memory col1 = mintmarks.getCollection(tokenId1);
        Mintmarks.EventCollection memory col2 = mintmarks.getCollection(tokenId2);

        assertEq(col1.eventName, "Test Event");
        assertEq(col2.eventName, "Another Event");
    }

    function testSameEventNameDifferentDomains() public {
        // Same event name from domain 1 (pubkey 0x123)
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        uint256 tokenId1 = mintmarks.mint{value: 0.011 ether}(mockProof, mockPublicInputs);

        // Same event name from domain 2 (different pubkey 0x456)
        mockPublicInputs[0] = bytes32(uint256(0x456)); // Different pubkey (different domain)
        mockPublicInputs[1] = bytes32(uint256(0x789)); // Different nullifier

        vm.deal(user2, 1 ether);
        vm.prank(user2);
        uint256 tokenId2 = mintmarks.mint{value: 0.011 ether}(mockProof, mockPublicInputs);

        // Should create TWO different collections
        assertEq(tokenId1, 1);
        assertEq(tokenId2, 2);
        assertEq(mintmarks.nextTokenId(), 3);

        Mintmarks.EventCollection memory col1 = mintmarks.getCollection(tokenId1);
        Mintmarks.EventCollection memory col2 = mintmarks.getCollection(tokenId2);

        // Same event name but different pubkeys
        assertEq(col1.eventName, "Test Event");
        assertEq(col2.eventName, "Test Event");
        assertEq(col1.pubkeyHash, bytes32(uint256(0x123)));
        assertEq(col2.pubkeyHash, bytes32(uint256(0x456)));

        // Prevents collision attack: same name from different domains = separate collections
    }
}
