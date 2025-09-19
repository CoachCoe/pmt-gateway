// Test setup for frontend SDK
import 'jest-dom/extend-expect';

// Mock global objects
global.fetch = jest.fn();
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock crypto for tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123',
    getRandomValues: (arr: any) => arr.map(() => Math.floor(Math.random() * 256)),
  },
});

// Mock window object
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
  },
  writable: true,
});
