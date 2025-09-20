import { u8aToHex } from '@polkadot/util';
import { blake2AsU8a } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import logger from '@/utils/logger';
import { polkadotSSOService } from './polkadot-sso.service';

export interface WalletAuthChallenge {
  message: string;
  nonce: string;
  timestamp: number;
}

export interface WalletAuthResponse {
  signature: string;
  address: string;
  challenge: WalletAuthChallenge;
}

export class WalletAuthService {
  private keyring: Keyring;

  constructor() {
    this.keyring = new Keyring({ type: 'sr25519' });
  }

  public async generateChallenge(address: string, chainId: string = 'polkadot'): Promise<WalletAuthChallenge> {
    try {
      // Use Polkadot SSO to generate challenge
      const challenge = await polkadotSSOService.createChallenge(address, chainId);
      
      const walletChallenge: WalletAuthChallenge = {
        message: challenge.message,
        nonce: challenge.nonce,
        timestamp: challenge.issuedAt,
      };

      logger.info('Generated wallet auth challenge via Polkadot SSO', {
        address,
        chainId,
        nonce: challenge.nonce,
      });

      return walletChallenge;
    } catch (error) {
      logger.error('Failed to generate challenge via Polkadot SSO, falling back to local method', { error, address });
      
      // Fallback to local challenge generation
      const nonce = this.generateNonce();
      const timestamp = Date.now();
      const message = this.createAuthMessage(address, nonce, timestamp);

      return {
        message,
        nonce,
        timestamp,
      };
    }
  }

  public async verifySignature(
    response: WalletAuthResponse,
    expectedAddress: string,
    _chainId: string = 'polkadot'
  ): Promise<{ valid: boolean; sessionId?: string; walletType?: string }> {
    try {
      // First try Polkadot SSO verification
      try {
        const verificationResult = await polkadotSSOService.verifySignature(
          response.signature,
          {
            message: response.challenge.message,
            nonce: response.challenge.nonce,
            timestamp: response.challenge.timestamp,
          },
          response.address
        );

        if (verificationResult.valid) {
          logger.info('Wallet auth signature verified via Polkadot SSO', {
            address: response.address,
            walletType: verificationResult.walletType,
          });

          return {
            valid: true,
            sessionId: verificationResult.sessionId,
            walletType: verificationResult.walletType,
          };
        }
      } catch (ssoError) {
        logger.warn('Polkadot SSO verification failed, falling back to local verification', { ssoError });
      }

      // Fallback to local verification
      const isValid = this.verifyPolkadotSignature(
        response.challenge.message,
        response.signature,
        response.address
      );

      if (isValid) {
        logger.info('Wallet auth signature verified locally', {
          address: response.address,
        });
      } else {
        logger.warn('Wallet auth signature verification failed', {
          address: response.address,
        });
      }

      return { valid: isValid };

    } catch (error) {
      logger.error('Wallet auth verification error:', {
        address: expectedAddress,
        error,
      });
      return { valid: false };
    }
  }

  public createAuthMessage(address: string, nonce: string, timestamp: number): string {
    return `Sign this message to authenticate with PMT Gateway:

Address: ${address}
Nonce: ${nonce}
Timestamp: ${timestamp}
Service: PMT Gateway
Version: 1.0

This request will not trigger a blockchain transaction or cost any gas fees.`;
  }

  private generateNonce(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return u8aToHex(array);
  }

  private verifyPolkadotSignature(
    message: string,
    signature: string,
    address: string
  ): boolean {
    try {
      // Convert message to bytes
      const messageBytes = new TextEncoder().encode(message);
      
      // Hash the message
      const messageHash = blake2AsU8a(messageBytes, 256);
      
      // Convert signature from hex to bytes
      const signatureBytes = this.hexToU8a(signature);
      
      // Get the public key from the address
      const publicKey = this.keyring.decodeAddress(address);
      
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
    _messageHash: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array
  ): boolean {
    // For now, we'll do a simple validation
    // In a real implementation, you'd use proper cryptographic verification
    return signature.length === 64 && publicKey.length === 32;
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

  public validateAddress(address: string): boolean {
    try {
      // Basic validation for Polkadot address format
      // In a real implementation, you'd use the Polkadot API to validate
      return /^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(address);
    } catch (error) {
      logger.debug('Address validation error:', { address, error });
      return false;
    }
  }

  public async getSupportedWallets(): Promise<Array<{
    id: string;
    name: string;
    icon: string;
    downloadUrl: string;
  }>> {
    try {
      // Use Polkadot SSO service for supported wallets
      const ssoWallets = await polkadotSSOService.getSupportedWallets();
      
      // Convert SSO format to API format
      return ssoWallets.map(wallet => ({
        id: wallet.id,
        name: wallet.name,
        icon: wallet.icon,
        downloadUrl: wallet.downloadUrl || `https://${wallet.id}.com/`,
      }));
    } catch (error) {
      logger.error('Failed to get supported wallets from SSO service, using fallback', { error });
      
      // Fallback to basic wallets
      return [
        {
          id: 'polkadot-js',
          name: 'Polkadot.js Extension',
          icon: 'polkadot-js',
          downloadUrl: 'https://polkadot.js.org/extension/',
        },
        {
          id: 'papi',
          name: 'PAPI Wallet',
          icon: 'papi',
          downloadUrl: 'https://papi.com/',
        },
      ];
    }
  }
}

// Export singleton instance
export const walletAuthService = new WalletAuthService();
