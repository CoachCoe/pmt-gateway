import { WalletAuthService } from '@/services/wallet-auth.service';

describe('WalletAuthService - Simple Tests', () => {
  let walletAuthService: WalletAuthService;

  beforeAll(() => {
    walletAuthService = new WalletAuthService();
  });

  describe('generateChallenge', () => {
    it('should generate a valid challenge', async () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const chainId = 'polkadot';

      const challenge = await walletAuthService.generateChallenge(address, chainId);

      expect(challenge).toBeDefined();
      expect(challenge.message).toContain(address);
      expect(challenge.nonce).toBeDefined();
      expect(challenge.timestamp).toBeDefined();
    });

    it('should generate different challenges for different addresses', async () => {
      const address1 = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const address2 = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

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

      const result = await walletAuthService.verifySignature(response, address);

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
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
});
