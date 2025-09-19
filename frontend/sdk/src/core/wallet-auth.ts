import { 
  WalletConnection, 
  WalletAuthChallenge, 
  SupportedWallet,
  PMTGatewayError 
} from '../types';
import { APIClient } from './api-client';

export class WalletAuthService {
  private apiClient: APIClient;
  private currentConnection: WalletConnection | null = null;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  async getSupportedWallets(): Promise<SupportedWallet[]> {
    try {
      return await this.apiClient.getSupportedWallets();
    } catch (error) {
      console.error('Failed to get supported wallets:', error);
      throw error;
    }
  }

  async generateAuthChallenge(address: string): Promise<WalletAuthChallenge> {
    try {
      const response = await this.apiClient.generateAuthChallenge(address);
      return response.challenge;
    } catch (error) {
      console.error('Failed to generate auth challenge:', error);
      throw error;
    }
  }

  async connectWallet(walletId: string): Promise<WalletConnection> {
    try {
      // Check if wallet is available
      const isAvailable = await this.isWalletAvailable(walletId);
      if (!isAvailable) {
        throw new PMTGatewayError(
          `Wallet ${walletId} is not available`,
          'WALLET_NOT_AVAILABLE'
        );
      }

      // Get wallet info
      const wallet = await this.getWalletInfo(walletId);
      
      // Request wallet connection
      const accounts = await this.requestWalletConnection(walletId);
      
      if (!accounts || accounts.length === 0) {
        throw new PMTGatewayError(
          'No accounts found in wallet',
          'NO_ACCOUNTS_FOUND'
        );
      }

      const connection: WalletConnection = {
        address: accounts[0].address,
        source: walletId,
        name: wallet.name,
        version: accounts[0].meta?.version,
      };

      this.currentConnection = connection;
      return connection;

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  async authenticateWallet(merchantId: string): Promise<string> {
    if (!this.currentConnection) {
      throw new PMTGatewayError(
        'No wallet connected',
        'NO_WALLET_CONNECTED'
      );
    }

    try {
      // Generate auth challenge
      const challenge = await this.generateAuthChallenge(this.currentConnection.address);
      
      // Request signature from wallet
      const signature = await this.requestSignature(challenge.message);
      
      // Verify authentication with API
      const response = await this.apiClient.verifyWalletAuth({
        signature,
        address: this.currentConnection.address,
        challenge,
        merchantId,
      });

      return response.token;

    } catch (error) {
      console.error('Failed to authenticate wallet:', error);
      throw error;
    }
  }

  getCurrentConnection(): WalletConnection | null {
    return this.currentConnection;
  }

  disconnect(): void {
    this.currentConnection = null;
  }

  private async isWalletAvailable(walletId: string): Promise<boolean> {
    // Check if wallet extension is installed
    switch (walletId) {
      case 'polkadot-js':
        return !!(window as any).injectedWeb3?.['polkadot-js'];
      case 'talisman':
        return !!(window as any).injectedWeb3?.['talisman'];
      case 'subwallet':
        return !!(window as any).injectedWeb3?.['subwallet'];
      case 'nova-wallet':
        return !!(window as any).injectedWeb3?.['nova-wallet'];
      default:
        return false;
    }
  }

  private async getWalletInfo(walletId: string): Promise<{ name: string; icon: string }> {
    const wallets = await this.getSupportedWallets();
    const wallet = wallets.find(w => w.id === walletId);
    
    if (!wallet) {
      throw new PMTGatewayError(
        `Unknown wallet: ${walletId}`,
        'UNKNOWN_WALLET'
      );
    }

    return {
      name: wallet.name,
      icon: wallet.icon,
    };
  }

  private async requestWalletConnection(walletId: string): Promise<Array<{ address: string; meta?: { version?: string } }>> {
    try {
      const wallet = (window as any).injectedWeb3?.[walletId];
      
      if (!wallet) {
        throw new PMTGatewayError(
          `Wallet ${walletId} not found`,
          'WALLET_NOT_FOUND'
        );
      }

      // Enable the wallet
      const extension = await wallet.enable('PMT Gateway');
      
      // Get accounts
      const accounts = await extension.accounts.get();
      
      return accounts.map((account: any) => ({
        address: account.address,
        meta: {
          version: extension.version,
        },
      }));

    } catch (error) {
      if (error instanceof PMTGatewayError) {
        throw error;
      }
      
      throw new PMTGatewayError(
        `Failed to connect to ${walletId}`,
        'WALLET_CONNECTION_FAILED',
        { originalError: error }
      );
    }
  }

  private async requestSignature(message: string): Promise<string> {
    if (!this.currentConnection) {
      throw new PMTGatewayError(
        'No wallet connected',
        'NO_WALLET_CONNECTED'
      );
    }

    try {
      const wallet = (window as any).injectedWeb3?.[this.currentConnection.source];
      
      if (!wallet) {
        throw new PMTGatewayError(
          'Wallet not available',
          'WALLET_NOT_AVAILABLE'
        );
      }

      const extension = await wallet.enable('PMT Gateway');
      
      // Request signature
      const signature = await extension.signer.signRaw({
        address: this.currentConnection.address,
        data: message,
      });

      return signature.signature;

    } catch (error) {
      if (error instanceof PMTGatewayError) {
        throw error;
      }
      
      throw new PMTGatewayError(
        'Failed to sign message',
        'SIGNATURE_FAILED',
        { originalError: error }
      );
    }
  }
}
