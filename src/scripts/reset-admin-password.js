/* eslint-disable */
'use strict';

/**
 * reset-admin-password.js
 * Resets the superadmin password to Admin@123
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGODB_URI =
  'mongodb+srv://taijulsir:taijulsir8057@auth-service.znmronj.mongodb.net/sass-db?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const newPassword = 'Admin@123';
  const hash = await bcrypt.hash(newPassword, 12);

  const result = await db.collection('users').updateOne(
    { globalRole: 'SUPER_ADMIN' },
    { $set: { password: hash } }
  );

  console.log('Updated:', result.modifiedCount, 'user(s)');
  console.log('Password reset to Admin@123 for SUPER_ADMIN user');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
