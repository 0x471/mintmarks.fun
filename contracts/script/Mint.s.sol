// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {Mintmarks} from "../src/Mintmarks.sol";

contract MintScript is Script {
    function run() external {
        uint256 minterPrivateKey = vm.envUint("PRIVATE_KEY");

        // Load config
        string memory configJson = vm.readFile("configs/celo.json");
        address contractAddress = vm.parseJsonAddress(configJson, ".contracts.mintmarks");

        // Read proof and public inputs from files
        bytes memory proof = vm.readFileBinary("../mintmarks_circuits/target/proof.bin");
        string memory publicInputsJson = vm.readFile("../mintmarks_circuits/target/public_inputs.json");

        // Parse JSON array into bytes32 array
        bytes32[] memory publicInputs = abi.decode(vm.parseJson(publicInputsJson), (bytes32[]));

        string memory network = vm.parseJsonString(configJson, ".network");
        string memory totalFee = vm.parseJsonString(configJson, ".fees.total");

        console.log("Minting on", network);
        console.log("Contract:", contractAddress);
        console.log("Proof size:", proof.length);
        console.log("Public inputs count:", publicInputs.length);
        console.log("Total fee:", totalFee, "CELO");

        vm.startBroadcast(minterPrivateKey);

        Mintmarks mintmarks = Mintmarks(contractAddress);
        uint256 tokenId = mintmarks.mint{value: 0.011 ether}(proof, publicInputs);

        console.log("Minted successfully!");
        console.log("Token ID:", tokenId);

        vm.stopBroadcast();
    }
}
