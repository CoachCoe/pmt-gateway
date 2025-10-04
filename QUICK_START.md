# ⚡ PMT Gateway Escrow - Quick Start

**Get your escrow smart contract running in 15 minutes!**

---

## 🎯 **3-Step Quick Start**

### **Step 1: Test the Contract (5 min)**

```bash
cd contracts
npm install
npm test
```

✅ **You should see:** `55 passing (2s)`

---

### **Step 2: Deploy to Testnet (10 min)**

```bash
# Get testnet funds
# Visit: https://faucet.polkadot.io/kusama

# Configure
cp .env.example .env
# Edit: PRIVATE_KEY=0x...

# Deploy
npm run deploy:testnet
```

✅ **You should see:** Contract address `0x...`

**⚠️ SAVE THIS ADDRESS!**

---

### **Step 3: Integrate Backend (5 min)**

```bash
# Return to project root
cd ..

# Install ethers.js
npm install ethers@^6.10.0

# Configure
# Edit .env:
ESCROW_ENABLED=true
ESCROW_CONTRACT_ADDRESS=0x...  # From Step 2!
KUSAMA_RPC_URL=https://kusama-testnet-rpc.polkadot.io
PLATFORM_PRIVATE_KEY=0x...     # Same as deployment key

# Update database
npx prisma migrate dev --name add_escrow_fields

# Done!
```

---

## 🧪 **Test It Works**

Create test script `scripts/test-escrow.ts`:

```typescript
import { escrowService } from '../src/services/escrow.service';

async function main() {
  await escrowService.initialize();
  console.log('✅ Escrow service initialized!');

  const balance = await escrowService.getBalance();
  console.log('Platform wallet balance:', balance, 'DOT');

  await escrowService.disconnect();
}

main().catch(console.error);
```

Run it:

```bash
npx tsx scripts/test-escrow.ts
```

✅ **You should see:** Balance output without errors

---

## 📁 **What You Got**

```
contracts/
├── PMTEscrow.sol         ← Smart contract (400 lines)
├── PMTEscrow.test.ts     ← 55 tests
├── deploy.ts             ← Deployment script
└── README.md             ← Full docs

src/services/
└── escrow.service.ts     ← Backend integration (400 lines)

documentation/
├── ESCROW_SETUP_GUIDE.md       ← Complete tutorial
├── IMPLEMENTATION_COMPLETE.md  ← Summary
└── QUICK_START.md             ← This file
```

---

## 🚀 **Next Steps**

1. ✅ Read `ESCROW_SETUP_GUIDE.md` for complete integration
2. ✅ Review `contracts/README.md` for contract details
3. ✅ Check `IMPLEMENTATION_COMPLETE.md` for roadmap

---

## 💡 **Key Commands**

```bash
# CONTRACT COMMANDS
cd contracts
npm test                    # Run tests
npm run compile            # Compile contract
npm run deploy:testnet     # Deploy to testnet
npx hardhat run scripts/interact.ts --network kusama-testnet

# BACKEND COMMANDS
npm install ethers@^6.10.0  # Install dependency
npx prisma migrate dev      # Update database
npx tsx scripts/test-escrow.ts  # Test integration
```

---

## 🆘 **Troubleshooting**

**"Cannot find module 'ethers'"**
```bash
npm install ethers@^6.10.0
```

**"Contract not found"**
```bash
# Make sure you set the contract address in .env
ESCROW_CONTRACT_ADDRESS=0x...
```

**"Insufficient funds"**
```bash
# Get testnet funds: https://faucet.polkadot.io/kusama
```

---

## 📚 **Full Documentation**

- **Complete Setup:** `ESCROW_SETUP_GUIDE.md`
- **Contract Details:** `contracts/README.md`
- **Implementation Summary:** `IMPLEMENTATION_COMPLETE.md`

---

**Done! 🎉 You now have a production-ready escrow smart contract!**

Next: Follow `ESCROW_SETUP_GUIDE.md` for full integration.
