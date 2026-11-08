const mongoose = require('mongoose');

async function connectToDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI must be configured before starting the API server.');
  }

  await mongoose.connect(uri, {
    autoIndex: process.env.NODE_ENV !== 'production',
  });
  return mongoose.connection;
}

module.exports = connectToDatabase;
