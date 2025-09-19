#!/usr/bin/env node

// Simple test server without database dependencies
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock Polkadot SSO service
const mockSSOService = {
  getSupportedWallets: () => [
    {
      id: 'polkadot-js',
      name: 'Polkadot.js',
      icon: 'polkadot-js',
      downloadUrl: 'https://polkadot.js.org/extension/',
    },
    {
      id: 'talisman',
      name: 'Talisman',
      icon: 'talisman',
      downloadUrl: 'https://talisman.xyz/',
    },
    {
      id: 'subwallet',
      name: 'SubWallet',
      icon: 'subwallet',
      downloadUrl: 'https://subwallet.app/',
    },
    {
      id: 'nova-wallet',
      name: 'Nova Wallet',
      icon: 'nova-wallet',
      downloadUrl: 'https://novawallet.io/',
    },
  ],
  
  getSupportedChains: () => [
    {
      id: 'polkadot',
      name: 'Polkadot',
      rpcUrl: 'wss://rpc.polkadot.io',
      ss58Format: 0,
      decimals: 10,
      symbol: 'DOT',
    },
    {
      id: 'kusama',
      name: 'Kusama',
      rpcUrl: 'wss://kusama-rpc.polkadot.io',
      ss58Format: 2,
      decimals: 12,
      symbol: 'KSM',
    },
  ],
  
  createChallenge: (address, chainId = 'polkadot') => {
    const nonce = Math.random().toString(36).substring(7);
    const timestamp = Date.now();
    const message = `polkadot-auth.localhost wants you to sign in with your Polkadot account:
${address}

Sign this message to authenticate with PMT Gateway

URI: http://localhost:3000
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${new Date(timestamp).toISOString()}
Expiration Time: ${new Date(timestamp + 5 * 60 * 1000).toISOString()}
Request ID: ${Math.random().toString(36).substring(7)}
Resources:
- http://localhost:3000/credentials
- http://localhost:3000/profile`;

    return {
      message,
      nonce,
      issuedAt: timestamp,
      expiresAt: timestamp + 5 * 60 * 1000,
    };
  }
};

// Routes
app.get('/api/v1/wallet/wallets', (req, res) => {
  res.json({
    success: true,
    data: { wallets: mockSSOService.getSupportedWallets() },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'test',
    },
  });
});

app.get('/api/v1/wallet/chains', (req, res) => {
  res.json({
    success: true,
    data: { chains: mockSSOService.getSupportedChains() },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'test',
    },
  });
});

app.post('/api/v1/wallet/challenge', (req, res) => {
  const { address, chainId = 'polkadot' } = req.body;
  
  if (!address) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_ADDRESS', message: 'Address is required' },
    });
  }
  
  const challenge = mockSSOService.createChallenge(address, chainId);
  
  res.json({
    success: true,
    data: { challenge },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'test',
    },
  });
});

app.get('/auth/signin', (req, res) => {
  res.json({ message: 'SSO Sign In endpoint' });
});

app.post('/auth/signout', (req, res) => {
  res.json({ message: 'SSO Sign Out endpoint' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('  GET  /health - Health check');
  console.log('  GET  /api/v1/wallet/wallets - Get supported wallets');
  console.log('  GET  /api/v1/wallet/chains - Get supported chains');
  console.log('  POST /api/v1/wallet/challenge - Generate auth challenge');
  console.log('  GET  /auth/signin - SSO sign in');
  console.log('  POST /auth/signout - SSO sign out');
});
