import { WalletAuthService } from '@/services/wallet-auth.service';

// Mock the Polkadot SSO service
jest.mock('@/services/polkadot-sso.service', () => ({
  polkadotSSOService: {
    createChallenge: jest.fn(),
    verifySignature: jest.fn(),
  },
}));

describe('WalletAuthService', () => {
  let walletAuthService: WalletAuthService;
  const mockPolkadotSSOService = require('@/services/polkadot-sso.service').polkadotSSOService;

  beforeAll(() => {
    walletAuthService = new WalletAuthService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateChallenge', () => {
    it('should generate a valid challenge', async () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const chainId = 'polkadot';

      const mockChallenge = {
        message: `Sign this message to authenticate with PMT Gateway:\nAddress: ${address}\nNonce: test-nonce\nTimestamp: 1234567890\nService: PMT Gateway\nVersion: 1.0\nThis request will not trigger a blockchain transaction or cost any gas fees.`,
        nonce: 'test-nonce',
        issuedAt: 1234567890
      };

      mockPolkadotSSOService.createChallenge.mockResolvedValueOnce(mockChallenge);

      const challenge = await walletAuthService.generateChallenge(address, chainId);

      expect(challenge).toBeDefined();
      expect(challenge.message).toContain(address);
      expect(challenge.message).toContain('PMT Gateway');
      expect(challenge.nonce).toBeDefined();
      expect(challenge.timestamp).toBeDefined();
    });

    it('should generate different challenges for different addresses', async () => {
      const address1 = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const address2 = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

      const mockChallenge1 = {
        message: `Sign this message to authenticate with PMT Gateway:\nAddress: ${address1}\nNonce: nonce1\nTimestamp: 1234567890\nService: PMT Gateway\nVersion: 1.0\nThis request will not trigger a blockchain transaction or cost any gas fees.`,
        nonce: 'nonce1',
        issuedAt: 1234567890
      };

      const mockChallenge2 = {
        message: `Sign this message to authenticate with PMT Gateway:\nAddress: ${address2}\nNonce: nonce2\nTimestamp: 1234567891\nService: PMT Gateway\nVersion: 1.0\nThis request will not trigger a blockchain transaction or cost any gas fees.`,
        nonce: 'nonce2',
        issuedAt: 1234567891
      };

      mockPolkadotSSOService.createChallenge
        .mockResolvedValueOnce(mockChallenge1)
        .mockResolvedValueOnce(mockChallenge2);

      const challenge1 = await walletAuthService.generateChallenge(address1);
      const challenge2 = await walletAuthService.generateChallenge(address2);

      expect(challenge1.message).not.toBe(challenge2.message);
      expect(challenge1.nonce).not.toBe(challenge2.nonce);
    });
  });

  describe('verifySignature', () => {
    it('should verify a valid signature', async () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const challenge = await walletAuthService.generateChallenge(address);
      const mockSignature = '0x1234567890abcdef';

      const response = {
        signature: mockSignature,
        address,
        challenge,
      };

      // Mock SSO service to return valid verification
      mockPolkadotSSOService.verifySignature.mockResolvedValue({
        valid: true,
        address: address
      });

      const result = await walletAuthService.verifySignature(response, address);

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });

    it('should reject invalid signature', async () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const challenge = await walletAuthService.generateChallenge(address);
      const invalidSignature = '0xinvalid';

      const response = {
        signature: invalidSignature,
        address,
        challenge,
      };

      // Mock SSO service to return invalid verification
      mockPolkadotSSOService.verifySignature.mockResolvedValue({
        valid: false,
        address: address
      });

      const result = await walletAuthService.verifySignature(response, address);

      expect(result.valid).toBe(false);
    });

    it('should reject signature for different address', async () => {
      const address1 = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const address2 = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
      const challenge = await walletAuthService.generateChallenge(address1);
      const mockSignature = '0x1234567890abcdef';

      const response = {
        signature: mockSignature,
        address: address1,
        challenge,
      };

      // Mock SSO service to return invalid verification for different address
      mockPolkadotSSOService.verifySignature.mockResolvedValue({
        valid: false,
        address: address1
      });

      const result = await walletAuthService.verifySignature(response, address2);

      expect(result.valid).toBe(false);
    });
  });

  describe('validateAddress', () => {
    it('should validate correct Polkadot address', () => {
      const validAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const isValid = walletAuthService.validateAddress(validAddress);
      expect(isValid).toBe(true);
    });

    it('should reject invalid address format', () => {
      const invalidAddress = 'invalid-address';
      const isValid = walletAuthService.validateAddress(invalidAddress);
      expect(isValid).toBe(false);
    });

    it('should reject empty address', () => {
      const emptyAddress = '';
      const isValid = walletAuthService.validateAddress(emptyAddress);
      expect(isValid).toBe(false);
    });
  });

  describe('createAuthMessage', () => {
    it('should create properly formatted auth message', () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const nonce = 'test-nonce';
      const timestamp = 1234567890;

      const message = walletAuthService.createAuthMessage(address, nonce, timestamp);

      expect(message).toContain(address);
      expect(message).toContain(nonce);
      expect(message).toContain('PMT Gateway');
    });
  });

  describe('generateNonce', () => {
    it('should generate unique nonces through challenge generation', async () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

      const mockChallenge1 = {
        message: `Sign this message to authenticate with PMT Gateway:\nAddress: ${address}\nNonce: nonce1\nTimestamp: 1234567890\nService: PMT Gateway\nVersion: 1.0\nThis request will not trigger a blockchain transaction or cost any gas fees.`,
        nonce: 'nonce1',
        issuedAt: 1234567890
      };

      const mockChallenge2 = {
        message: `Sign this message to authenticate with PMT Gateway:\nAddress: ${address}\nNonce: nonce2\nTimestamp: 1234567891\nService: PMT Gateway\nVersion: 1.0\nThis request will not trigger a blockchain transaction or cost any gas fees.`,
        nonce: 'nonce2',
        issuedAt: 1234567891
      };

      mockPolkadotSSOService.createChallenge
        .mockResolvedValueOnce(mockChallenge1)
        .mockResolvedValueOnce(mockChallenge2);

      const challenge1 = await walletAuthService.generateChallenge(address);
      const challenge2 = await walletAuthService.generateChallenge(address);

      expect(challenge1.nonce).toBeDefined();
      expect(challenge2.nonce).toBeDefined();
      expect(challenge1.nonce).not.toBe(challenge2.nonce);
    });

    it('should generate nonces of correct length', async () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

      const mockChallenge = {
        message: `Sign this message to authenticate with PMT Gateway:\nAddress: ${address}\nNonce: test-nonce\nTimestamp: 1234567890\nService: PMT Gateway\nVersion: 1.0\nThis request will not trigger a blockchain transaction or cost any gas fees.`,
        nonce: 'test-nonce',
        issuedAt: 1234567890
      };

      mockPolkadotSSOService.createChallenge.mockResolvedValueOnce(mockChallenge);

      const challenge = await walletAuthService.generateChallenge(address);
      
      expect(challenge.nonce).toBeDefined();
      expect(challenge.nonce.length).toBeGreaterThan(0);
    });
  });
});
