// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {Mintmarks} from "../src/Mintmarks.sol";
import {ProofOfHuman} from "../src/ProofOfHuman.sol";
import "@verifier/UltraHonkVerifier.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Load config
        string memory configJson = vm.readFile("configs/celo.json");
        string memory metadataUri = vm.parseJsonString(configJson, ".metadataUri");
        address selfHubAddress = vm.parseJsonAddress(configJson, ".selfHubAddress");
        string memory scopeSeed = vm.parseJsonString(configJson, ".scopeSeed");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy UltraHonk verifier
        HonkVerifier verifier = new HonkVerifier();
        console.log("HonkVerifier deployed at:", address(verifier));

        // Deploy ProofOfHuman (SELF Protocol integration)
        ProofOfHuman proofOfHuman = new ProofOfHuman(
            selfHubAddress,
            scopeSeed
        );
        console.log("ProofOfHuman deployed at:", address(proofOfHuman));

        // Deploy Mintmarks
        Mintmarks mintmarks = new Mintmarks(
            address(verifier),
            address(proofOfHuman),
            metadataUri
        );
        console.log("Mintmarks deployed at:", address(mintmarks));

        // Link ProofOfHuman to Mintmarks
        proofOfHuman.setMintmarksContract(address(mintmarks));
        console.log("ProofOfHuman linked to Mintmarks");

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("Verifier:", address(verifier));
        console.log("ProofOfHuman:", address(proofOfHuman));
        console.log("Mintmarks:", address(mintmarks));
    }
}
