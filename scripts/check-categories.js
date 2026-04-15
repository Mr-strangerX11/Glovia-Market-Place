#!/usr/bin/env node
/**
 * Check Available Categories for Bulk Upload
 * Lists all valid categories that can be used in bulk upload CSV
 * 
 * Usage: node check-categories.js
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1';

async function checkCategories() {
  try {
    console.log('🔍 Fetching available categories from API...\n');
    
    const { data } = await axios.get(`${API_URL}/categories`);
    const categories = data.data || data || [];

    if (categories.length === 0) {
      console.log('❌ No categories found in database');
      process.exit(1);
    }

    console.log(`✅ Found ${categories.length} categories:\n`);
    console.log('Category Name                 | MongoDB ID                   | Subcategories');
    console.log('-'.repeat(100));

    categories.forEach(cat => {
      const id = (cat._id || cat.id || '').toString().substring(0, 24);
      const name = (cat.name || '').padEnd(28);
      const subcats = (cat.subcategories || []).map(s => s.name || s).join(', ');
      
      console.log(`${name} | ${id} | ${subcats}`);
    });

    console.log('\n📝 Use these category names in your CSV:');
    categories.forEach(cat => {
      console.log(`   "${cat.name}"`);
    });

    console.log('\n💡 Example CSV usage:');
    if (categories.length > 0) {
      console.log(`   Category,Sub-Category`);
      console.log(`   "${categories[0].name}","Example Subcategory"`);
    }

    console.log('\n✨ Tip: When creating your CSV, use the exact category name from above');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.log('\n💡 Make sure backend is running at:', API_URL);
    console.log('   Use: export API_URL=http://localhost:3001/api/v1');
    process.exit(1);
  }
}

checkCategories();
