# Mintmarks UX Flow - Complete State Management

## Overview

This document explains how the Mintmarks frontend handles all edge cases for the proof → SELF verify → mint flow, especially when users return after partial completion.

## State Management Architecture

### Key States Tracked

1. **Proof State** (`result`)
   - `result.proof`: ZK proof bytes and public inputs
   - `result.metadata`: Event name, email nullifier, date, etc.

2. **SELF Verification State**
   - `selfVerified`: Boolean - whether SELF verification completed
   - `emailNullifier`: Extracted from proof public outputs
   - On-chain: `emailNullifierVerified[emailNullifier]` in ProofOfHuman contract

3. **Minting State**
   - On-chain: `usedNullifiers[emailNullifier]` in Mintmarks contract
   - Local: `minting`, `mintTxHash`, `mintedTokenId`

### Step Flow

```
upload → self-verify → mint → complete
```

## Edge Case Handling

### Scenario 1: User Verifies with SELF but Doesn't Mint

**User Actions:**
1. Uploads .eml file
2. Generates ZK proof (30-60s)
3. Verifies with SELF Protocol ✅
4. **Closes browser before clicking "Mint NFT"**

**State:**
- On-chain: `emailNullifierVerified[emailNullifier] = true`
- On-chain: `usedNullifiers[emailNullifier] = false` (NOT minted)
- Local: All state lost (page refresh)

**Recovery Flow:**
1. User returns and uploads same .eml file
2. Generates proof again (same emailNullifier)
3. Reaches `self-verify` step
4. **`checkExistingVerification()` runs:**
   ```typescript
   const isVerified = await proofOfHuman.isEmailNullifierVerified(emailNullifier);
   const isAlreadyMinted = await mintmarks.usedNullifiers(emailNullifier);

   if (isAlreadyMinted) {
     // Show error: already minted
     alert('This email proof has already been used to mint!');
     return;
   }

   if (isVerified) {
     // Skip to mint step!
     setSelfVerified(true);
     setStep('mint');
   }
   ```
5. **Auto-skips to mint step** ✅
6. User can click "Mint NFT" to complete

**Result:** User can resume and complete minting! ✅

---

### Scenario 2: User Tries to Verify SELF Again (Already Verified)

**User Actions:**
1. Uploads .eml file (already verified before)
2. Generates proof
3. Tries to scan QR code with SELF app
4. **SELF Protocol rejects: `EmailNullifierAlreadyVerified`**

**Error Handling:**
```typescript
onError={(error) => {
  if (error?.error_code === '0x6abd5694') {
    // EmailNullifierAlreadyVerified
    alert('This email proof has already been verified! Moving to mint step...');
    setSelfVerified(true);
    setStep('mint');
  }
}}
```

**Result:** Gracefully advances to mint step instead of failing ✅

---

### Scenario 3: Mint Transaction Fails

**User Actions:**
1. Completes proof + SELF verification
2. Clicks "Mint NFT"
3. **Transaction fails** (rejected, out of gas, network error)

**State:**
- Local: `result`, `selfVerified` still set
- Mint step still showing
- Error shown to user

**Recovery Flow:**
1. User can simply click "Mint NFT" again
2. All proof data still in state
3. Transaction re-submitted

**Result:** User can retry minting without re-generating proof ✅

---

### Scenario 4: User Already Minted This Proof

**User Actions:**
1. User successfully minted before
2. Tries to use same .eml file again

**State:**
- On-chain: `emailNullifierVerified[emailNullifier] = true`
- On-chain: `usedNullifiers[emailNullifier] = true` (MINTED!)

**Detection:**
```typescript
const isAlreadyMinted = await mintmarks.usedNullifiers(emailNullifier);

if (isAlreadyMinted) {
  alert('This email proof has already been used to mint an NFT! You cannot mint again with the same proof.');
  setStep('upload');
  setFile(null);
  setResult(null);
  return;
}
```

**Result:** Clear error message, prevents wasted effort ✅

---

### Scenario 5: Multiple Events from Same Human

**User Actions:**
1. Mints Event A successfully
2. Attends Event B, gets new email
3. Uploads Event B .eml file

**State:**
- Event A: `emailNullifier_A` → `humanNullifier_X` (verified & minted)
- Event B: `emailNullifier_B` (different proof, same human)

**Flow:**
1. Generates new proof → `emailNullifier_B`
2. Verifies with SELF → links `emailNullifier_B` → `humanNullifier_X`
3. Contract checks: `humanUsedForEvent[humanNullifier_X]["Event B"]` → false ✅
4. Mints Event B successfully

**Result:** Same human can mint multiple events! ✅

---

## On-Chain State Checks

### checkExistingVerification()

Called when entering `self-verify` step:

```typescript
async function checkExistingVerification() {
  // 1. Check if email nullifier is verified by SELF
  const isVerified = await proofOfHuman.isEmailNullifierVerified(emailNullifier);

  // 2. Check if email nullifier already used to mint
  const isAlreadyMinted = await mintmarks.usedNullifiers(emailNullifier);

  // 3. Handle states
  if (isAlreadyMinted) {
    // Error: Already minted with this proof
    alert('Already minted!');
    resetFlow();
  } else if (isVerified) {
    // Skip to mint: Verified but not minted yet
    setSelfVerified(true);
    setStep('mint');
  } else {
    // Show SELF QR code: Not verified yet
    // Continue normal flow
  }
}
```

### State Matrix

| isVerified | isAlreadyMinted | Action |
|------------|----------------|--------|
| false      | false          | Show SELF QR code (normal flow) |
| true       | false          | **Skip to mint step** (resume flow) |
| false      | true           | Impossible state (can't mint without verification) |
| true       | true           | **Show error: Already minted** |

## UI Indicators

### Step 2: SELF Verification

```
ℹ️ Note: If you've already verified this email with SELF,
you'll be taken directly to the mint step.
```

Shows user that the system will detect previous verification.

### Step 3: Mint

```
✓ Ready to Mint! Your email proof has been verified and
you're confirmed as a unique human. Click the button below
to mint your attendance NFT.
```

Confirms that all prerequisites are met.

## Error Messages

### Already Minted
```
This email proof has already been used to mint an NFT!
You cannot mint again with the same proof.
```

### Already Verified (from SELF)
```
This email proof has already been verified!
Moving to mint step...
```

### Human Already Claimed Event
```
You have already minted this event
```
(Caught during minting if same human tries to mint same event twice)

## Complete User Journeys

### Happy Path
1. Upload .eml → Generate Proof → SELF Verify → Mint → Complete ✅

### Resume After Browser Close
1. Upload .eml → Generate Proof → SELF Verify → **Close Browser**
2. Return → Upload .eml → Generate Proof → **Auto-skip to Mint** → Mint → Complete ✅

### Retry Failed Transaction
1. Upload .eml → Generate Proof → SELF Verify → Mint (fails) → **Retry Mint** → Complete ✅

### Prevent Double Mint
1. Upload .eml → Generate Proof → SELF Verify → Mint → Complete
2. Try again → Upload .eml → Generate Proof → **Error: Already minted** ❌

### Multi-Event Success
1. Event A: Upload → Prove → Verify → Mint ✅
2. Event B: Upload → Prove → Verify → Mint ✅
3. Same human, different events, both succeed! ✅

## Technical Implementation

### Contract Checks (in order)

**ProofOfHuman.verifyAndConsumeHuman():**
1. ✓ Is `emailNullifier` verified by SELF?
2. ✓ Does `msg.sender` match verified address?
3. ✓ Has this `humanNullifier` claimed this `eventName` before?

**Mintmarks.mint():**
1. Call `proofOfHuman.verifyAndConsumeHuman()` (above checks)
2. ✓ Is `emailNullifier` already used globally? (`usedNullifiers`)
3. ✓ Does ZK proof verify correctly?
4. Mint NFT ✅

### Frontend Checks (before showing UI)

**On entering self-verify step:**
1. ✓ Is `emailNullifier` already minted? → Error
2. ✓ Is `emailNullifier` already verified? → Skip to mint
3. Otherwise → Show SELF QR code

## Summary

The system now handles ALL edge cases:
- ✅ Resume after browser close
- ✅ Retry failed transactions
- ✅ Detect already minted proofs
- ✅ Auto-skip already verified proofs
- ✅ Support multiple events per human
- ✅ Clear error messages for all states
- ✅ Graceful degradation

**Result:** Robust, user-friendly UX that doesn't lose user progress! 🎉
