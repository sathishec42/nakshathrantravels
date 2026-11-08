require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectToDatabase = require('../config/mongo');
const User = require('../models/User');

async function seedSuperAdmin() {
  const { SEED_SUPERADMIN_EMAIL: email, SEED_SUPERADMIN_PASSWORD: password } = process.env;
  if (!email || !password || password.length < 12) {
    throw new Error('Set SEED_SUPERADMIN_EMAIL and a SEED_SUPERADMIN_PASSWORD of at least 12 characters.');
  }
  await connectToDatabase();
  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    if (existing.role !== 'SUPERADMIN') {
      throw new Error('The seed email already belongs to a non-superadmin account; refusing to promote it automatically.');
    }
    console.log('The configured superadmin account already exists.');
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    name: process.env.SEED_SUPERADMIN_NAME || 'Platform Administrator',
    email: normalizedEmail,
    passwordHash,
    role: 'SUPERADMIN',
    status: 'ACTIVE',
  });
  console.log('Created the configured superadmin account.');
}

if (require.main === module) {
  seedSuperAdmin()
    .catch((error) => {
      console.error('Superadmin seed failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      const mongoose = require('mongoose');
      await mongoose.disconnect();
    });
}

module.exports = seedSuperAdmin;
