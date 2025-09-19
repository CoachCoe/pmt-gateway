#!/usr/bin/env node

// Simple test script for the PMT Gateway API
const http = require('http');

const testEndpoints = [
  { method: 'GET', path: '/api/v1/wallet/wallets', name: 'Get Supported Wallets' },
  { method: 'GET', path: '/api/v1/wallet/chains', name: 'Get Supported Chains' },
  { method: 'POST', path: '/api/v1/wallet/challenge', name: 'Generate Challenge', body: { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' } },
  { method: 'GET', path: '/auth/signin', name: 'SSO Sign In' },
];

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': 'test-' + Date.now()
      }
    };

    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing PMT Gateway API...\n');

  for (const test of testEndpoints) {
    try {
      console.log(`Testing: ${test.name}`);
      console.log(`${test.method} ${test.path}`);
      
      const result = await makeRequest(test.method, test.path, test.body);
      
      if (result.status === 200) {
        console.log('✅ SUCCESS');
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.log('❌ FAILED');
        console.log(`Status: ${result.status}`);
        console.log(JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.log('❌ ERROR');
      console.log(error.message);
    }
    console.log('---\n');
  }
}

runTests().catch(console.error);
