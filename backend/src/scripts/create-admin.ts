import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { User, UserSchema, UserRole } from '../database/schemas/user.schema';

config();

async function createAdmin() {
  const mongoUri = process.env.DATABASE_URL;

  if (!mongoUri) {
    throw new Error('DATABASE_URL is not set');
  }

  await mongoose.connect(mongoUri);

  const UserModel = mongoose.model<User>('User', UserSchema);

  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@glovia.com.np';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPass123!';

  const existing = await UserModel.findOne({ email }).lean();

  const hashedPassword = await bcrypt.hash(password, 10);

  if (existing) {
    await UserModel.findByIdAndUpdate(existing._id, {
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      isEmailVerified: true,
      isPhoneVerified: true,
    });
    console.log('Admin user updated');
  } else {
    await UserModel.create({
      email,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.SUPER_ADMIN,
      isEmailVerified: true,
      isPhoneVerified: true,
    });
    console.log('Admin user created');
  }

  await mongoose.disconnect();
}

createAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
