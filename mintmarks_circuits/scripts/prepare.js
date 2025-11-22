// Generate Prover.toml for Mintmarks circuit

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateEmailVerifierInputs, verifyDKIMSignature } from '@zk-email/zkemail-nr';
import { toProverToml } from '@zk-email/zkemail-nr/dist/utils.js';
import { getConstrainedHeaderSequence, getHeaderValueSequence, getEventNameSequence } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateProverToml(emlPath, outputPath) {
  console.log('=== Mintmarks Prover.toml Generator ===\n');

  console.log(`Reading .eml file: ${emlPath}`);
  const email = fs.readFileSync(emlPath);
  console.log(`Email size: ${email.length} bytes\n`);

  console.log('Verifying DKIM signature and generating base inputs...');
  const baseInputs = await generateEmailVerifierInputs(email, {
    maxHeadersLength: 2048, // Matches MAX_EMAIL_HEADER_LENGTH in circuit
    ignoreBodyHashCheck: true, // We don't verify body hash in this circuit
  });

  console.log('DKIM signature verified successfully\n');

  const dkimResult = await verifyDKIMSignature(email, undefined, undefined, true);
  const headers = dkimResult.headers;

  console.log(`Domain: ${dkimResult.domain || 'unknown'}`);
  console.log(`Headers size: ${headers.length} bytes\n`);

  console.log('Extracting Date header sequence...');
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

  const tomlContent = `# Generated Prover.toml for Luma email
# Domain: ${dkimResult.domain || 'unknown'}
# Event: ${eventName.trim()}

${toProverToml(inputs)}
`;

  fs.writeFileSync(outputPath, tomlContent);
  console.log(`\nProver.toml written to: ${outputPath}`);

  console.log(`\nSummary:`);
  console.log(`- Headers: ${headers.length} bytes (padded to 2048)`);
  console.log(`- Date value: bytes ${dateValueSequence.index}-${parseInt(dateValueSequence.index) + parseInt(dateValueSequence.length)}`);
  console.log(`- Subject value: bytes ${subjectValueSequence.index}-${parseInt(subjectValueSequence.index) + parseInt(subjectValueSequence.length)}`);
  console.log(`- Event name: bytes ${eventNameSequence.index}-${parseInt(eventNameSequence.index) + parseInt(eventNameSequence.length)}`);
}

// CLI execution
const emlPath = process.argv[2] || path.join(__dirname, '../../LUMA_EXAMPLE.eml');
const outputPath = path.join(__dirname, '../Prover.toml');

generateProverToml(emlPath, outputPath).catch(err => {
  console.error('[ERROR]:', err.message);
  if (err.stack) {
    console.error('\nStack trace:');
    console.error(err.stack);
  }
  process.exit(1);
});
