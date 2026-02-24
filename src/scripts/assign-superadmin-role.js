/* eslint-disable */
'use strict';

const mongoose = require('mongoose');

const MONGODB_URI =
  'mongodb+srv://taijulsir:taijulsir8057@auth-service.znmronj.mongodb.net/sass-db?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  // Find the SUPER_ADMIN platform role
  const role = await db.collection('platformroles').findOne({ name: 'SUPER_ADMIN' });
  if (!role) {
    console.error('ERROR: SUPER_ADMIN platform role not found. Run the seeder first.');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log('Found SUPER_ADMIN role:', role._id.toString());

  // Find the superadmin user
  const user = await db.collection('users').findOne({ globalRole: 'SUPER_ADMIN' });
  if (!user) {
    console.error('ERROR: No user with globalRole=SUPER_ADMIN found.');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log('Found superadmin user:', user.email, '|', user._id.toString());

  // Upsert the mapping
  const result = await db.collection('userplatformroles').updateOne(
    { userId: user._id, roleId: role._id },
    {
      $setOnInsert: {
        userId: user._id,
        roleId: role._id,
        assignedBy: user._id,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  if (result.upsertedCount > 0) {
    console.log('SUCCESS: SUPER_ADMIN platform role assigned to', user.email);
  } else {
    console.log('INFO: Mapping already exists for', user.email, '(matched:', result.matchedCount, ')');
  }

  // Verify
  const mapping = await db.collection('userplatformroles').findOne({ userId: user._id, roleId: role._id });
  console.log('Verified mapping:', JSON.stringify(mapping));

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
