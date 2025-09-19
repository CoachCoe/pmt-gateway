# Polkadot SSO Integration

The PMT Gateway now integrates with the [Polkadot SSO system](https://github.com/CoachCoe/polkadot-sso) to provide enhanced authentication capabilities, multi-chain support, and improved security.

## Features

### 🔐 Enhanced Authentication
- **SIWE-style Authentication**: Secure message signing with structured data
- **Multi-Chain Support**: Polkadot, Kusama, and custom parachains
- **Session Management**: Database-backed sessions with refresh/revoke capabilities
- **Security Features**: Nonce validation, domain binding, request tracking

### 🌐 Multi-Wallet Support
- **Polkadot.js**: Browser extension
- **Talisman**: Advanced wallet with portfolio features
- **SubWallet**: Multi-chain wallet
- **Nova Wallet**: Mobile-first wallet

### ⛓️ Multi-Chain Support
- **Polkadot**: Main network (DOT)
- **Kusama**: Canary network (KSM)
- **Custom Parachains**: Configurable RPC endpoints

## Backend Integration

### Service Layer

The `PolkadotSSOService` provides the core integration:

```typescript
import { polkadotSSOService } from '@/services/polkadot-sso.service';

// Initialize with configuration
const auth = polkadotSSOService;

// Create challenge
const challenge = await auth.createChallenge(address, chainId);

// Verify signature
const result = await auth.verifySignature(challenge, signature, address);

// Create session
const session = await auth.createSession({
  address,
  chainId,
  walletType,
  merchantId
});
```

### API Endpoints

#### Get Supported Chains
```http
GET /api/v1/wallet/chains
```

Response:
```json
{
  "success": true,
  "data": {
    "chains": [
      {
        "id": "polkadot",
        "name": "Polkadot",
        "rpcUrl": "wss://rpc.polkadot.io",
        "ss58Format": 0,
        "decimals": 10,
        "symbol": "DOT"
      }
    ]
  }
}
```

#### Generate Challenge (Enhanced)
```http
POST /api/v1/wallet/challenge
Content-Type: application/json

{
  "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "chainId": "polkadot"
}
```

#### Verify Authentication (Enhanced)
```http
POST /api/v1/wallet/verify
Content-Type: application/json

{
  "signature": "0x...",
  "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "challenge": {
    "message": "polkadot-auth.localhost wants you to sign in...",
    "nonce": "a1b2c3d4e5f6...",
    "timestamp": 1640995200000
  },
  "merchantId": "merchant_123",
  "chainId": "polkadot"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "wallet_5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY_session_123",
    "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "merchantId": "merchant_123",
    "sessionId": "session_123",
    "walletType": "polkadot-js"
  }
}
```

#### Session Management
```http
# Refresh session
POST /api/v1/wallet/refresh
{
  "sessionId": "session_123"
}

# Revoke session
POST /api/v1/wallet/revoke
{
  "sessionId": "session_123"
}
```

## Frontend SDK Integration

### Enhanced API Client

The SDK now supports multi-chain authentication:

```javascript
import { PMTGateway } from '@pmt-gateway/sdk';

const pmt = PMTGateway.create({
  publicKey: 'pk_test_your_api_key_here',
  environment: 'test'
});

// Get supported chains
const chains = await pmt.getSupportedChains();

// Connect wallet with specific chain
const connection = await pmt.connectWallet('polkadot-js');

// Authenticate with specific chain
const token = await pmt.authenticateWallet('merchant_123', 'polkadot');
```

### Payment Widget with Chain Selection

```javascript
const widget = pmt.createPaymentWidget({
  container: '#payment-widget',
  paymentIntent: paymentIntent,
  chainId: 'polkadot', // Optional: specify chain
  onSuccess: (event) => {
    console.log('Payment successful:', event);
  },
  onError: (error) => {
    console.error('Payment failed:', error);
  }
});
```

## Configuration

### Environment Variables

```bash
# Polkadot SSO Configuration
POLKADOT_AUTH_SECRET=your-secret-key
POLKADOT_AUTH_URL=http://localhost:3000
POLKADOT_DEFAULT_CHAIN=polkadot

# Database for session storage
DATABASE_URL=postgresql://user:password@localhost:5432/pmt_gateway

# CORS configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Advanced Configuration

```typescript
const auth = createPolkadotAuth({
  // Chain configuration
  defaultChain: 'polkadot',
  chains: [
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

  // Wallet providers
  providers: ['polkadot-js', 'talisman', 'subwallet', 'nova-wallet'],

  // Session management
  session: {
    strategy: 'database',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    databaseUrl: process.env.DATABASE_URL,
  },

  // Security settings
  security: {
    enableNonce: true,
    enableDomainBinding: true,
    enableRequestTracking: true,
    challengeExpiration: 5 * 60, // 5 minutes
    allowedDomains: process.env.CORS_ALLOWED_ORIGINS?.split(','),
  },
});
```

## Security Features

### SIWE-style Message Format

The authentication uses a structured message format similar to Sign-In with Ethereum:

```
polkadot-auth.localhost wants you to sign in with your Polkadot account:
5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY

Sign this message to authenticate with PMT Gateway

URI: http://localhost:3000
Version: 1
Chain ID: polkadot
Nonce: a1b2c3d4e5f6...
Issued At: 2024-01-24T18:30:00.000Z
Expiration Time: 2024-01-24T18:35:00.000Z
Request ID: 12345678-1234-1234-1234-123456789abc
Resources:
- https://polkadot-auth.localhost/credentials
- https://polkadot-auth.localhost/profile
```

### Security Measures

1. **Nonce Validation**: Each challenge includes a unique nonce
2. **Domain Binding**: Messages are bound to specific domains
3. **Request Tracking**: All authentication requests are tracked
4. **Challenge Expiration**: Challenges expire after 5 minutes
5. **Session Management**: Secure session creation and validation

## Migration Guide

### From Basic Wallet Auth

1. **Update Dependencies**:
   ```bash
   npm install @polkadot-auth/core @polkadot-auth/express
   ```

2. **Update Service Calls**:
   ```typescript
   // Before
   const challenge = walletAuthService.generateChallenge(address);
   
   // After
   const challenge = await walletAuthService.generateChallenge(address, 'polkadot');
   ```

3. **Update API Calls**:
   ```typescript
   // Before
   const response = await apiClient.verifyWalletAuth({
     signature,
     address,
     challenge,
     merchantId
   });
   
   // After
   const response = await apiClient.verifyWalletAuth({
     signature,
     address,
     challenge,
     merchantId,
     chainId: 'polkadot'
   });
   ```

## Benefits

### For Developers
- **Simplified Integration**: Single SDK for multi-chain authentication
- **Enhanced Security**: SIWE-style authentication with proper validation
- **Better UX**: Seamless wallet connection and authentication flow
- **Multi-Chain Support**: Support for multiple Polkadot parachains

### For Merchants
- **Broader Reach**: Support for multiple chains and wallets
- **Enhanced Security**: Enterprise-grade authentication
- **Better Analytics**: Detailed session and authentication tracking
- **Future-Proof**: Easy to add new chains and wallets

### For Users
- **Familiar Experience**: Standard wallet connection flow
- **Multi-Chain**: Use any supported Polkadot chain
- **Secure**: Industry-standard authentication methods
- **Fast**: Optimized authentication flow

## Troubleshooting

### Common Issues

1. **Wallet Not Detected**:
   - Ensure wallet extension is installed and enabled
   - Check browser permissions
   - Verify wallet is unlocked

2. **Chain Not Supported**:
   - Check if chain is configured in the service
   - Verify RPC endpoint is accessible
   - Ensure proper chain configuration

3. **Authentication Failed**:
   - Verify signature is correct
   - Check if challenge has expired
   - Ensure proper message format

### Debug Mode

Enable debug logging:

```typescript
const pmt = PMTGateway.create({
  publicKey: 'pk_test_your_api_key_here',
  environment: 'test',
  debug: true // Enable debug logging
});
```

## Support

For issues related to Polkadot SSO integration:

1. Check the [Polkadot SSO documentation](https://github.com/CoachCoe/polkadot-sso)
2. Review the PMT Gateway logs
3. Contact support with detailed error information

## Roadmap

### Phase 1: Core Integration ✅
- Basic SSO integration
- Multi-chain support
- Enhanced authentication

### Phase 2: Advanced Features 📋
- Custom wallet providers
- Advanced session management
- Analytics and monitoring

### Phase 3: Enterprise Features 📋
- OpenID Connect provider
- Advanced audit trails
- Professional support
