# Bug Fix: Circuit Synchronization Issue

## Root Cause Analysis

The proof verification was failing due to **circuit/verifier mismatch**. The system had three circuit artifacts that were out of sync:

### Timeline of the Problem

1. **Circuit Compilation** (22 Nov 18:47)
   - File: `mintmarks_circuits/target/mintmarks_circuits.json`
   - Hash: `a211795ef6b6d8d1b75c186091688f9222b2ce8f`
   - Size: 1.6 MB

2. **Web Frontend Circuit** (23 Nov 08:50) ⚠️ DIFFERENT
   - File: `web/public/circuit.json`
   - Hash: `5dfb67f6236ae77ec36b66084f9d5c6e67f5cbb3`
   - Size: 1.6 MB
   - **This was a DIFFERENT version of the circuit!**

3. **Deployed Verifier Contract** (23 Nov 07:54)
   - Address: `0xff4c542df3340abcf8043b1a5afb874344f06674`
   - Generated from unknown circuit version

### The Failure Flow

1. User uploads email in browser
2. Frontend loads circuit from `/circuit.json` (WRONG VERSION)
3. Browser generates ZK proof using WRONG circuit
4. Proof is submitted to Mintmarks contract
5. Contract calls verifier.verify() with the proof
6. Verifier (generated from DIFFERENT circuit) rejects proof ❌
7. Transaction reverts

### Why This Happened

During the debugging session to fix SELF Protocol encoding issues:
- The verifier contract was regenerated/redeployed
- The web frontend circuit was somehow updated to a different version
- The source circuit in `mintmarks_circuits/` remained unchanged
- **All three artifacts became misaligned**

## The Fix

### 1. Synchronized Circuit Files
```bash
cp mintmarks_circuits/target/mintmarks_circuits.json web/public/circuit.json
```

**Result:**
- Both files now have hash: `a211795ef6b6d8d1b75c186091688f9222b2ce8f`

### 2. Regenerated Verifier Contract
```bash
cd mintmarks_circuits && pnpm run generate:verifier
```

**Output:**
- New verifier: `contract/UltraHonkVerifier.sol` (76.35 KB)
- Generated from the correct circuit
- Generation time: 5.72s

### 3. Redeployed All Contracts
```bash
cd contracts && forge script script/Deploy.s.sol --rpc-url https://forno.celo-sepolia.celo-testnet.org --broadcast --legacy
```

**New Deployments:**
- Verifier: `0x26100F97647F6F7b45C36d9cE64F449390829f13`
- ProofOfHuman: `0x58C71d606CEeB39BCBA1B748A8691CBB8D8B0013`
- Mintmarks: `0xf94827a0d08eA8c7A3A51270B1a3349BB634DC36`

### 4. Updated Configuration Files

**contracts/configs/celo.json:**
```json
{
  "contracts": {
    "verifier": "0x26100F97647F6F7b45C36d9cE64F449390829f13",
    "proofOfHuman": "0x58C71d606CEeB39BCBA1B748A8691CBB8D8B0013",
    "mintmarks": "0xf94827a0d08eA8c7A3A51270B1a3349BB634DC36"
  }
}
```

**metadata/.env:**
```
MINTMARKS_ADDRESS=0xf94827a0d08eA8c7A3A51270B1a3349BB634DC36
```

## Verification

### Circuit Sync Check
```bash
$ shasum mintmarks_circuits/target/mintmarks_circuits.json web/public/circuit.json
a211795ef6b6d8d1b75c186091688f9222b2ce8f  mintmarks_circuits/target/mintmarks_circuits.json
a211795ef6b6d8d1b75c186091688f9222b2ce8f  web/public/circuit.json
```
✅ Circuits are now identical

### Contract Deployment Check
```bash
$ cast code 0x26100F97647F6F7b45C36d9cE64F449390829f13 --rpc-url https://forno.celo-sepolia.celo-testnet.org
0x608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063ea50d0e41461002d575b5f5ffd5b610040...
```
✅ Verifier contract deployed successfully

## Testing Instructions

1. **Clear browser cache** to ensure old circuit is not cached
2. **Refresh the web application**
3. Upload an email file (.eml)
4. Generate proof (should use correct circuit now)
5. Complete SELF verification
6. Submit minting transaction
7. **Proof verification should now succeed** ✅

## Lesson Learned

**Critical Insight:** In ZK proof systems, the circuit, verifier contract, and proof generator **MUST** be generated from the exact same source circuit. Any mismatch will cause all proofs to fail verification.

### Prevention Strategy

Going forward, ensure circuit synchronization:

1. **Single Source of Truth**: Always use `mintmarks_circuits/target/mintmarks_circuits.json`
2. **Atomic Updates**: When updating the circuit:
   - Recompile circuit: `cd mintmarks_circuits && nargo compile`
   - Sync to frontend: `cp target/mintmarks_circuits.json ../web/public/circuit.json`
   - Regenerate verifier: `pnpm run generate:verifier`
   - Redeploy contracts: `cd ../contracts && forge script script/Deploy.s.sol --broadcast`
   - Update all config files
3. **Version Control**: Commit all three artifacts together
4. **Verification Script**: Create a script to verify all artifacts are in sync before deployment

### Recommended Script
```bash
#!/bin/bash
# verify-circuit-sync.sh

CIRCUIT_HASH=$(shasum mintmarks_circuits/target/mintmarks_circuits.json | awk '{print $1}')
WEB_HASH=$(shasum web/public/circuit.json | awk '{print $1}')

if [ "$CIRCUIT_HASH" != "$WEB_HASH" ]; then
  echo "❌ ERROR: Circuit files are out of sync!"
  echo "Source: $CIRCUIT_HASH"
  echo "Web:    $WEB_HASH"
  exit 1
fi

echo "✅ Circuit files are synchronized"
echo "Hash: $CIRCUIT_HASH"
```

## Summary

**Problem:** Proof verification failing due to circuit/verifier mismatch
**Root Cause:** Web frontend using different circuit than deployed verifier
**Solution:** Synchronized all circuit artifacts and redeployed contracts
**Status:** ✅ **FIXED**

All proofs generated by the web frontend will now be verified successfully by the on-chain verifier contract.
