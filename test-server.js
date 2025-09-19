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

// Mock auth endpoints for dashboard
app.get('/api/v1/auth/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'merchant_123',
      name: 'Test Merchant',
      email: 'merchant@example.com',
      apiKey: 'pk_test_1234567890',
      webhookUrl: 'https://example.com/webhook',
      createdAt: new Date().toISOString(),
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'test',
    },
  });
});

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock login - always succeeds for demo
  res.json({
    success: true,
    data: {
      token: 'mock_jwt_token_12345',
      user: {
        id: 'merchant_123',
        name: 'Test Merchant',
        email: email || 'merchant@example.com',
        apiKey: 'pk_test_1234567890',
        webhookUrl: 'https://example.com/webhook',
        createdAt: new Date().toISOString(),
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'test',
    },
  });
});

// Also keep the old profile endpoint for compatibility
app.get('/api/v1/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'merchant_123',
      name: 'Test Merchant',
      email: 'merchant@example.com',
      apiKey: 'pk_test_1234567890',
      webhookUrl: 'https://example.com/webhook',
      createdAt: new Date().toISOString(),
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'test',
    },
  });
});

// Mock dashboard stats
app.get('/api/v1/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalPayments: 42,
      totalVolume: 1250.75,
      successRate: 94.2,
      pendingPayments: 3,
      recentPayments: [
        {
          id: 'pi_123',
          amount: 25.50,
          currency: 'USD',
          status: 'succeeded',
          createdAt: new Date().toISOString(),
        },
      ],
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'test',
    },
  });
});

// Mock payment intents
app.get('/api/v1/payment-intents', (req, res) => {
  res.json({
    success: true,
    data: {
      payments: [
        {
          id: 'pi_123',
          amount: 25.50,
          currency: 'USD',
          status: 'succeeded',
          merchantId: 'merchant_123',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'pi_124',
          amount: 100.00,
          currency: 'USD',
          status: 'pending',
          merchantId: 'merchant_123',
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'test',
    },
  });
});

// Mock webhook events endpoint
app.get('/api/v1/webhooks/events', (req, res) => {
  res.json({
    success: true,
    data: {
      events: [
        {
          id: 'evt_123',
          type: 'payment.succeeded',
          paymentId: 'pi_123',
          status: 'delivered',
          createdAt: new Date().toISOString(),
          attempts: 1,
          lastAttemptAt: new Date().toISOString(),
        },
        {
          id: 'evt_124',
          type: 'payment.failed',
          paymentId: 'pi_124',
          status: 'pending',
          createdAt: new Date().toISOString(),
          attempts: 0,
          lastAttemptAt: null,
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'test',
    },
  });
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
