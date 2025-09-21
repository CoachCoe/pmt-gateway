#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function setupTestDatabase() {
  console.log('Setting up test database...');
  
  // Remove existing test database
  const testDbPath = path.join(__dirname, '..', 'test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
    console.log('Removed existing test database');
  }

  try {
    // Generate Prisma client with test schema
    console.log('Generating Prisma client for test database...');
    execSync('npx prisma generate --schema=prisma/schema.test.prisma', { stdio: 'inherit' });
    
    // Push the schema to create the database
    console.log('Creating test database schema...');
    execSync('npx prisma db push --schema=prisma/schema.test.prisma', { stdio: 'inherit' });
    
    console.log('Test database created successfully');
  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  }
}

setupTestDatabase();
