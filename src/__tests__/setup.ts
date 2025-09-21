// Test setup file
// Set test environment
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = 'file:./test.db';
process.env['TEST_DATABASE_URL'] = 'file:./test.db';
process.env['REDIS_URL'] = 'redis://localhost:6379/1';
process.env['JWT_SECRET'] = 'test-secret-key';
process.env['WEBHOOK_SECRET'] = 'test-webhook-secret';
process.env['COINGECKO_API_KEY'] = 'test-api-key';
