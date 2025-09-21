// Integration with polkadot-sso repository
// Using source code directly since packages are not built yet
import logger from '@/utils/logger';
import { 
  generateSecureSessionId, 
  generateSecureNonce, 
  generateSecureChallengeId 
} from '@/utils/crypto.utils';

export class PolkadotSSOService {

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth() {
    try {
      logger.info('Polkadot SSO service initialized with polkadot-sso integration');
    } catch (error) {
      logger.error('Failed to initialize Polkadot SSO service:', error);
      throw error;
    }
  }

  // Get Express middleware
  getMiddleware() {
    const express = require('express');
    const router = express.Router();
    
    // Challenge endpoint
    router.get('/challenge', async (req: any, res: any) => {
      try {
        const { client_id, address, chain_id } = req.query;

        // Input validation
        if (!client_id || typeof client_id !== 'string') {
          return res.status(400).json({ 
            success: false,
            error: {
              code: 'INVALID_CLIENT_ID',
              message: 'Valid client_id is required'
            }
          });
        }

        if (address && !this.validateAddress(address)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_ADDRESS',
              message: 'Invalid Polkadot address format'
            }
          });
        }

        const challenge = this._createChallenge(address, chain_id || 'polkadot');
        
        res.json({
          success: true,
          data: {
            challenge: challenge.message,
            challenge_id: challenge.id,
            nonce: challenge.nonce,
            expires_at: challenge.expiresAt,
          }
        });
      } catch (error) {
        logger.error('Error creating challenge:', error);
        res.status(500).json({ 
          success: false,
          error: {
            code: 'CHALLENGE_CREATION_FAILED',
            message: 'Failed to create challenge'
          }
        });
      }
    });

    // Verify endpoint
    router.post('/verify', async (req: any, res: any) => {
      try {
        const { challenge_id, signature, address, message } = req.body;

        // Input validation
        if (!challenge_id || typeof challenge_id !== 'string') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_CHALLENGE_ID',
              message: 'Valid challenge_id is required'
            }
          });
        }

        if (!signature || typeof signature !== 'string') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_SIGNATURE',
              message: 'Valid signature is required'
            }
          });
        }

        if (!address || !this.validateAddress(address)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_ADDRESS',
              message: 'Valid Polkadot address is required'
            }
          });
        }

        if (!message || typeof message !== 'string') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_MESSAGE',
              message: 'Valid message is required'
            }
          });
        }

        const result = this._verifySignature(signature, { message, id: challenge_id }, address);
        
        if (result.valid) {
          res.json({
            success: true,
            data: {
              message: 'Authentication successful',
              session: {
                id: result.sessionId,
                address: address,
                accessToken: this.generateSecureSessionId(),
              },
            }
          });
        } else {
          res.status(401).json({ 
            success: false,
            error: {
              code: 'INVALID_SIGNATURE',
              message: 'Signature verification failed'
            }
          });
        }
      } catch (error) {
        logger.error('Error verifying signature:', error);
        res.status(500).json({ 
          success: false,
          error: {
            code: 'SIGNATURE_VERIFICATION_FAILED',
            message: 'Failed to verify signature'
          }
        });
      }
    });

    // Sign in endpoint
    router.get('/signin', async (_req: any, res: any) => {
      const providers = await this._getSupportedWallets();
      const chains = await this._getSupportedChains();

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Sign in with Polkadot</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
              .provider { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; cursor: pointer; }
              .provider:hover { background-color: #f5f5f5; }
              .chain-select { margin: 10px 0; }
              select { padding: 5px; margin: 5px; }
            </style>
          </head>
          <body>
            <h1>Sign in with Polkadot</h1>

            <div class="chain-select">
              <label>Select Chain:</label>
              <select id="chainSelect">
                ${chains.map((chain: any) => `<option value="${chain.id}">${chain.name}</option>`).join('')}
              </select>
            </div>

            <h2>Available Wallets:</h2>
            <div id="walletStatus" style="margin: 10px 0; padding: 10px; background: #f0f0f0; border-radius: 5px; font-size: 14px;">
              <div>Checking wallet availability...</div>
            </div>
            ${providers
              .map(
                (provider: any) => `
              <div class="provider" onclick="connectWallet('${provider.id}')" id="provider-${provider.id}">
                <strong>${provider.name}</strong>
                ${provider.description ? `<br><small>${provider.description}</small>` : ''}
                <div id="status-${provider.id}" style="margin-top: 5px; font-size: 12px; color: #666;">Checking...</div>
              </div>
            `
              )
              .join('')}

            <script>
              // Check if Polkadot.js extension is available
              function isPolkadotJsAvailable() {
                return typeof window !== 'undefined' && window.injectedWeb3 && window.injectedWeb3['polkadot-js'];
              }

              // Check if PAPI is available
              function isPAPIAvailable() {
                return typeof window !== 'undefined' && window.papi;
              }

              async function connectWallet(providerId) {
                try {
                  const chainId = document.getElementById('chainSelect').value;
                  
                  // Check if wallet is available
                  if (providerId === 'polkadot-js' && !isPolkadotJsAvailable()) {
                    alert('Polkadot.js extension not found. Please install it from https://polkadot.js.org/extension/');
                    return;
                  }
                  
                  if (providerId === 'papi' && !isPAPIAvailable()) {
                    alert('PAPI wallet not found. Please install it or use Polkadot.js extension.');
                    return;
                  }

                  // Get challenge
                  const challengeResponse = await fetch('/auth/challenge?client_id=pmt-gateway&chain_id=' + chainId);
                  const challengeData = await challengeResponse.json();

                  if (!challengeData.challenge) {
                    alert('Failed to get challenge');
                    return;
                  }

                  console.log('Connecting to', providerId);
                  console.log('Challenge:', challengeData.challenge);

                  // Connect to wallet and get accounts
                  let accounts = [];
                  
                  if (providerId === 'polkadot-js') {
                    const extension = window.injectedWeb3['polkadot-js'];
                    const injected = await extension.enable('PMT Gateway');
                    const accountsApi = await injected.accounts.get();
                    accounts = accountsApi;
                  } else if (providerId === 'papi') {
                    // PAPI integration would go here
                    console.log('PAPI integration not yet implemented');
                    alert('PAPI integration coming soon. Please use Polkadot.js extension for now.');
                    return;
                  }

                  if (accounts.length === 0) {
                    alert('No accounts found. Please create an account in your wallet first.');
                    return;
                  }

                  // Let user select account
                  const accountAddress = accounts[0].address;
                  console.log('Selected account:', accountAddress);

                  // Sign the challenge message
                  try {
                    // Get the signer from the extension
                    const extension = window.injectedWeb3['polkadot-js'];
                    const injected = await extension.enable('PMT Gateway');
                    
                    // Debug: Log available methods
                    console.log('Available methods:', Object.keys(injected));
                    console.log('Signer methods:', injected.signer ? Object.keys(injected.signer) : 'No signer');
                    console.log('Accounts methods:', injected.accounts ? Object.keys(injected.accounts) : 'No accounts');
                    
                    // Try different signing methods
                    let signature;
                    
                    if (injected.signer && injected.signer.signRaw) {
                      // Method 1: Use signer.signRaw
                      signature = await injected.signer.signRaw({
                        address: accountAddress,
                        data: challengeData.challenge,
                      });
                    } else if (injected.accounts && injected.accounts.signRaw) {
                      // Method 2: Use accounts.signRaw
                      signature = await injected.accounts.signRaw({
                        address: accountAddress,
                        data: challengeData.challenge,
                      });
                    } else {
                      throw new Error('No signing method available in this extension version');
                    }
                    
                    console.log('Signature created:', signature.signature);
                    
                    // Send signature to server for verification
                    const verifyResponse = await fetch('/auth/verify', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        challenge_id: challengeData.challenge_id,
                        signature: signature.signature,
                        address: accountAddress,
                        message: challengeData.challenge,
                      }),
                    });
                    
                    const verifyResult = await verifyResponse.json();
                    
                    if (verifyResult.success) {
                      alert('🎉 Authentication successful!\\n\\nAccount: ' + accountAddress + '\\nSession: ' + verifyResult.session.id + '\\n\\nYou are now signed in!');
                      
                      // In a real app, you would redirect or update UI here
                      console.log('Authentication complete:', verifyResult);
                    } else {
                      alert('❌ Authentication failed: ' + verifyResult.error);
                    }
                    
                  } catch (signError) {
                    console.error('Signing error:', signError);
                    alert('❌ Failed to sign message: ' + signError.message);
                  }

                } catch (error) {
                  console.error('Error:', error);
                  alert('Failed to connect wallet: ' + error.message);
                }
              }

              // Show wallet availability status
              window.addEventListener('load', function() {
                const polkadotJsStatus = isPolkadotJsAvailable() ? '✅ Available' : '❌ Not installed';
                const papiStatus = isPAPIAvailable() ? '✅ Available' : '❌ Not available';
                
                // Update status display
                const statusDiv = document.getElementById('walletStatus');
                const polkadotJsStatusDiv = document.getElementById('status-polkadot-js');
                const papiStatusDiv = document.getElementById('status-papi');
                
                if (statusDiv) {
                  statusDiv.innerHTML = \`Polkadot.js: \${polkadotJsStatus} | PAPI: \${papiStatus}\`;
                }
                
                if (polkadotJsStatusDiv) {
                  polkadotJsStatusDiv.textContent = polkadotJsStatus;
                  polkadotJsStatusDiv.style.color = isPolkadotJsAvailable() ? '#28a745' : '#dc3545';
                }
                
                if (papiStatusDiv) {
                  papiStatusDiv.textContent = papiStatus;
                  papiStatusDiv.style.color = isPAPIAvailable() ? '#28a745' : '#dc3545';
                }
                
                console.log('Polkadot.js Extension:', polkadotJsStatus);
                console.log('PAPI Wallet:', papiStatus);
              });
            </script>
          </body>
        </html>
      `);
    });

    // Sign out endpoint
    router.post('/signout', async (_req: any, res: any) => {
      try {
        res.json({ success: true, message: 'Signed out successfully' });
      } catch (error) {
        logger.error('Error signing out:', error);
        res.status(500).json({ error: 'Failed to sign out' });
      }
    });

    return router;
  }

  // Create a challenge for wallet authentication
  _createChallenge(address?: string, chainId: string = 'polkadot'): any {
    const nonce = generateSecureNonce();
    const challengeId = generateSecureChallengeId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    const message = `Sign this message to authenticate with Polkadot SSO

Client: pmt-gateway
Address: ${address || '0x...'}
Chain: ${chainId}
Nonce: ${nonce}
Issued At: ${now.toISOString()}
Expiration Time: ${expiresAt.toISOString()}`;

    return {
      message,
      id: challengeId,
      nonce,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      chainId,
    };
  }

  // Verify a signature against a challenge
  _verifySignature(signature: string, challenge: any, address: string): any {
    try {
      if (!signature || !challenge || !address) {
        return { valid: false, walletType: null, sessionId: null };
      }

      // Use proper cryptographic verification
      const isValid = this.verifyPolkadotSignature(
        challenge.message,
        signature,
        address
      );
      
      return {
        valid: isValid,
        walletType: 'polkadot-js',
        sessionId: isValid ? this.generateSecureSessionId() : null,
      };
    } catch (error) {
      logger.error('Failed to verify signature:', error);
      return { valid: false, walletType: null, sessionId: null };
    }
  }

  // Proper cryptographic signature verification
  private verifyPolkadotSignature(message: string, signature: string, address: string): boolean {
    try {
      const { blake2AsU8a } = require('@polkadot/util-crypto');
      const { Keyring } = require('@polkadot/keyring');
      
      // Convert message to bytes
      const messageBytes = new TextEncoder().encode(message);
      
      // Hash the message
      const messageHash = blake2AsU8a(messageBytes, 256);
      
      // Convert signature from hex to bytes
      const signatureBytes = this.hexToU8a(signature);
      
      // Get the public key from the address
      const keyring = new Keyring({ type: 'sr25519' });
      const publicKey = keyring.decodeAddress(address);
      
      // Verify the signature using crypto
      const isValid = this.verifySignatureWithCrypto(messageHash, signatureBytes, publicKey);
      
      return isValid;

    } catch (error) {
      logger.error('Polkadot signature verification error:', {
        address,
        error,
      });
      return false;
    }
  }

  private verifySignatureWithCrypto(
    messageHash: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array
  ): boolean {
    try {
      const { sr25519Verify } = require('@polkadot/util-crypto');
      return sr25519Verify(signature, messageHash, publicKey);
    } catch (error) {
      logger.error('Crypto verification error:', error);
      return false;
    }
  }

  private hexToU8a(hex: string): Uint8Array {
    // Remove 0x prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    
    // Ensure even length
    const paddedHex = cleanHex.length % 2 === 0 ? cleanHex : '0' + cleanHex;
    
    // Convert to Uint8Array
    const bytes = new Uint8Array(paddedHex.length / 2);
    for (let i = 0; i < paddedHex.length; i += 2) {
      bytes[i / 2] = parseInt(paddedHex.substr(i, 2), 16);
    }
    
    return bytes;
  }

  // Generate cryptographically secure session ID
  private generateSecureSessionId(): string {
    return generateSecureSessionId();
  }

  // Validate Polkadot address format
  private validateAddress(address: string): boolean {
    try {
      // Basic validation for Polkadot address format
      // In a real implementation, you'd use the Polkadot API to validate
      return /^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(address);
    } catch (error) {
      logger.debug('Address validation error:', { address, error });
      return false;
    }
  }

  // Create a new session
  _createSession(address: string, _chainId: string, walletType?: string): any {
    const sessionId = this.generateSecureSessionId();
    const accessToken = this.generateSecureSessionId();
    const refreshToken = this.generateSecureSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return {
      sessionId,
      address,
      accessToken,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
      walletType: walletType || 'polkadot-js',
    };
  }

  // Verify an existing session
  _verifySession(sessionId: string): any {
    // Mock session verification
    return {
      id: sessionId,
      address: 'mock-address',
      isActive: true,
    };
  }

  // Refresh a session
  _refreshSession(_sessionId: string): any {
    const newSessionId = this.generateSecureSessionId();
    const accessToken = this.generateSecureSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return {
      sessionId: newSessionId,
      address: 'mock-address',
      accessToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  // Revoke a session
  _revokeSession(sessionId: string): void {
    // Mock session revocation
    logger.info(`Session ${sessionId} revoked`);
  }

  // Get supported wallets
  _getSupportedWallets(): any[] {
    return [
      {
        id: 'polkadot-js',
        name: 'Polkadot.js Extension',
        description: 'Official Polkadot browser extension',
        icon: 'polkadot-js-icon',
        extensionId: 'nhnlbodnbfbebdjdijclmlogilapodkh',
      },
      {
        id: 'papi',
        name: 'PAPI Wallet',
        description: 'Polkadot Asset Portal Interface',
        icon: 'papi-icon',
        extensionId: 'papi-extension',
      },
    ];
  }

  // Get supported chains
  _getSupportedChains(): any[] {
    return [
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
      {
        id: 'westend',
        name: 'Westend',
        rpcUrl: 'wss://westend-rpc.polkadot.io',
        ss58Format: 42,
        decimals: 12,
        symbol: 'WND',
      },
    ];
  }

  // Public API methods that match the expected interface
  async createChallenge(address: string, chainId: string = 'polkadot'): Promise<any> {
    return this._createChallenge(address, chainId);
  }

  async verifySignature(signature: string, challenge: any, address: string): Promise<any> {
    return this._verifySignature(signature, challenge, address);
  }

  async createSession(address: string, chainId: string, walletType?: string): Promise<any> {
    return this._createSession(address, chainId, walletType);
  }

  async verifySession(sessionId: string): Promise<any> {
    return this._verifySession(sessionId);
  }

  async refreshSession(sessionId: string): Promise<any> {
    return this._refreshSession(sessionId);
  }

  async revokeSession(sessionId: string): Promise<void> {
    return this._revokeSession(sessionId);
  }

  async getSupportedWallets(): Promise<any[]> {
    return this._getSupportedWallets();
  }

  async getSupportedChains(): Promise<any[]> {
    return this._getSupportedChains();
  }

  // Get authentication middleware
  getAuthMiddleware() {
    return {
      requireAuth: (req: any, _res: any, next: any) => {
        // Mock authentication middleware
        req.user = { address: 'mock-address', session: { id: 'mock-session' } };
        next();
      },
      optionalAuth: (req: any, _res: any, next: any) => {
        // Mock optional authentication middleware
        req.user = { address: 'mock-address', session: { id: 'mock-session' } };
        next();
      },
    };
  }
}

// Export singleton instance
export const polkadotSSOService = new PolkadotSSOService();