# PMT Gateway - Testing Guide

## 🧪 Overview

This document provides comprehensive testing guidelines for the PMT Gateway project, including unit tests, integration tests, and end-to-end testing strategies.

## 📋 Test Structure

```
src/__tests__/
├── utils/
│   └── test-helpers.ts          # Test utilities and helpers
├── services/
│   ├── payment.service.test.ts  # Payment service tests
│   ├── wallet-auth.service.test.ts # Wallet auth service tests
│   └── blockchain-monitor.service.test.ts # Blockchain monitoring tests
├── routes/
│   ├── payment-intents.test.ts  # Payment intent API tests
│   └── wallet-auth.test.ts      # Wallet auth API tests
├── integration/
│   └── app.test.ts              # Full application integration tests
└── setup.ts                     # Test setup and configuration

frontend/sdk/__tests__/
├── pmt-gateway.test.ts          # SDK main class tests
└── setup.ts                     # Frontend test setup
```

## 🚀 Running Tests

### All Tests
```bash
npm run test:all
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Route Tests Only
```bash
npm run test:routes
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

### CI Mode
```bash
npm run test:ci
```

## 🔧 Test Configuration

### Backend Tests
- **Jest Config**: `jest.config.js`
- **Integration Config**: `jest.config.integration.js`
- **Test Environment**: Node.js
- **Database**: PostgreSQL test database
- **Mocking**: Jest mocks for external services

### Frontend SDK Tests
- **Jest Config**: `frontend/sdk/jest.config.js`
- **Test Environment**: jsdom
- **Mocking**: Jest mocks for API calls and browser APIs

## 📊 Test Categories

### 1. Unit Tests
Test individual services and functions in isolation.

**Coverage:**
- Payment Service
- Wallet Authentication Service
- Blockchain Monitor Service
- Price Service
- Webhook Service

**Example:**
```typescript
describe('PaymentService', () => {
  it('should create a payment intent successfully', async () => {
    const paymentData = {
      amount: 2500,
      currency: 'USD',
      merchantId: testMerchant.id,
    };

    const result = await paymentService.createPaymentIntent(paymentData);

    expect(result.amount).toBe(2500);
    expect(result.status).toBe('REQUIRES_PAYMENT');
  });
});
```

### 2. Route Tests
Test API endpoints with mocked services.

**Coverage:**
- Payment Intent Routes
- Wallet Authentication Routes
- Dashboard Routes
- Webhook Routes

**Example:**
```typescript
describe('Payment Intent Routes', () => {
  it('should create a payment intent via API', async () => {
    const response = await request(app)
      .post('/api/v1/payment-intents')
      .send(paymentData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.amount).toBe(2500);
  });
});
```

### 3. Integration Tests
Test the full application with real database connections.

**Coverage:**
- Complete API workflows
- Database interactions
- Service integrations
- Error handling

**Example:**
```typescript
describe('Application Integration', () => {
  it('should handle complete payment flow', async () => {
    // Create payment intent
    const payment = await createPaymentIntent();
    
    // Authenticate wallet
    const token = await authenticateWallet();
    
    // Verify payment status
    const status = await getPaymentStatus(payment.id);
    
    expect(status).toBe('REQUIRES_PAYMENT');
  });
});
```

## 🛠️ Test Utilities

### TestHelpers Class
Provides common test utilities and database management.

```typescript
// Database cleanup
await TestHelpers.cleanupDatabase();

// Create test data
const merchant = await TestHelpers.createTestMerchant();
const payment = await TestHelpers.createTestPaymentIntent(merchant.id);

// Mock utilities
const mockJWT = TestHelpers.generateMockJWT({ merchantId: 'test' });
const mockTransaction = TestHelpers.mockPolkadotTransaction();
```

### Mock Objects
Pre-configured mocks for external services.

```typescript
// Mock Polkadot service
jest.mock('@/services/polkadot-real.service', () => ({
  polkadotRealService: {
    isApiReady: jest.fn().mockResolvedValue(true),
    getLatestBlockNumber: jest.fn().mockResolvedValue(1000000),
  },
}));

// Mock price service
jest.mock('@/utils/price.utils', () => ({
  priceService: {
    getPrice: jest.fn().mockReturnValue('100.00'),
  },
}));
```

## 🗄️ Database Testing

### Test Database Setup
```bash
# Create test database
createdb pmt_gateway_test

# Run migrations
npm run db:migrate
```

### Test Data Management
- Each test cleans up its own data
- Test helpers provide data creation methods
- Database is reset between test suites

### Example Test Data
```typescript
const testMerchant = {
  id: 'merchant_123',
  name: 'Test Merchant',
  email: 'test@example.com',
  apiKeyHash: 'test-hash',
  isActive: true,
};

const testPaymentIntent = {
  id: 'pi_123',
  amount: 2500,
  currency: 'USD',
  status: 'REQUIRES_PAYMENT',
  merchantId: 'merchant_123',
};
```

## 🔍 Test Coverage

### Coverage Goals
- **Unit Tests**: 90%+ coverage
- **Integration Tests**: 80%+ coverage
- **Critical Paths**: 100% coverage

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Coverage Areas
- ✅ Service methods
- ✅ API endpoints
- ✅ Error handling
- ✅ Validation logic
- ✅ Database operations
- ⚠️ External API calls (mocked)
- ⚠️ Blockchain interactions (mocked)

## 🚨 Error Testing

### Common Error Scenarios
1. **Invalid Input Data**
2. **Database Connection Failures**
3. **External Service Timeouts**
4. **Authentication Failures**
5. **Rate Limiting**

### Error Test Examples
```typescript
it('should handle invalid payment data', async () => {
  const invalidData = { amount: -100 };
  
  await expect(createPaymentIntent(invalidData))
    .rejects.toThrow('Invalid amount');
});

it('should handle database connection failure', async () => {
  // Mock database failure
  prisma.paymentIntent.create.mockRejectedValue(new Error('Connection failed'));
  
  await expect(createPaymentIntent(validData))
    .rejects.toThrow('Database error');
});
```

## 🔄 Continuous Integration

### GitHub Actions Workflow
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
```

### Pre-commit Hooks
```bash
# Install husky
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run test:unit"
```

## 📈 Performance Testing

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Run load tests
artillery run tests/load/payment-api.yml
```

### Memory Testing
```bash
# Run with memory profiling
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 🐛 Debugging Tests

### Debug Mode
```bash
# Run specific test with debug output
npm run test -- --verbose --testNamePattern="should create payment intent"

# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Test Debugging Tips
1. Use `console.log` for debugging (removed in production)
2. Check test database state
3. Verify mock configurations
4. Use Jest's `--verbose` flag
5. Check test isolation

## 📝 Writing Tests

### Test Naming Convention
```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should do something when condition is met', () => {
      // Test implementation
    });
    
    it('should handle error when invalid input provided', () => {
      // Error test implementation
    });
  });
});
```

### Test Structure
```typescript
describe('Feature', () => {
  // Setup
  beforeAll(() => {
    // One-time setup
  });
  
  beforeEach(() => {
    // Setup before each test
  });
  
  afterEach(() => {
    // Cleanup after each test
  });
  
  afterAll(() => {
    // Final cleanup
  });
  
  // Tests
  it('should work correctly', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

## 🎯 Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean up test data after each test
- Don't rely on test execution order

### 2. Mock External Dependencies
- Mock database calls in unit tests
- Mock external API calls
- Mock blockchain interactions

### 3. Test Edge Cases
- Invalid inputs
- Boundary conditions
- Error scenarios
- Timeout conditions

### 4. Use Descriptive Names
- Test names should describe the scenario
- Include expected behavior
- Mention conditions and context

### 5. Keep Tests Simple
- One assertion per test when possible
- Focus on single behavior
- Avoid complex test logic

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

---

**Last Updated**: September 19, 2025  
**Test Coverage**: 90%+ unit tests, 80%+ integration tests
