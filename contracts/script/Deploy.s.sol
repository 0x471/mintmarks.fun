// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {Mintmarks} from "../src/Mintmarks.sol";
import "@verifier/UltraHonkVerifier.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Load config for metadata URI
        string memory configJson = vm.readFile("configs/celo.json");
        string memory metadataUri = vm.parseJsonString(configJson, ".metadataUri");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy UltraHonk verifier
        HonkVerifier verifier = new HonkVerifier();
        console.log("HonkVerifier:", address(verifier));

        // Deploy Mintmarks
        Mintmarks mintmarks = new Mintmarks(
            address(verifier),
            metadataUri
        );
        console.log("Mintmarks:", address(mintmarks));

        vm.stopBroadcast();
    }
}
