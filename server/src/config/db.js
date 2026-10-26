const mongoose = require('mongoose');

// Reject query filters on fields that are not in the schema.
mongoose.set('strictQuery', true);
// Wrap any object a user smuggles into a filter (e.g. { "$gt": "" }) in $eq,
// so it is treated as a literal value rather than a query operator (NoSQL injection defence).
mongoose.set('sanitizeFilter', true);

/**
 * Opens one shared connection for the whole process (singleton).
 * Calling it again while connected returns the existing connection.
 */
async function connectDB(uri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(uri);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
