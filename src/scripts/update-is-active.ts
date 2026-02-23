import { connectDatabase, disconnectDatabase } from '../config/db';
import { Organization } from '../modules/organization/organization.model';
import { User } from '../modules/user/user.model';
import { logger } from '../config/logger';

async function runMigration() {
  try {
    await connectDatabase();
    
    logger.info('Starting migration: Setting isActive: true for existing records...');

    // Update organizations
    const orgResult = await Organization.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );
    logger.info(`Updated ${orgResult.modifiedCount} organizations.`);

    // Update users
    const userResult = await User.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );
    logger.info(`Updated ${userResult.modifiedCount} users.`);

    logger.info('Migration completed successfully.');
  } catch (error) {
    logger.error('Migration failed:', error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

runMigration();
