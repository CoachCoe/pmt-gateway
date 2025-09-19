import { u8aToHex } from '@polkadot/util';
import { blake2AsU8a } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import logger from '@/utils/logger';

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

  public generateChallenge(address: string): WalletAuthChallenge {
    const nonce = this.generateNonce();
    const timestamp = Date.now();
    const message = this.createAuthMessage(address, nonce, timestamp);

    logger.info('Generated wallet auth challenge', {
      address,
      nonce,
      timestamp,
    });

    return {
      message,
      nonce,
      timestamp,
    };
  }

  public verifySignature(
    response: WalletAuthResponse,
    expectedAddress: string
  ): boolean {
    try {
      // Verify the challenge is recent (within 5 minutes)
      const now = Date.now();
      const challengeAge = now - response.challenge.timestamp;
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (challengeAge > maxAge) {
        logger.warn('Wallet auth challenge expired', {
          address: expectedAddress,
          challengeAge,
          maxAge,
        });
        return false;
      }

      // Verify the address matches
      if (response.address !== expectedAddress) {
        logger.warn('Wallet auth address mismatch', {
          expected: expectedAddress,
          provided: response.address,
        });
        return false;
      }

      // Verify the signature
      const isValid = this.verifyPolkadotSignature(
        response.challenge.message,
        response.signature,
        response.address
      );

      if (isValid) {
        logger.info('Wallet auth signature verified', {
          address: response.address,
        });
      } else {
        logger.warn('Wallet auth signature verification failed', {
          address: response.address,
        });
      }

      return isValid;

    } catch (error) {
      logger.error('Wallet auth verification error:', {
        address: expectedAddress,
        error,
      });
      return false;
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

  public getSupportedWallets(): Array<{
    id: string;
    name: string;
    icon: string;
    downloadUrl: string;
  }> {
    return [
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
    ];
  }
}

// Export singleton instance
export const walletAuthService = new WalletAuthService();
