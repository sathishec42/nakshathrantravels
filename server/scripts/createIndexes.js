require('dotenv').config();
const connectToDatabase = require('../config/mongo');
require('../models/AuditLog');
require('../models/Booking');
require('../models/Driver');
require('../models/PaymentEvent');
require('../models/PaymentTransaction');
require('../models/RefreshToken');
require('../models/Permit');
require('../models/User');
require('../models/Vehicle');

async function createIndexes() {
  await connectToDatabase();
  const mongoose = require('mongoose');
  for (const model of Object.values(mongoose.models)) {
    await model.createIndexes();
    console.log(`Indexes ready: ${model.collection.collectionName}`);
  }
}

if (require.main === module) {
  createIndexes()
    .catch((error) => {
      console.error('Index creation failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      const mongoose = require('mongoose');
      await mongoose.disconnect();
    });
}

module.exports = createIndexes;
