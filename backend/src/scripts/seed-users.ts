import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import * as bcryptjs from 'bcryptjs';
import { User, UserRole } from '../database/schemas/user.schema';

async function seedUsers() {
  const app = await NestFactory.create(AppModule);
  const userModel = app.get(getModelToken(User.name));

  const users = [
    {
      email: 'superadmin@glovia.com.np',
      password: 'SuperAdmin123!',
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+977-9800000001',
      role: UserRole.SUPER_ADMIN,
      isEmailVerified: true,
      trustScore: 100,
    },
    {
      email: 'admin@glovia.com.np',
      password: 'Admin123!',
      firstName: 'Admin',
      lastName: 'User',
      phone: '+977-9800000002',
      role: UserRole.ADMIN,
      isEmailVerified: true,
      trustScore: 100,
    },
    {
      email: 'vendor@glovia.com.np',
      password: 'Vendor123!',
      firstName: 'Vendor',
      lastName: 'Account',
      phone: '+977-9800000003',
      role: UserRole.VENDOR,
      isEmailVerified: true,
      trustScore: 75,
    },
    {
      email: 'user@glovia.com.np',
      password: 'User123!',
      firstName: 'Regular',
      lastName: 'User',
      phone: '+977-9800000004',
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      trustScore: 50,
    },
  ];

  try {
    for (const userData of users) {
      // Check if user already exists
      const existingUser = await userModel.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`✓ User ${userData.email} already exists`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcryptjs.hash(userData.password, 10);

      // Create user
      const user = await userModel.create({
        ...userData,
        password: hashedPassword,
      });

      console.log(`✓ Created ${userData.role}: ${userData.email}`);
      console.log(`  Password: ${userData.password}`);
    }

    console.log('\n✓ User seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding users:', error.message);
  } finally {
    await app.close();
  }
}

seedUsers().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
