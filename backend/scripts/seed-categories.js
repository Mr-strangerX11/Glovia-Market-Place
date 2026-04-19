/**
 * Category Seeding Script
 * Creates parent categories and their subcategories
 * Works with NestJS + Mongoose setup
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const path = require('path');

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/glovia';

console.log('🔍 Environment Check:');
console.log(`   MONGODB_URI: ${MONGODB_URI ? '✓ Found' : '✗ Missing'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}\n`);

// Define Category Schema matching NestJS schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  image: String,
  type: { type: String, required: true },
  parentId: mongoose.Schema.Types.ObjectId,
  isMainCategory: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true, collection: 'categories' });

const Category = mongoose.model('Category', categorySchema);

// Category structure with parent and subcategories
const categoriesData = [
  {
    parent: {
      name: 'Beauty',
      slug: 'beauty',
      description: 'Beauty and personal care products',
      type: 'BEAUTY',
      displayOrder: 1,
      isMainCategory: true,
    },
    subcategories: [
      { name: 'Skincare', slug: 'skincare', type: 'SKINCARE', description: 'Cleansers, serums, moisturizers' },
      { name: 'Makeup', slug: 'makeup', type: 'MAKEUP', description: 'Foundation, lipstick, eyeshadow' },
      { name: 'Haircare', slug: 'haircare', type: 'HAIRCARE', description: 'Shampoo, conditioner, hair oil' },
      { name: 'Fragrance', slug: 'fragrance', type: 'FRAGRANCE', description: 'Perfumes, body mists, deodorants' },
      { name: 'Tools & Accessories', slug: 'tools-accessories', type: 'TOOLS_ACCESSORIES', description: 'Brushes, sponges, tools' },
    ],
  },
  {
    parent: {
      name: 'Pharmacy',
      slug: 'pharmacy',
      description: 'Medicines and healthcare products',
      type: 'PHARMACY',
      displayOrder: 2,
      isMainCategory: true,
    },
    subcategories: [
      { name: 'Medicines', slug: 'medicines', type: 'PHARMACY', description: 'Prescription and OTC medicines' },
      { name: 'Supplements', slug: 'supplements', type: 'PHARMACY', description: 'Vitamins, minerals, supplements' },
      { name: 'First Aid', slug: 'first-aid', type: 'PHARMACY', description: 'Bandages, ointments, first aid kits' },
      { name: 'Medical Devices', slug: 'medical-devices', type: 'PHARMACY', description: 'Thermometers, blood pressure monitors' },
      { name: 'Wellness', slug: 'wellness', type: 'PHARMACY', description: 'Health and wellness products' },
    ],
  },
  {
    parent: {
      name: 'Groceries',
      slug: 'groceries',
      description: 'Food and grocery items',
      type: 'GROCERIES',
      displayOrder: 3,
      isMainCategory: true,
    },
    subcategories: [
      { name: 'Fresh Produce', slug: 'fresh-produce', type: 'GROCERIES', description: 'Fruits, vegetables, herbs' },
      { name: 'Dairy & Eggs', slug: 'dairy-eggs', type: 'GROCERIES', description: 'Milk, cheese, yogurt, eggs' },
      { name: 'Beverages', slug: 'beverages', type: 'GROCERIES', description: 'Juices, soft drinks, tea, coffee' },
      { name: 'Snacks', slug: 'snacks', type: 'GROCERIES', description: 'Chips, cookies, biscuits, nuts' },
      { name: 'Grains & Cereals', slug: 'grains-cereals', type: 'GROCERIES', description: 'Rice, wheat, oats, flour' },
      { name: 'Condiments & Sauces', slug: 'condiments-sauces', type: 'GROCERIES', description: 'Oil, spices, sauces' },
    ],
  },
  {
    parent: {
      name: 'Clothes & Shoes',
      slug: 'clothes-shoes',
      description: 'Apparel and footwear',
      type: 'CLOTHES_SHOES',
      displayOrder: 4,
      isMainCategory: true,
    },
    subcategories: [
      { name: 'Men\'s Clothing', slug: 'mens-clothing', type: 'CLOTHES_SHOES', description: 'Shirts, pants, jackets' },
      { name: 'Women\'s Clothing', slug: 'womens-clothing', type: 'CLOTHES_SHOES', description: 'Dresses, tops, bottoms' },
      { name: 'Kids\' Clothing', slug: 'kids-clothing', type: 'CLOTHES_SHOES', description: 'Children\'s apparel' },
      { name: 'Footwear', slug: 'footwear', type: 'CLOTHES_SHOES', description: 'Shoes, sneakers, sandals' },
      { name: 'Accessories', slug: 'accessories', type: 'CLOTHES_SHOES', description: 'Belts, scarves, hats, bags' },
    ],
  },
  {
    parent: {
      name: 'Essentials',
      slug: 'essentials',
      description: 'Daily essential items',
      type: 'ESSENTIALS',
      displayOrder: 5,
      isMainCategory: true,
    },
    subcategories: [
      { name: 'Kitchen', slug: 'kitchen', type: 'ESSENTIALS', description: 'Cookware, utensils, appliances' },
      { name: 'Bathroom', slug: 'bathroom', type: 'ESSENTIALS', description: 'Toiletries, towels, mats' },
      { name: 'Cleaning Supplies', slug: 'cleaning-supplies', type: 'ESSENTIALS', description: 'Detergent, soaps, cleaning tools' },
      { name: 'Household Items', slug: 'household-items', type: 'ESSENTIALS', description: 'Bedding, furniture, storage' },
      { name: 'Lighting', slug: 'lighting', type: 'ESSENTIALS', description: 'Bulbs, lamps, fixtures' },
    ],
  },
];

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✓ Connected to MongoDB\n');
  } catch (error) {
    console.error('✗ MongoDB Connection Failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check MONGODB_URI in .env file');
    console.error('  2. Ensure MongoDB is running');
    console.error('  3. Verify database credentials and network access\n');
    process.exit(1);
  }
};

// Seed categories
const seedCategories = async () => {
  try {
    console.log('📦 Starting category seeding...\n');

    // Drop existing categories
    await Category.deleteMany({});
    console.log('✓ Cleared existing categories\n');

    let totalCreated = 0;
    const createdCategories = [];

    // Create parent categories and subcategories
    for (const categoryGroup of categoriesData) {
      try {
        // Create parent category
        const parent = new Category({
          ...categoryGroup.parent,
          isActive: true,
        });
        await parent.save();
        console.log(`✓ Parent: ${parent.name} (${parent.type})`);
        totalCreated++;
        createdCategories.push(parent);

        // Create subcategories
        for (let i = 0; i < categoryGroup.subcategories.length; i++) {
          const subData = categoryGroup.subcategories[i];
          const subcategory = new Category({
            ...subData,
            parentId: parent._id,
            isActive: true,
            displayOrder: i + 1,
          });
          await subcategory.save();
          console.log(`  ├─ ${subcategory.name}`);
          totalCreated++;
          createdCategories.push(subcategory);
        }
        console.log();
      } catch (error) {
        console.error(`✗ Error creating ${categoryGroup.parent.name}:`, error.message);
      }
    }

    console.log(`\n✅ Seeding Complete!\n`);
    console.log('📊 Summary:');
    console.log('  Parent Categories: 5');
    console.log('  Subcategories: 26');
    console.log(`  Total Created: ${totalCreated}\n`);

  } catch (error) {
    console.error('✗ Seeding error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await seedCategories();
    
    // Verify
    const count = await Category.countDocuments();
    console.log(`🔍 Verification: ${count} categories in database\n`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ Database connection closed');
    process.exit(0);
  }
};

// Run
main().catch(error => {
  console.error('Process error:', error);
  process.exit(1);
});

