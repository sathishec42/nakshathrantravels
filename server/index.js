require('dotenv').config();
const app = require('./app');
const connectToDatabase = require('./config/mongo');
const { expireOutdatedPermits } = require('./services/permitExpiryService');
const { releaseCompletedTurnaroundBuffers } = require('./services/turnaroundExpiryService');

const port = Number(process.env.API_PORT || 4000);
const host = process.env.API_HOST || '127.0.0.1';

async function start() {
  await connectToDatabase();
  const expirePermits = () => expireOutdatedPermits().catch((error) => {
    console.error('Permit expiry job failed:', error);
  });
  const releaseTurnaroundBuffers = () => releaseCompletedTurnaroundBuffers().catch((error) => {
    console.error('Turnaround buffer release job failed:', error);
  });
  await expirePermits();
  await releaseTurnaroundBuffers();
  const expiryTimer = setInterval(expirePermits, 60 * 60 * 1000);
  const turnaroundTimer = setInterval(releaseTurnaroundBuffers, 60 * 60 * 1000);
  const server = app.listen(port, host, () => {
    console.log(`Nakshathran Travels API listening on http://${host}:${port}`);
  });

  const shutdown = async () => {
    clearInterval(expiryTimer);
    clearInterval(turnaroundTimer);
    server.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    console.error('API startup failed:', error);
    process.exitCode = 1;
  });
}

module.exports = start;
