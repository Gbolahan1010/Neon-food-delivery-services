// Runs before every test file: starts a throwaway in-memory MongoDB so tests never touch Atlas.
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB, disconnectDB } = require('../src/config/db');
const { mockGeocode, GRAFTON_STREET } = require('./geoMock');

let mongo;

beforeAll(async () => {
  // A generous start-up time: slow or busy machines can take more than the default 10 seconds.
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  await connectDB(mongo.getUri());
  // Build unique indexes (e.g. User.email) before tests rely on them.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});

// No test may call a real web service: by default every address lookup returns Grafton Street.
// Individual tests can override this with the other helpers in geoMock.js.
beforeEach(() => {
  mockGeocode(GRAFTON_STREET);
});

afterEach(async () => {
  jest.restoreAllMocks();
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await disconnectDB();
  if (mongo) await mongo.stop();
});
