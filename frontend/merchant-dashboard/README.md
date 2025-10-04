# 💼 PMT Gateway - Merchant Dashboard

Fully Web3-enabled merchant dashboard for the PMT Gateway payment platform.

## ✨ Features

- 🔐 **Wallet-Based Authentication** - Sign in with MetaMask (SIWE)
- 💰 **Payment History** - View all your payments on-chain
- 📊 **Real-Time Stats** - Payment volume, success rate, pending payouts
- ⚙️ **On-Chain Settings** - All preferences stored on blockchain
- 🌐 **Fully Decentralized** - No passwords, no traditional auth

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```bash
VITE_API_URL=http://localhost:3000/api/v1
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

Get WalletConnect Project ID: https://cloud.walletconnect.com/

### 3. Start Development Server

```bash
npm run dev
```

Dashboard will be available at http://localhost:5173

## 🔑 Authentication Flow

1. **Connect Wallet** - Click "Connect Wallet" button
2. **Sign Message** - Sign SIWE message to prove ownership
3. **Auto-Register** - If first time, merchant account created automatically
4. **Access Dashboard** - View payments, stats, and settings

No passwords. No signup forms. Pure Web3!

## 📱 Pages

### Overview
- Total volume
- Payment statistics
- Quick actions

### Payments
- Complete payment history
- Transaction details
- Block explorer links
- Filter by status

### Settings
- Merchant profile (stored on-chain)
- Payout preferences
- Platform fee configuration
- Wallet management

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│  React + TypeScript + Vite          │
│  ├─ wagmi (Wallet connection)       │
│  ├─ SIWE (Authentication)           │
│  └─ TanStack Query (Data fetching)  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Backend API (Express)              │
│  ├─ Web3 Auth (/api/v1/auth)        │
│  ├─ Payments (/api/v1/payment-intents)│
│  └─ Session Management              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Smart Contracts (Kusama EVM)       │
│  ├─ PMTEscrow (Payment escrow)      │
│  └─ PMTMerchantRegistry (Profiles)  │
└─────────────────────────────────────┘
```

## 🛠️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **wagmi** - Wallet connection
- **SIWE** - Sign-In with Ethereum
- **TanStack Query** - Data fetching
- **Lucide Icons** - Beautiful icons
- **Tailwind CSS** - Styling

## 📦 Project Structure

```
src/
├── components/
│   ├── Dashboard.tsx          # Main dashboard layout
│   ├── WalletConnect.tsx      # Wallet connection UI
│   ├── PaymentHistory.tsx     # Payment table
│   ├── Stats.tsx              # Overview stats
│   └── Settings.tsx           # Merchant settings
├── hooks/
│   └── useAuth.ts             # Authentication hook
├── lib/
│   └── api.ts                 # API client
├── config/
│   └── wagmi.ts               # Wallet config
└── App.tsx                    # Root component
```

## 🔐 Security

- ✅ No passwords stored
- ✅ Wallet signatures for auth
- ✅ Session tokens (7-day expiry)
- ✅ HTTPS required in production
- ✅ CORS configured
- ✅ Rate limiting on API

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

```bash
vercel deploy
```

### Deploy to Netlify

```bash
netlify deploy --prod
```

### Environment Variables (Production)

```bash
VITE_API_URL=https://api.yourgateway.com/api/v1
VITE_WALLETCONNECT_PROJECT_ID=abc123...
```

## 🧪 Testing

```bash
# Run tests
npm test

# Type checking
npm run type-check

# Lint
npm run lint
```

## 📚 Learn More

- [wagmi Documentation](https://wagmi.sh/)
- [SIWE Specification](https://eips.ethereum.org/EIPS/eip-4361)
- [Kusama EVM Guide](https://docs.polkadot.io/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ for the Web3 community**
