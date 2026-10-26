const app = require('./app');
const { connectDB } = require('./config/db');
const { port, mongoUri, nodeEnv } = require('./config/env');

async function start() {
  try {
    await connectDB(mongoUri);
    console.log('Connected to MongoDB');
    app.listen(port, () => console.log(`Neon API running on port ${port} (${nodeEnv})`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
