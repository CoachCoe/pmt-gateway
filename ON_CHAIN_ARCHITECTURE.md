# 🔗 Fully On-Chain Architecture

## Overview

PMT Gateway can now operate as a **fully decentralized payment gateway** with **ALL merchant data stored on the blockchain**. No database required for merchant preferences!

---

## 🏗️ Architecture: On-Chain vs Database

### **Option 1: Hybrid (Current Default)**
```
BLOCKCHAIN                    DATABASE
├─ Escrow payments           ├─ Payment cache (for speed)
├─ Money locked              ├─ Merchant preferences
├─ Platform fees             ├─ Session tokens
└─ Payment events            └─ Webhook delivery logs
```

### **Option 2: Fully On-Chain (New!)**
```
BLOCKCHAIN                    DATABASE
├─ Escrow payments           ├─ Payment cache (optional)
├─ Money locked              ├─ Session tokens (temporary)
├─ Platform fees             └─ [Nothing critical!]
├─ Payment events
├─ Merchant profiles ✨
├─ Payout preferences ✨
├─ API key hashes ✨
└─ Webhook URL hashes ✨
```

**Key Insight:** Database becomes completely optional! Everything can be rebuilt from blockchain.

---

## 📦 What's Stored Where

| Data Type | Blockchain | Database | Why Blockchain? |
|-----------|-----------|----------|-----------------|
| **💰 Escrow Payments** | ✅ Primary | 📋 Cache | Money = must be on-chain |
| **👤 Merchant Profile** | ✅ Primary | ❌ None | Decentralized identity |
| **📊 Payment Stats** | ✅ Primary | 📋 Cache | Transparent reputation |
| **⚙️ Payout Preferences** | ✅ Primary | ❌ None | Merchant sovereignty |
| **🔑 API Key Hash** | ✅ Primary | ❌ None | Verifiable auth |
| **🪝 Webhook URL Hash** | ✅ Primary | ❌ None | Privacy + verification |
| **📝 Business Metadata** | 📁 IPFS | ❌ None | Decentralized storage |
| **🎫 Session Tokens** | ❌ None | ✅ Only | Temporary, not critical |

---

## 🎯 Smart Contracts

### **1. PMTEscrow.sol** (Existing)
Handles payment escrow logic:
```solidity
- createPayment()     // Lock funds
- releasePayment()    // Send to merchant
- refundPayment()     // Return to buyer
- withdrawFees()      // Platform collects fees
```

### **2. PMTMerchantRegistry.sol** (New!)
Stores merchant preferences on-chain:
```solidity
struct MerchantProfile {
    address walletAddress;
    string name;
    string metadata;              // IPFS hash
    uint16 customFeeBps;
    PayoutSchedule schedule;
    uint256 minPayoutAmount;
    bool isActive;
}

struct MerchantStats {
    uint256 totalPayments;
    uint256 totalVolume;
    uint256 successfulPayments;
    uint256 refundedPayments;
}
```

**Functions:**
- `registerMerchant()` - Anyone can register (permissionless!)
- `updateProfile()` - Update name, IPFS metadata
- `updatePayoutPreferences()` - Change payout schedule
- `updateWebhook()` - Store webhook URL hash (privacy)
- `verifyWebhook()` - Verify webhook matches hash
- `getMerchant()` - Read merchant data
- `getMerchantStats()` - Read payment history

---

## 🔐 Privacy: Why Hash URLs?

**Problem:** Storing webhook URLs on-chain exposes them publicly.

**Solution:** Store `keccak256(webhookUrl)` hash instead.

```typescript
// ON-CHAIN (public)
webhookHash = keccak256("https://myshop.com/webhook")
// = 0x742d35Cc6634C0532925a3b844Bc454e4438f44e

// VERIFICATION (off-chain)
contract.verifyWebhook(merchantAddress, "https://myshop.com/webhook")
// → true if hash matches
```

**Benefits:**
- ✅ Webhook URL not publicly visible
- ✅ Can verify correctness
- ✅ Merchant can update anytime
- ✅ No database needed

Same approach for API keys!

---

## 📁 IPFS for Rich Metadata

Store additional merchant data on IPFS:

```json
// merchants/0x123.../profile.json (on IPFS)
{
  "businessName": "Alice's Shop",
  "description": "Premium handmade goods",
  "logo": "ipfs://Qm...",
  "website": "https://aliceshop.com",
  "supportEmail": "support@aliceshop.com",
  "socialMedia": {
    "twitter": "@aliceshop",
    "discord": "https://discord.gg/..."
  },
  "categories": ["handmade", "artisan", "jewelry"],
  "shippingRegions": ["US", "EU", "CA"]
}
```

**On-Chain Storage:**
```solidity
merchant.metadata = "QmX7fK...ABC123"; // IPFS hash only
```

**Reading:**
```typescript
const profile = await merchantRegistry.getMerchant("0x123...");
const metadata = await fetch(`https://ipfs.io/ipfs/${profile.metadata}`);
// → full merchant data
```

---

## 🔄 How It Works

### **1. Merchant Registration (Fully On-Chain)**

```typescript
// Frontend: Connect wallet
await connectWallet();

// Sign transaction to register
const tx = await merchantRegistry.registerMerchant(
  "Alice's Shop",                    // name
  "QmX7fK...ABC123",                // IPFS metadata
  PayoutSchedule.WEEKLY,            // payout schedule
  ethers.parseEther("10.0")         // min payout: 10 DOT
);

// Wait for confirmation
await tx.wait();

// ✅ Merchant now registered on-chain!
// No API calls, no database, no approval needed
```

### **2. Reading Merchant Data**

```typescript
// Backend reads from blockchain
const merchant = await merchantRegistry.getMerchant("0x123...");

console.log(merchant.name);              // "Alice's Shop"
console.log(merchant.schedule);          // WEEKLY
console.log(merchant.minPayoutAmount);   // "10.0" DOT

// Fetch rich metadata from IPFS
const metadata = await ipfs.cat(merchant.metadata);
console.log(metadata.logo);             // "ipfs://Qm..."
```

### **3. Updating Preferences**

```typescript
// Merchant updates payout schedule (signs transaction)
await merchantRegistry.updatePayoutPreferences(
  PayoutSchedule.INSTANT,  // Change to instant payouts
  ethers.parseEther("5.0") // Lower minimum to 5 DOT
);

// ✅ Updated on-chain immediately
// No API call needed!
```

### **4. API Key Verification**

```typescript
// Merchant generates API key in dashboard
const apiKey = generateApiKey();  // e.g., "pk_live_abc123..."

// Store hash on-chain
await merchantRegistry.updateApiKey(
  keccak256(apiKey)
);

// Show API key to merchant ONCE (they copy it)
console.log("Your API key:", apiKey);
console.log("⚠️ Save this! It won't be shown again.");

// --- Later, when API request comes in ---

// Backend verifies API key
const isValid = await merchantRegistry.verifyApiKey(
  "0x123...",  // merchant address
  apiKey       // from Authorization header
);

if (!isValid) {
  throw new Error("Invalid API key");
}

// ✅ Verified against blockchain!
```

---

## 💾 Database Usage (Minimal)

Even with on-chain storage, we keep a **tiny database** for:

### **1. Session Tokens (Temporary)**
```sql
CREATE TABLE wallet_sessions (
  sessionToken TEXT PRIMARY KEY,
  walletAddress TEXT NOT NULL,
  expiresAt TIMESTAMP NOT NULL
);
```

**Why not on-chain?**
- Sessions expire quickly (7 days)
- Writing every login to blockchain = gas costs
- Not critical data (can be regenerated)

### **2. Payment Cache (Performance)**
```sql
CREATE TABLE payment_cache (
  escrowPaymentId INTEGER PRIMARY KEY,
  status TEXT NOT NULL,
  amount TEXT NOT NULL,
  merchantAddress TEXT NOT NULL,
  createdAt TIMESTAMP NOT NULL
);
```

**Why cache?**
- Querying blockchain for "all payments this month" is slow
- Dashboard needs instant load times
- Can rebuild from blockchain events anytime

**Rebuild script:**
```bash
# Delete cache
DROP TABLE payment_cache;

# Rebuild from blockchain events
npx tsx scripts/rebuild-payment-cache.ts

# Scans all PaymentCreated events and recreates cache
```

---

## 🚀 Deployment Steps

### **1. Deploy Smart Contracts**

```bash
cd contracts

# Deploy escrow contract (already done)
npm run deploy:testnet

# Deploy merchant registry
npx hardhat run scripts/deploy-merchant-registry.ts --network kusama-testnet
```

Save both addresses!

### **2. Update Environment**

```bash
# .env
ESCROW_CONTRACT_ADDRESS=0x742d35...
MERCHANT_REGISTRY_ADDRESS=0x8f9a2b...  # New!
```

### **3. Initialize Services**

```typescript
// Backend automatically reads from blockchain
import { merchantRegistryService } from '@/services/merchant-registry.service';

await merchantRegistryService.initialize();

// Now all merchant data comes from blockchain!
```

### **4. Optional: Run Database Migration**

```bash
# Only if you want payment caching
npx prisma migrate deploy
```

---

## 🎨 Frontend Integration

### **React Dashboard Example**

```typescript
import { merchantRegistryService } from '@/lib/merchant-registry';

function MerchantProfile() {
  const { address } = useAccount();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      // Read directly from blockchain!
      const data = await merchantRegistryService.getMerchant(address);
      setProfile(data);
    }
    loadProfile();
  }, [address]);

  async function updateSchedule(newSchedule) {
    // Write to blockchain
    const tx = await merchantRegistryService.updatePayoutPreferences(
      newSchedule,
      profile.minPayoutAmount
    );

    // Wait for confirmation
    await tx.wait();

    // Reload from blockchain
    loadProfile();
  }

  return (
    <div>
      <h1>{profile?.name}</h1>
      <p>Payout Schedule: {profile?.schedule}</p>
      <button onClick={() => updateSchedule('INSTANT')}>
        Switch to Instant Payouts
      </button>
    </div>
  );
}
```

---

## 📊 Benefits of On-Chain Storage

| Aspect | Traditional DB | On-Chain Registry |
|--------|---------------|-------------------|
| **Trust** | Must trust platform | Verify yourself |
| **Censorship** | Platform can delete | Immutable |
| **Downtime** | DB crashes = offline | Always available |
| **Transparency** | Private database | Public, auditable |
| **Portability** | Locked to platform | Own your data |
| **Disaster Recovery** | Backups needed | Blockchain is backup |

---

## 🔍 Verification Example

Any merchant can verify their data:

```bash
# Check your profile on blockchain
npx hardhat run scripts/verify-merchant.ts

# Input: 0x123... (your address)

# Output:
Merchant: Alice's Shop
Payout Schedule: WEEKLY
Min Payout: 10.0 DOT
Total Payments: 42
Total Volume: 523.7 DOT
API Key Hash: 0x742d35...
Webhook Hash: 0x8f9a2b...
Active: true
Created: 2025-10-04
```

---

## 💰 Gas Costs

**One-Time Setup:**
- Register merchant: ~0.001 DOT ($0.005)
- Update profile: ~0.0005 DOT ($0.0025)

**Recurring:**
- None! (unless you update settings)

**vs Database:**
- Database: $10-50/month hosting
- Blockchain: ~$0.10/year updates

---

## 🎯 Complete Web3 Stack

```
┌──────────────────────────────────────┐
│  FRONTEND (React + wagmi)            │
│  - Wallet connect                    │
│  - Sign transactions                 │
│  - No passwords!                     │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│  SMART CONTRACTS (Solidity)          │
│  ├─ PMTEscrow.sol                    │
│  │  └─ Payment escrow logic          │
│  └─ PMTMerchantRegistry.sol          │
│     └─ Merchant profiles             │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│  IPFS (Decentralized Storage)        │
│  └─ Rich merchant metadata           │
│     └─ Logos, descriptions, etc.     │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│  OPTIONAL DATABASE (Performance)     │
│  ├─ Session tokens (temporary)       │
│  └─ Payment cache (rebuil dable)      │
└──────────────────────────────────────┘
```

---

## 🚀 Next Steps

1. **Deploy Merchant Registry Contract**
   ```bash
   cd contracts
   npx hardhat run scripts/deploy-merchant-registry.ts --network kusama-testnet
   ```

2. **Update .env**
   ```bash
   MERCHANT_REGISTRY_ADDRESS=0x...
   ```

3. **Test On-Chain Registration**
   ```bash
   npx tsx scripts/test-merchant-registry.ts
   ```

4. **Build Dashboard UI**
   - Connect wallet button
   - Read profile from blockchain
   - Update preferences via transactions
   - Display stats from on-chain data

---

## 📚 Summary

**We've made your payment gateway FULLY WEB3:**

✅ **No database required** (optional for caching)
✅ **All merchant data on blockchain**
✅ **IPFS for rich metadata**
✅ **Privacy via hashing**
✅ **100% verifiable**
✅ **Permissionless registration**
✅ **Censorship resistant**
✅ **Truly decentralized**

**This is as Web3 as it gets!** 🎉
