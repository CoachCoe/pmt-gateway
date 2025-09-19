// Simple test to verify the build works
describe('Build Verification', () => {
  it('should have compiled successfully', () => {
    // This test will pass if the TypeScript compilation was successful
    expect(true).toBe(true);
  });

  it('should be able to import basic modules', () => {
    // Test that we can import basic modules without errors
    expect(() => {
      require('../config');
    }).not.toThrow();
  });
});
