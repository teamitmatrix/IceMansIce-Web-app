const MongoDAL = require('./MongoDAL');
const config = require('../config');

/**
 * Get the appropriate DAL implementation based on configuration
 * @returns {Object} DAL instance
 */
function getDAL() {
  // For now, always return MongoDB DAL
  // In the future, this could be configurable based on environment or settings
  return new MongoDAL();
}

module.exports = {
  getDAL,
  MongoDAL,
  IDAL: require('./IDAL')
};
