// Jest setup: load environment and set sane defaults
require('dotenv').config({ path: process.env.DOTENV_PATH || '.env' });

// Increase default timeout if running against remote DBs
jest.setTimeout(Number(process.env.JEST_TIMEOUT || 15000));

// Optional: silence noisy logs during tests
const pino = require('pino');
try {
  const logger = require('../src/utils/logger');
  if (logger && typeof logger.level === 'string') {
    logger.level = process.env.TEST_LOG_LEVEL || 'error';
  }
} catch {}
