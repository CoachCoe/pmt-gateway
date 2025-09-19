// Test setup file
// Set test environment
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/pmt_gateway_test';
process.env['REDIS_URL'] = 'redis://localhost:6379/1';
process.env['JWT_SECRET'] = 'test-secret-key';
process.env['WEBHOOK_SECRET'] = 'test-webhook-secret';
