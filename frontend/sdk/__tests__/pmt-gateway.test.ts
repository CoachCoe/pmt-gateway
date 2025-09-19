import { PMTGateway } from '../src/core/pmt-gateway';
import { APIClient } from '../src/core/api-client';
import { WalletAuthService } from '../src/core/wallet-auth';

// Mock the API client
jest.mock('../src/core/api-client');
jest.mock('../src/core/wallet-auth');

describe('PMTGateway', () => {
  let gateway: PMTGateway;
  let mockAPIClient: jest.Mocked<APIClient>;
  let mockWalletAuthService: jest.Mocked<WalletAuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAPIClient = {
      getSupportedWallets: jest.fn(),
      getSupportedChains: jest.fn(),
      generateAuthChallenge: jest.fn(),
      verifyWalletAuth: jest.fn(),
      createPaymentIntent: jest.fn(),
      getPaymentIntent: jest.fn(),
      listPaymentIntents: jest.fn(),
      cancelPaymentIntent: jest.fn(),
    } as any;

    mockWalletAuthService = {
      getSupportedWallets: jest.fn(),
      getSupportedChains: jest.fn(),
      generateAuthChallenge: jest.fn(),
      connectWallet: jest.fn(),
      authenticateWallet: jest.fn(),
      disconnectWallet: jest.fn(),
      getConnectionStatus: jest.fn(),
    } as any;

    gateway = new PMTGateway({
      apiKey: 'test-api-key',
      environment: 'test',
    });
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(gateway).toBeDefined();
    });
  });

  describe('Payment Intents', () => {
    it('should create a payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        amount: 2500,
        currency: 'USD',
        status: 'REQUIRES_PAYMENT',
      };

      mockAPIClient.createPaymentIntent.mockResolvedValue(mockPaymentIntent);

      const result = await gateway.paymentIntents.create({
        amount: 2500,
        currency: 'USD',
        merchantId: 'merchant_123',
      });

      expect(mockAPIClient.createPaymentIntent).toHaveBeenCalledWith({
        amount: 2500,
        currency: 'USD',
        merchantId: 'merchant_123',
      });
      expect(result).toEqual(mockPaymentIntent);
    });

    it('should retrieve a payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        amount: 2500,
        currency: 'USD',
        status: 'SUCCEEDED',
      };

      mockAPIClient.getPaymentIntent.mockResolvedValue(mockPaymentIntent);

      const result = await gateway.paymentIntents.retrieve('pi_123');

      expect(mockAPIClient.getPaymentIntent).toHaveBeenCalledWith('pi_123');
      expect(result).toEqual(mockPaymentIntent);
    });

    it('should list payment intents', async () => {
      const mockPaymentIntents = {
        payments: [
          { id: 'pi_123', amount: 2500, currency: 'USD', status: 'SUCCEEDED' },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      mockAPIClient.listPaymentIntents.mockResolvedValue(mockPaymentIntents);

      const result = await gateway.paymentIntents.list({
        page: 1,
        limit: 10,
      });

      expect(mockAPIClient.listPaymentIntents).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockPaymentIntents);
    });

    it('should cancel a payment intent', async () => {
      const mockCanceledPayment = {
        id: 'pi_123',
        status: 'CANCELED',
      };

      mockAPIClient.cancelPaymentIntent.mockResolvedValue(mockCanceledPayment);

      const result = await gateway.paymentIntents.cancel('pi_123');

      expect(mockAPIClient.cancelPaymentIntent).toHaveBeenCalledWith('pi_123');
      expect(result).toEqual(mockCanceledPayment);
    });
  });

  describe('Wallet Management', () => {
    it('should get supported wallets', async () => {
      const mockWallets = [
        { id: 'polkadot-js', name: 'Polkadot.js', icon: 'polkadot-js' },
      ];

      mockWalletAuthService.getSupportedWallets.mockResolvedValue(mockWallets);

      const result = await gateway.getSupportedWallets();

      expect(mockWalletAuthService.getSupportedWallets).toHaveBeenCalled();
      expect(result).toEqual(mockWallets);
    });

    it('should get supported chains', async () => {
      const mockChains = [
        { id: 'polkadot', name: 'Polkadot', symbol: 'DOT' },
      ];

      mockWalletAuthService.getSupportedChains.mockResolvedValue(mockChains);

      const result = await gateway.getSupportedChains();

      expect(mockWalletAuthService.getSupportedChains).toHaveBeenCalled();
      expect(result).toEqual(mockChains);
    });

    it('should connect wallet', async () => {
      const mockConnection = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        walletType: 'polkadot-js',
      };

      mockWalletAuthService.connectWallet.mockResolvedValue(mockConnection);

      const result = await gateway.connectWallet('polkadot-js');

      expect(mockWalletAuthService.connectWallet).toHaveBeenCalledWith('polkadot-js');
      expect(result).toEqual(mockConnection);
    });

    it('should authenticate wallet', async () => {
      const mockToken = 'jwt-token-123';

      mockWalletAuthService.authenticateWallet.mockResolvedValue(mockToken);

      const result = await gateway.authenticateWallet('merchant_123', 'polkadot');

      expect(mockWalletAuthService.authenticateWallet).toHaveBeenCalledWith(
        'merchant_123',
        'polkadot'
      );
      expect(result).toEqual(mockToken);
    });

    it('should disconnect wallet', async () => {
      mockWalletAuthService.disconnectWallet.mockResolvedValue();

      await gateway.disconnectWallet();

      expect(mockWalletAuthService.disconnectWallet).toHaveBeenCalled();
    });

    it('should get connection status', async () => {
      const mockStatus = {
        connected: true,
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        walletType: 'polkadot-js',
      };

      mockWalletAuthService.getConnectionStatus.mockResolvedValue(mockStatus);

      const result = await gateway.getConnectionStatus();

      expect(mockWalletAuthService.getConnectionStatus).toHaveBeenCalled();
      expect(result).toEqual(mockStatus);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockAPIClient.createPaymentIntent.mockRejectedValue(error);

      await expect(
        gateway.paymentIntents.create({
          amount: 2500,
          currency: 'USD',
          merchantId: 'merchant_123',
        })
      ).rejects.toThrow('API Error');
    });

    it('should handle wallet errors gracefully', async () => {
      const error = new Error('Wallet Error');
      mockWalletAuthService.connectWallet.mockRejectedValue(error);

      await expect(gateway.connectWallet('polkadot-js')).rejects.toThrow('Wallet Error');
    });
  });
});
