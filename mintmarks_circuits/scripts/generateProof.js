// Generate and verify proof for Mintmarks circuit

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UltraHonkBackend, BarretenbergVerifier } from '@aztec/bb.js';
import { Noir } from '@noir-lang/noir_js';
import { generateEmailVerifierInputs, verifyDKIMSignature } from '@zk-email/zkemail-nr';
import { getConstrainedHeaderSequence, getHeaderValueSequence, getEventNameSequence, decodeBoundedVec } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateAndVerifyProof(emlPath) {
  console.log('=== Mintmarks Proof Generator ===\n');

  // Paths
  const circuitPath = path.join(__dirname, '../target/mintmarks_circuits.json');
  const proofOutputPath = path.join(__dirname, '../target/proof.bin');
  const publicInputsPath = path.join(__dirname, '../target/public_inputs.json');

  if (!fs.existsSync(circuitPath)) {
    console.error('[ERROR]: Circuit not found!');
    console.error(`Expected: ${circuitPath}`);
    console.error('\nRun: pnpm run compile');
    process.exit(1);
  }

  if (!fs.existsSync(emlPath)) {
    console.error('[ERROR]: Email file not found!');
    console.error(`Expected: ${emlPath}`);
    process.exit(1);
  }

  const circuit = JSON.parse(fs.readFileSync(circuitPath, 'utf-8'));
  console.log(`Circuit loaded: ${circuitPath}`);
  console.log(`Noir version: ${circuit.noir_version}`);
  console.log(`ACIR opcodes: ${circuit.bytecode ? 'present' : 'missing'}`);

  console.log(`\nReading .eml file: ${emlPath}`);
  const email = fs.readFileSync(emlPath);
  console.log(`Email size: ${email.length} bytes`);

  console.log('\nVerifying DKIM signature and generating base inputs...');
  const baseInputs = await generateEmailVerifierInputs(email, {
    maxHeadersLength: 2048,
    ignoreBodyHashCheck: true,
  });

  console.log('DKIM signature verified successfully');

  const dkimResult = await verifyDKIMSignature(email, undefined, undefined, true);
  const headers = dkimResult.headers;

  console.log(`Domain: ${dkimResult.domain || 'unknown'}`);
  console.log(`Headers size: ${headers.length} bytes`);

  console.log('\nExtracting Date header sequence...');
  const dateHeaderSequence = getConstrainedHeaderSequence(headers, 'date');
  const dateValueSequence = getHeaderValueSequence(headers, dateHeaderSequence, 'date');

  const dateValue = headers.slice(
    parseInt(dateValueSequence.index),
    parseInt(dateValueSequence.index) + parseInt(dateValueSequence.length)
  ).toString();
  console.log(`Date: ${dateValue.trim()}`);

  console.log('\nExtracting Subject header sequence...');
  const subjectHeaderSequence = getConstrainedHeaderSequence(headers, 'subject');
  const subjectValueSequence = getHeaderValueSequence(headers, subjectHeaderSequence, 'subject');

  const subjectValue = headers.slice(
    parseInt(subjectValueSequence.index),
    parseInt(subjectValueSequence.index) + parseInt(subjectValueSequence.length)
  ).toString();
  console.log(`Subject: ${subjectValue.trim()}`);

  console.log('\nExtracting event name...');
  const eventNameSequence = getEventNameSequence(headers, subjectValueSequence);

  const eventName = headers.slice(
    parseInt(eventNameSequence.index),
    parseInt(eventNameSequence.index) + parseInt(eventNameSequence.length)
  ).toString();
  console.log(`Event name: ${eventName.trim()}`);

  const inputs = {
    signature: baseInputs.signature,
    header: baseInputs.header,
    pubkey: baseInputs.pubkey,
    date_header_sequence: dateHeaderSequence,
    date_value_sequence: dateValueSequence,
    subject_header_sequence: subjectHeaderSequence,
    subject_value_sequence: subjectValueSequence,
    event_name_sequence: eventNameSequence,
  };

  console.log('\nInputs generated successfully');
  console.log('\nInitializing Noir and UltraHonk backend...');

  const noir = new Noir(circuit);
  const backend = new UltraHonkBackend(circuit.bytecode);

  try {
    console.log('Executing circuit to generate witness...');
    const { witness, returnValue } = await noir.execute(inputs);

    console.log('\n=== Circuit Return Values ===');
    if (returnValue && returnValue.length >= 4) {
      const pubkeyHash = returnValue[0];
      const emailNullifier = returnValue[1];
      const dateBoundedVec = returnValue[2];
      const eventNameBoundedVec = returnValue[3];

      const dateStr = decodeBoundedVec(dateBoundedVec);
      const eventNameStr = decodeBoundedVec(eventNameBoundedVec);

      console.log(`Pubkey Hash: ${pubkeyHash}`);
      console.log(`Email Nullifier: ${emailNullifier}`);
      console.log(`Date: "${dateStr}"`);
      console.log(`Event Name: "${eventNameStr}"`);
    } else {
      console.log('Return values:', returnValue);
    }

    console.log('\nGenerating UltraHonk proof with Keccak hash (for EVM verification)...');
    const startProve = Date.now();
    const proof = await backend.generateProof(witness, { keccak: true });
    const proveTime = ((Date.now() - startProve) / 1000).toFixed(2);

    console.log(`\nProof generated in ${proveTime}s`);
    console.log(`Proof size: ${(proof.proof.length / 1024).toFixed(2)} KB`);

    // Save proof and public inputs
    fs.writeFileSync(proofOutputPath, proof.proof);

    // Public inputs are already in hex format from backend
    fs.writeFileSync(publicInputsPath, JSON.stringify(proof.publicInputs, null, 2));

    console.log(`\nProof saved: ${proofOutputPath}`);
    console.log(`Public inputs saved: ${publicInputsPath}`);
    console.log(`Public inputs count: ${proof.publicInputs.length}`);

    console.log('\nVerifying proof with Keccak hash...');
    const startVerify = Date.now();
    const verified = await backend.verifyProof(proof, { keccak: true });
    const verifyTime = ((Date.now() - startVerify) / 1000).toFixed(2);

    if (verified) {
      console.log(`\nProof verified successfully in ${verifyTime}s`);
    } else {
      console.log(`\n[FAILED]: Proof verification failed`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n[ERROR]: Proof generation/verification failed');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Clean up backend resources
    await backend.destroy();
  }
}

// CLI execution
const emlPath = process.argv[2] || path.join(__dirname, '../../LUMA_EXAMPLE.eml');

generateAndVerifyProof(emlPath).catch(err => {
  console.error('[ERROR]: Unhandled error:', err);
  process.exit(1);
});
