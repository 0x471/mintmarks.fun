#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../configs/celo.json'), 'utf8'));

// Read proof binary file
const proofPath = path.join(__dirname, '../../mintmarks_circuits/target/proof.bin');
const proofBuffer = fs.readFileSync(proofPath);
const proofHex = '0x' + proofBuffer.toString('hex');

// Read public inputs JSON
const publicInputsPath = path.join(__dirname, '../../mintmarks_circuits/target/public_inputs.json');
const publicInputs = JSON.parse(fs.readFileSync(publicInputsPath, 'utf8'));

console.log('=== Mintmarks Minting Script ===\n');
console.log('Network:', config.network);
console.log('Contract:', config.contracts.mintmarks);
console.log('Proof size:', proofBuffer.length, 'bytes');
console.log('Public inputs:', publicInputs.length);
console.log('\nEvent details:');
console.log('  Pubkey Hash:', publicInputs[0]);
console.log('  Email Nullifier:', publicInputs[1]);
console.log('\nTotal Fee:', config.fees.total, 'CELO');

// Output the cast command
console.log('\n=== Mint Command ===\n');
console.log('Run this command to mint:\n');

// Format public inputs as array for cast
const publicInputsArray = '[' + publicInputs.join(',') + ']';

console.log(`cast send ${config.contracts.mintmarks} \\`);
console.log(`  "mint(bytes,bytes32[])" \\`);
console.log(`  "${proofHex}" \\`);
console.log(`  "${publicInputsArray}" \\`);
console.log(`  --value ${config.fees.total}ether \\`);
console.log(`  --rpc-url ${config.rpcUrl} \\`);
console.log(`  --private-key $PRIVATE_KEY`);
