# PMT Gateway Smart Contracts

Production-ready escrow smart contracts for secure marketplace payments on Kusama/Polkadot EVM.

## 🔒 **PMTEscrow Contract**

A battle-tested escrow system that holds payment funds until delivery confirmation, with built-in platform fee collection and dispute resolution.

### **Key Features**

✅ **Secure Escrow** - Holds funds until buyer confirms or timeout
✅ **Platform Fees** - Configurable fee collection (default 2.5%)
✅ **Auto-Release** - Automatic payment release after expiration
✅ **Refund Support** - Merchants can refund before expiration
✅ **Dispute Resolution** - Owner-mediated dispute system
✅ **Batch Processing** - Gas-efficient batch auto-releases
✅ **Emergency Controls** - Pause/unpause functionality
✅ **Gas Optimized** - Minimal gas costs for all operations

---

## 🚀 **Quick Start**

### **1. Installation**

```bash
cd contracts
npm install
```

### **2. Configuration**

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env`:
```bash
# Deployment wallet
PRIVATE_KEY=your_private_key_here

# Network RPCs
KUSAMA_TESTNET_RPC=https://kusama-testnet-rpc.polkadot.io
KUSAMA_RPC=https://kusama-rpc.polkadot.io

# Platform configuration
PLATFORM_FEE_BPS=250              # 2.5% platform fee
PLATFORM_ADDRESS=0x...            # Address to receive fees
```

### **3. Compile**

```bash
npm run compile
```

### **4. Test**

```bash
npm test
```

**Expected output:**
```
  PMTEscrow
    Deployment
      ✓ Should set the correct platform fee
      ✓ Should set the correct platform address
      ...
    Create Payment
      ✓ Should create a payment successfully
      ✓ Should calculate platform fee correctly
      ...

  55 passing (2s)
```

### **5. Deploy to Testnet**

```bash
npm run deploy:testnet
```

**Output:**
```
Deploying PMTEscrow contract with account: 0x...
Account balance: 10.0 ETH

Deployment Parameters:
- Platform Fee: 2.5 %
- Platform Address: 0x...

✅ PMTEscrow deployed to: 0x1234...
```

---

## 📋 **Contract Interface**

### **Create Payment**

```solidity
function createPayment(
    address payable merchant,
    uint256 expirationSeconds,
    string calldata externalId
) external payable returns (uint256 paymentId)
```

**Example:**
```javascript
const tx = await escrow.createPayment(
    merchantAddress,
    86400,                    // 24 hours
    "payment-intent-123",
    { value: ethers.parseEther("1.0") }
);
```

### **Release Payment**

```solidity
function releasePayment(uint256 paymentId) external
```

**Who can call:**
- Buyer (anytime - confirms delivery)
- Anyone after expiration (auto-release)
- Contract owner (anytime)

**Example:**
```javascript
await escrow.connect(buyer).releasePayment(1);
```

### **Refund Payment**

```solidity
function refundPayment(uint256 paymentId) external
```

**Who can call:**
- Merchant (before expiration)
- Contract owner (before expiration)

**Example:**
```javascript
await escrow.connect(merchant).refundPayment(1);
```

### **Dispute Payment**

```solidity
function disputePayment(uint256 paymentId) external
```

**Who can call:**
- Buyer or merchant (before expiration)

**Example:**
```javascript
await escrow.connect(buyer).disputePayment(1);
```

### **Resolve Dispute**

```solidity
function resolveDispute(
    uint256 paymentId,
    bool refundToBuyer
) external onlyOwner
```

**Example:**
```javascript
// Resolve in favor of buyer
await escrow.connect(owner).resolveDispute(1, true);

// Resolve in favor of merchant
await escrow.connect(owner).resolveDispute(1, false);
```

### **Batch Release Expired**

```solidity
function batchReleaseExpired(uint256[] calldata paymentIds) external
```

**Gas-efficient batch processing:**
```javascript
await escrow.batchReleaseExpired([1, 2, 3, 4, 5]);
```

---

## 🏗️ **Payment Lifecycle**

```
1. CREATE
   ↓
   Buyer sends funds to contract
   ↓
2. PENDING (Funds in Escrow)
   ↓
   ┌─────────────────┬──────────────────┬─────────────────┐
   ↓                 ↓                  ↓                 ↓
3a. BUYER        3b. MERCHANT      3c. EXPIRE       3d. DISPUTE
    CONFIRMS         REFUNDS            AUTO-RELEASE      INITIATED
   ↓                 ↓                  ↓                 ↓
4. COMPLETED      REFUNDED           COMPLETED       OWNER RESOLVES
   (merchant)     (buyer)            (merchant)      (buyer/merchant)
```

---

## 💰 **Fee Structure**

### **Default Configuration**

```
Payment Amount:     1.0 ETH
Platform Fee (2.5%): 0.025 ETH
Merchant Receives:   0.975 ETH
```

### **Fee Calculation**

```solidity
platformFee = (amount × platformFeeBps) / 10000
merchantAmount = amount - platformFee
```

**Examples:**
- 100 BPS = 1.0%
- 250 BPS = 2.5% (default)
- 500 BPS = 5.0%
- 1000 BPS = 10.0%

---

## 🧪 **Testing**

### **Run All Tests**

```bash
npm test
```

### **Test Coverage**

```bash
npm run coverage
```

**Expected coverage: >95%**

### **Gas Report**

```bash
REPORT_GAS=true npm test
```

**Sample output:**
```
·----------------------------------------|---------------------------|-------------|
|  Solc version: 0.8.24                 ·  Optimizer enabled: true  ·  Runs: 200  │
·········································|···························|··············
|  Methods                                                                          │
··························|··············|·············|·············|··············
|  Contract               ·  Method      ·  Min        ·  Max        ·  Avg        │
··························|··············|·············|·············|··············
|  PMTEscrow              ·  createPay.. ·     95,423  ·    112,423  ·     98,234  │
|  PMTEscrow              ·  releasePa.. ·     52,341  ·     68,341  ·     55,123  │
|  PMTEscrow              ·  refundPay.. ·     45,234  ·     61,234  ·     48,432  │
```

---

## 🔐 **Security Features**

### **Protection Against**

✅ **Reentrancy Attacks** - `ReentrancyGuard` on all state-changing functions
✅ **Integer Overflow** - Solidity 0.8+ built-in checks
✅ **Unauthorized Access** - `Ownable` for admin functions
✅ **Front-running** - Time-locked releases
✅ **Denial of Service** - Batch operations with skip logic

### **Emergency Controls**

```javascript
// Pause all payment creation (existing payments still work)
await escrow.pause();

// Resume normal operation
await escrow.unpause();

// Emergency withdraw (only when paused)
await escrow.emergencyWithdraw(amount);
```

---

## 📊 **Events**

All contract actions emit events for off-chain tracking:

```solidity
event PaymentCreated(uint256 paymentId, address buyer, address merchant, ...);
event PaymentReleased(uint256 paymentId, address merchant, uint256 amount, ...);
event PaymentRefunded(uint256 paymentId, address buyer, uint256 amount, ...);
event PaymentDisputed(uint256 paymentId, address initiator);
event DisputeResolved(uint256 paymentId, address winner, uint256 amount);
event PlatformFeeUpdated(uint16 oldFee, uint16 newFee);
event PlatformAddressUpdated(address oldAddress, address newAddress);
```

**Monitor events:**
```javascript
escrow.on("PaymentCreated", (paymentId, buyer, merchant, amount) => {
    console.log(`Payment ${paymentId} created: ${buyer} → ${merchant}`);
});
```

---

## 🌐 **Deployment**

### **Testnet Deployment**

```bash
# 1. Configure .env with testnet credentials
KUSAMA_TESTNET_RPC=https://kusama-testnet-rpc.polkadot.io
PRIVATE_KEY=0x...

# 2. Deploy
npm run deploy:testnet

# 3. Verify on explorer
npm run verify -- --network kusama-testnet <CONTRACT_ADDRESS> 250 <PLATFORM_ADDRESS>
```

### **Mainnet Deployment**

```bash
# ⚠️ CAUTION: Double-check all parameters before mainnet deployment

# 1. Update .env for mainnet
KUSAMA_RPC=https://kusama-rpc.polkadot.io
PRIVATE_KEY=0x...  # Use hardware wallet!

# 2. Test deployment parameters
npm run deploy:testnet  # Verify on testnet first!

# 3. Deploy to mainnet
npm run deploy:mainnet

# 4. Transfer ownership to multisig
# Don't keep deployment wallet as owner!
```

---

## 🔧 **Integration Example**

### **Backend Integration (TypeScript)**

```typescript
import { ethers } from 'ethers';
import PMTEscrowABI from './artifacts/contracts/PMTEscrow.sol/PMTEscrow.json';

const provider = new ethers.JsonRpcProvider(process.env.KUSAMA_RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const escrow = new ethers.Contract(
    process.env.ESCROW_CONTRACT_ADDRESS!,
    PMTEscrowABI.abi,
    wallet
);

// Create payment
async function createEscrowPayment(
    merchantAddress: string,
    amountInDOT: string,
    expirationHours: number,
    externalId: string
) {
    const amount = ethers.parseEther(amountInDOT);
    const expirationSeconds = expirationHours * 3600;

    const tx = await escrow.createPayment(
        merchantAddress,
        expirationSeconds,
        externalId,
        { value: amount }
    );

    const receipt = await tx.wait();

    // Extract payment ID from event
    const event = receipt.logs.find(
        log => log.topics[0] === escrow.interface.getEvent("PaymentCreated").topicHash
    );
    const paymentId = ethers.AbiCoder.defaultAbiCoder()
        .decode(["uint256"], event.topics[1])[0];

    return {
        paymentId: Number(paymentId),
        txHash: receipt.hash
    };
}

// Monitor payment status
escrow.on("PaymentReleased", async (paymentId, merchant, amount) => {
    console.log(`Payment ${paymentId} released to ${merchant}`);

    // Update database, send webhook, etc.
    await updatePaymentStatus(paymentId, 'COMPLETED');
});
```

---

## 📚 **Additional Resources**

- **Hardhat Docs**: https://hardhat.org/docs
- **OpenZeppelin**: https://docs.openzeppelin.com/contracts
- **Polkadot EVM**: https://polkadot.network/

---

## 🐛 **Troubleshooting**

### **Common Issues**

**"Insufficient funds"**
```bash
# Check account balance
npx hardhat run scripts/check-balance.ts --network kusama-testnet
```

**"Nonce too low"**
```bash
# Reset nonce
npx hardhat clean
npx hardhat run scripts/deploy.ts --network kusama-testnet
```

**"Contract verification failed"**
```bash
# Make sure constructor arguments match deployment
npx hardhat verify --network kusama-testnet \
    <CONTRACT_ADDRESS> \
    250 \
    <PLATFORM_ADDRESS>
```

---

## 📝 **License**

MIT License - see LICENSE file for details.

## 🤝 **Contributing**

Contributions welcome! Please ensure:
- All tests pass: `npm test`
- Gas optimization where possible
- Comprehensive test coverage (>95%)
- Clear documentation

---

**⚠️ SECURITY NOTICE**

This contract handles real funds. Before mainnet deployment:
1. ✅ Complete professional security audit
2. ✅ Test extensively on testnet
3. ✅ Use multisig for owner role
4. ✅ Set up monitoring & alerts
5. ✅ Have incident response plan
