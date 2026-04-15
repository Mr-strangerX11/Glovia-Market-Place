const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://glovianepal_db_user:pass123@glovia.trmllne.mongodb.net/glovia';

// Categories to delete (by ID)
const CATEGORIES_TO_DELETE = [
  '69de72f164b2926dbb2f1d8b', // Face wash
  '6990895cbbc7fec47f170186', // Skincare
  '6990895cbbc7fec47f170187', // Haircare
  '6990895cbbc7fec47f170188', // Makeup
  '6990895cbbc7fec47f170189', // Organic
  '69b16030c7e83b850b2c597a', // moisturizer (sub-category)
  '6990895cbbc7fec47f17018a', // Herbal
  '69b16b544b9bbd574e7abea1', // serum (sub-category)
  '69b1377da6f6448730c985e6', // Perfume
];

// New categories to create
const NEW_CATEGORIES = [
  {
    name: 'Beauty',
    slug: 'beauty',
    description: 'Beauty products for all your needs',
    type: 'BEAUTY',
    isActive: true,
    displayOrder: 0,
  },
  {
    name: 'Pharmacy',
    slug: 'pharmacy',
    description: 'Pharmacy and healthcare products',
    type: 'PHARMACY',
    isActive: true,
    displayOrder: 1,
  },
  {
    name: 'Groceries',
    slug: 'groceries',
    description: 'Grocery and food items',
    type: 'GROCERIES',
    isActive: true,
    displayOrder: 2,
  },
  {
    name: 'Clothes & Shoes',
    slug: 'clothes-shoes',
    description: 'Clothing and footwear',
    type: 'CLOTHES_SHOES',
    isActive: true,
    displayOrder: 3,
  },
  {
    name: 'Essentials',
    slug: 'essentials',
    description: 'Daily essentials and household items',
    type: 'ESSENTIALS',
    isActive: true,
    displayOrder: 4,
  },
];

async function main() {
  try {
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection;
    const categoriesCollection = db.collection('categories');

    // Delete old categories
    console.log('🗑️  Deleting old categories...\n');
    const oldCategoryNames = [
      'Face wash',
      'Skincare',
      'Haircare',
      'Makeup',
      'Organic',
      'moisturizer',
      'Herbal',
      'serum',
      'Perfume',
    ];

    for (let i = 0; i < CATEGORIES_TO_DELETE.length; i++) {
      try {
        const result = await categoriesCollection.deleteOne({
          _id: new mongoose.Types.ObjectId(CATEGORIES_TO_DELETE[i]),
        });
        if (result.deletedCount > 0) {
          console.log(`✅ Deleted: ${oldCategoryNames[i]}`);
        } else {
          console.log(`⚠️  Not found: ${oldCategoryNames[i]}`);
        }
      } catch (err) {
        console.log(`❌ Error deleting ${oldCategoryNames[i]}:`, err.message);
      }
    }

    console.log('\n');

    // Create new categories
    console.log('➕ Creating new categories...\n');
    for (const category of NEW_CATEGORIES) {
      try {
        const newCategory = {
          ...category,
          _id: new mongoose.Types.ObjectId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          __v: 0,
        };
        const result = await categoriesCollection.insertOne(newCategory);
        console.log(`✅ Created: ${category.name} (ID: ${result.insertedId})`);
      } catch (err) {
        console.log(`❌ Error creating ${category.name}:`, err.message);
      }
    }

    console.log('\n✨ Category update complete!');
    console.log(
      '\nYour new categories are ready. You can now upload products to these categories.'
    );

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from MongoDB');
  }
}

main();
