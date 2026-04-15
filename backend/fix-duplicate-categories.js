const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://glovianepal_db_user:pass123@glovia.trmllne.mongodb.net/glovia';

async function main() {
  try {
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection;
    const categoriesCollection = db.collection('categories');

    // Remove duplicates
    console.log('🔍 Removing existing Beauty and Essentials categories...\n');
    
    // Find and delete Beauty
    const beautyResult = await categoriesCollection.deleteMany({ name: 'Beauty' });
    console.log(`✅ Removed ${beautyResult.deletedCount} "Beauty" category/categories`);

    // Find and delete Essentials
    const essentialsResult = await categoriesCollection.deleteMany({ name: 'Essentials' });
    console.log(`✅ Removed ${essentialsResult.deletedCount} "Essentials" category/categories`);

    console.log('\n➕ Creating fresh categories...\n');

    // Create Beauty
    const beautyCategory = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Beauty',
      slug: 'beauty',
      description: 'Beauty products for all your needs',
      type: 'BEAUTY',
      isActive: true,
      displayOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0,
    };
    const beautyResult2 = await categoriesCollection.insertOne(beautyCategory);
    console.log(`✅ Created: Beauty (ID: ${beautyResult2.insertedId})`);

    // Create Essentials
    const essentialsCategory = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Essentials',
      slug: 'essentials',
      description: 'Daily essentials and household items',
      type: 'ESSENTIALS',
      isActive: true,
      displayOrder: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0,
    };
    const essentialsResult2 = await categoriesCollection.insertOne(essentialsCategory);
    console.log(`✅ Created: Essentials (ID: ${essentialsResult2.insertedId})`);

    console.log('\n✨ All categories updated successfully!');

    // List all categories
    console.log('\n📋 Final category list:\n');
    const allCategories = await categoriesCollection.find({}).toArray();
    allCategories.forEach((cat, idx) => {
      console.log(`${idx + 1}. ${cat.name} (${cat.slug}) - ID: ${cat._id}`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from MongoDB');
  }
}

main();
