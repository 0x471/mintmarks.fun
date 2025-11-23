# SELF Protocol Architectural Limitation

## ✅ RESOLVED - Verify-Once-Mint-Multiple Pattern Implemented

**Solution:** Option 2 - Address-based verification
**Status:** Deployed to Celo Sepolia
**Contracts:** Updated and redeployed

### How It Works Now

**First Event:**
1. User uploads .eml file → generates ZK proof → emailNullifier_A
2. User scans SELF QR code → SELF verification ✅
3. Contract stores:
   - `emailNullifierVerified[emailNullifier_A] = true`
   - `addressVerified[wallet] = true` (**NEW**)
   - `addressToHumanNullifier[wallet] = humanNullifier` (**NEW**)
4. User mints Event A ✅

**Subsequent Events:**
1. User uploads new .eml file → generates ZK proof → emailNullifier_B (different)
2. Frontend checks: `isAddressVerified(wallet)` → **true** ✅
3. **Auto-skips SELF verification!** Shows: "You verified once, mint forever!"
4. User clicks mint → Contract uses Path B (address-verified) → Mint succeeds ✅

**Benefits:**
- ✅ User verifies with SELF only ONCE
- ✅ Can mint unlimited events after first verification
- ✅ Better UX (no repeated QR scanning)
- ✅ Works within SELF Protocol limitations
- ✅ Maintains sybil resistance (one human per wallet)

**Trade-off:**
- User must use same wallet for all events
- But this is actually good: consistent identity across events

---

## 🚨 Original Finding (Fixed)

**SELF Protocol only allows ONE verification per user per scope!**

According to [SELF Protocol Documentation](https://docs.self.xyz/contract-integration/working-with-userdefineddata):

> "The nullifier is primarily determined by the user's identity (private key) and the scope, not by the userData"
>
> "Two passports registered with the same private key will give the same disclosure nullifier"

## What This Means

**Nullifier Calculation:**
```
nullifier = f(user's passport, scope)  // Does NOT include userData!
```

**For our implementation:**
- Scope: "mintmarks.fun" (fixed in ProofOfHuman contract)
- User can verify ONCE for scope "mintmarks.fun"
- Different `userData` (emailNullifier) doesn't create a new verification

## The Problem

**Our Goal:**
User should mint once per event (multiple events allowed)

**Current Reality:**
User can only verify once TOTAL for scope "mintmarks.fun"

**Example Failure Case:**
1. User attends Event A, verifies with SELF ✅
2. User mints Event A ✅
3. User attends Event B, tries to verify with SELF ❌
   - Error: `EmailNullifierAlreadyVerified` (0x6abd5694)
   - SELF Hub blocks it: "Already verified for scope 'mintmarks.fun'"
4. User CANNOT mint Event B ❌

## Why It's Failing

```
Email nullifier status: {
  emailNullifier: '0x0b549804...',
  isVerified: false,     // ← Our contract says NOT verified
  isAlreadyMinted: false
}

SELF error: EmailNullifierAlreadyVerified  // ← SELF says ALREADY verified
```

**Explanation:**
- SELF Hub remembers: "This passport already verified for 'mintmarks.fun'"
- Our contract doesn't have this email nullifier (different email from Event A)
- SELF blocks the verification at Hub level BEFORE calling our contract
- Our contract never gets called → emailNullifierVerified[B] stays false

## Solutions

### Option 1: Event-Specific Scopes ⭐ (RECOMMENDED)

**Approach:** Use unique scope per event

**Implementation:**
```
Event A: scope = "mintmarks.fun/NPC-Side-Event"
Event B: scope = "mintmarks.fun/ETHGlobal-BA"
```

**Pros:**
- Allows multiple verifications per user (different scopes)
- Each event is isolated
- Maintains sybil resistance per event

**Cons:**
- Requires deploying separate ProofOfHuman contract per event OR
- Requires contract redesign to support dynamic scopes

**Contract Changes Needed:**
```solidity
// Current (single scope):
constructor(address hub, string memory scopeSeed)
  SelfVerificationRoot(hub, scopeSeed) { }

// New (dynamic scope):
contract ProofOfHumanMultiScope {
  mapping(string => SelfVerificationConfig) scopeConfigs;

  function createEventScope(string eventName, string scopeSeed) onlyOwner {
    // Create new scope for event
  }
}
```

### Option 2: Single Verification, Multiple Mints

**Approach:** User verifies ONCE, can mint any event after

**Flow:**
1. User generates proof for Event A
2. User verifies ONCE with SELF → `humanNullifier` linked to `userAddress`
3. Contract stores: "This address has been verified"
4. User mints Event A
5. **For Event B:**
   - User generates proof (new emailNullifier)
   - NO SELF verification needed
   - Contract checks: Is this address verified? Yes. Mint!

**Pros:**
- Simpler UX (verify once, mint many)
- No contract redesign needed

**Cons:**
- Loses per-email verification tracking
- Need to change mint flow (check address verified, not email verified)

**Contract Changes Needed:**
```solidity
// Add global verification tracking
mapping(address => bool) public addressVerified;
mapping(address => uint256) public addressToHumanNullifier;

// In customVerificationHook:
addressVerified[userAddress] = true;
addressToHumanNullifier[userAddress] = humanNullifier;

// In mint:
require(addressVerified[msg.sender], "Not verified");
uint256 humanNullifier = addressToHumanNullifier[msg.sender];
require(!humanUsedForEvent[humanNullifier][eventName], "Already minted");
```

### Option 3: Remove SELF Protocol (Not Recommended)

**Approach:** Use only ZK email proofs for sybil resistance

**Pros:**
- Simpler architecture
- No SELF limitations

**Cons:**
- Weaker sybil resistance (only email-based)
- Loses passport-based human verification

## Current Status

**What Works:**
- User can verify ONCE for scope "mintmarks.fun"
- User can mint ONE event

**What Doesn't Work:**
- User CANNOT mint multiple events (blocked by SELF)
- Getting error: EmailNullifierAlreadyVerified on 2nd event

## Recommended Path Forward

**Short-term (Demo/MVP):**
- Document that users can only mint one event
- OR use Option 2 (single verification, multiple mints)

**Long-term (Production):**
- Implement Option 1 with event-specific scopes
- Deploy ProofOfHuman contracts per event OR
- Redesign ProofOfHuman to support multiple scopes

## Implementation: Option 2 (Quick Fix)

This can be implemented without contract redeployment by changing the frontend flow:

1. User verifies ONCE (first event)
2. For subsequent events:
   - Skip SELF verification step
   - Query contract: Is this address verified?
   - If yes, proceed to mint

**Frontend Changes:**
```typescript
// Check if user's address is already verified
const isAddressVerified = await checkIfAddressVerified(account);

if (isAddressVerified) {
  // Skip to mint step
  setStep('mint');
} else {
  // Show SELF verification
  setStep('self-verify');
}
```

This requires adding a contract view function:
```solidity
function isAddressVerified(address user) public view returns (bool) {
  // Check if this address has ever verified
  // Could check if they have any humanNullifier associated
}
```

## Conclusion

SELF Protocol's one-verification-per-scope model is incompatible with our "one-mint-per-event" goal when using a single global scope. We must either:

1. Use event-specific scopes (architectural redesign)
2. Use single verification for all events (UX change)
3. Find alternative sybil resistance mechanism

**Decision needed:** Which approach should we take?

---

**Sources:**
- [SELF Protocol - Working with userDefinedData](https://docs.self.xyz/contract-integration/working-with-userdefineddata)
- [SELF Protocol - Basic Integration](https://docs.self.xyz/contract-integration/basic-integration)
