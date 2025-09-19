import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { u8aToHex } from '@polkadot/util';
import { config } from '@/config';
import logger from '@/utils/logger';

export interface PolkadotTransaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  blockNumber: number;
  timestamp: number;
}

export class PolkadotRealService {
  private api: ApiPromise | null = null;
  private isConnected = false;
  private keyring: Keyring;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.keyring = new Keyring({ type: 'sr25519' });
    // Start connection in background - don't block constructor
    this.connect().catch(error => {
      logger.error('Failed to connect to Polkadot network in background:', error);
    });
  }

  private async connect(): Promise<void> {
    try {
      logger.info('Connecting to Polkadot network...');
      
      // Use the first RPC endpoint from config
      const rpcEndpoint = config.polkadotRpcEndpoints[0];
      const wsProvider = new WsProvider(rpcEndpoint);
      
      this.api = await ApiPromise.create({ provider: wsProvider });
      
      // Wait for the API to be ready
      await this.api.isReady;
      
      this.isConnected = true;
      logger.info('Connected to Polkadot network', {
        chain: this.api.runtimeChain.toString(),
        version: this.api.runtimeVersion.toString(),
        endpoint: rpcEndpoint
      });

      // Set up connection event handlers
      this.api.on('connected', () => {
        logger.info('Polkadot API connected');
        this.isConnected = true;
      });

      this.api.on('disconnected', () => {
        logger.warn('Polkadot API disconnected');
        this.isConnected = false;
      });

      this.api.on('error', (error) => {
        logger.error('Polkadot API error:', error);
        this.isConnected = false;
      });

    } catch (error) {
      logger.error('Failed to connect to Polkadot network:', error);
      this.isConnected = false;
      throw error;
    }
  }

  public async isApiReady(): Promise<boolean> {
    return this.isConnected && this.api !== null && this.api.isConnected;
  }

  public async getBalance(address: string): Promise<string> {
    if (!this.api || !this.isConnected) {
      throw new Error('Polkadot API not ready');
    }

    try {
      logger.info('Getting balance for address:', { address });
      
      const accountInfo = await this.api.query.system.account(address);
      const balance = accountInfo.data.free.toString();
      
      logger.debug('Balance retrieved:', { address, balance });
      return balance;
    } catch (error) {
      logger.error('Failed to get balance:', { address, error });
      throw new Error('Failed to get balance');
    }
  }

  public async getAccountInfo(address: string): Promise<any> {
    if (!this.api || !this.isConnected) {
      throw new Error('Polkadot API not ready');
    }

    try {
      logger.info('Getting account info for address:', { address });
      
      const accountInfo = await this.api.query.system.account(address);
      
      return {
        nonce: accountInfo.nonce.toString(),
        free: accountInfo.data.free.toString(),
        reserved: accountInfo.data.reserved.toString(),
        frozen: accountInfo.data.frozen.toString(),
      };
    } catch (error) {
      logger.error('Failed to get account info:', { address, error });
      throw new Error('Failed to get account info');
    }
  }

  public async getBlockHash(blockNumber: number): Promise<string> {
    if (!this.api || !this.isConnected) {
      throw new Error('Polkadot API not ready');
    }

    try {
      logger.info('Getting block hash for block:', { blockNumber });
      
      const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
      return blockHash.toString();
    } catch (error) {
      logger.error('Failed to get block hash:', { blockNumber, error });
      throw new Error('Failed to get block hash');
    }
  }

  public async getBlock(blockNumber: number): Promise<any> {
    if (!this.api || !this.isConnected) {
      throw new Error('Polkadot API not ready');
    }

    try {
      logger.info('Getting block:', { blockNumber });
      
      const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
      const block = await this.api.rpc.chain.getBlock(blockHash);
      
      return block;
    } catch (error) {
      logger.error('Failed to get block:', { blockNumber, error });
      throw new Error('Failed to get block');
    }
  }

  public async getLatestBlockNumber(): Promise<number> {
    if (!this.api || !this.isConnected) {
      throw new Error('Polkadot API not ready');
    }

    try {
      const header = await this.api.rpc.chain.getHeader();
      return header.number.toNumber();
    } catch (error) {
      logger.error('Failed to get latest block number:', error);
      throw new Error('Failed to get latest block number');
    }
  }

  public async monitorTransfers(
    targetAddress: string,
    expectedAmount: string,
    onTransfer: (transaction: PolkadotTransaction) => void
  ): Promise<() => void> {
    if (!this.api || !this.isConnected) {
      throw new Error('Polkadot API not ready');
    }

    logger.info('Starting transfer monitoring', {
      targetAddress,
      expectedAmount
    });

    try {
      // Subscribe to new blocks
      const unsubscribe = await this.api.rpc.chain.subscribeNewHeads(async (header) => {
        try {
          const blockNumber = header.number.toNumber();
          const blockHash = header.hash;
          
          // Get the block to check for transfers
          const block = await this.api!.rpc.chain.getBlock(blockHash);
          
          // Check each extrinsic in the block
          for (const extrinsic of block.block.extrinsics) {
            try {
              // Check if this is a transfer extrinsic
              if (extrinsic.method.section === 'balances' && extrinsic.method.method === 'transfer') {
                const args = extrinsic.method.args;
                const to = args[0].toString();
                const amount = args[1].toString();
                
                // Check if this transfer is to our target address
                if (to === targetAddress && amount === expectedAmount) {
                  const transaction: PolkadotTransaction = {
                    hash: extrinsic.hash.toString(),
                    from: extrinsic.signer?.toString() || 'unknown',
                    to: to,
                    amount: amount,
                    blockNumber: blockNumber,
                    timestamp: Date.now(), // Note: In production, get actual block timestamp
                  };
                  
                  logger.info('Transfer detected:', transaction);
                  onTransfer(transaction);
                }
              }
            } catch (extrinsicError) {
              logger.debug('Error processing extrinsic:', extrinsicError);
            }
          }
        } catch (blockError) {
          logger.error('Error processing block:', blockError);
        }
      });

      this.unsubscribe = unsubscribe;
      
      return () => {
        if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = null;
        }
        logger.info('Stopped transfer monitoring');
      };
    } catch (error) {
      logger.error('Failed to start transfer monitoring:', error);
      throw new Error('Failed to start transfer monitoring');
    }
  }

  public async getTransactionByHash(hash: string): Promise<any> {
    if (!this.api || !this.isConnected) {
      throw new Error('Polkadot API not ready');
    }

    try {
      logger.info('Getting transaction by hash:', { hash });
      
      // Note: Polkadot doesn't have direct transaction lookup by hash
      // This would require scanning blocks or using an indexer
      // For now, return a placeholder
      return {
        hash,
        found: false,
        message: 'Transaction lookup by hash not implemented - requires block scanning'
      };
    } catch (error) {
      logger.error('Failed to get transaction by hash:', { hash, error });
      throw new Error('Failed to get transaction by hash');
    }
  }

  public async validateAddress(address: string): Promise<boolean> {
    if (!this.api || !this.isConnected) {
      throw new Error('Polkadot API not ready');
    }

    try {
      // Use Polkadot's address validation
      const keyring = new Keyring({ type: 'sr25519' });
      keyring.addFromAddress(address);
      return true;
    } catch (error) {
      logger.debug('Invalid address format:', { address, error });
      return false;
    }
  }

  public async getNetworkInfo(): Promise<any> {
    if (!this.api || !this.isConnected) {
      throw new Error('Polkadot API not ready');
    }

    try {
      const [chain, version, properties] = await Promise.all([
        this.api.runtimeChain,
        this.api.runtimeVersion,
        this.api.rpc.system.properties()
      ]);

      return {
        chain: chain.toString(),
        version: version.toString(),
        properties: properties.toHuman(),
        isConnected: this.isConnected
      };
    } catch (error) {
      logger.error('Failed to get network info:', error);
      throw new Error('Failed to get network info');
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      
      if (this.api) {
        await this.api.disconnect();
        this.api = null;
      }
      
      this.isConnected = false;
      logger.info('Disconnected from Polkadot network');
    } catch (error) {
      logger.error('Error disconnecting from Polkadot network:', error);
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && this.api !== null && this.api.isConnected;
  }
}

// Export singleton instance
export const polkadotRealService = new PolkadotRealService();
