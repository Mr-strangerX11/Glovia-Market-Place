#!/usr/bin/env node
/**
 * CSV ID Mapper - Maps category/brand/vendor names to MongoDB ObjectIds
 * Usage: ADMIN_TOKEN=xyz API_URL=http://localhost:3001/api/v1 node map-ids-in-csv.js input.csv output.csv
 * 
 * This script will:
 * 1. Fetch all valid categories, brands, vendors from API
 * 2. Build a mapping of names to ObjectIds
 * 3. Replace names in CSV with actual ObjectIds
 */

const fs = require('fs');
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const REQUIRED_HEADERS = [
  'name', 'slug', 'description', 'price', 'compareAtPrice',
  'sku', 'stockQuantity', 'categoryId', 'brandId', 'vendorId',
  'ingredients', 'benefits', 'howToUse',
  'isFeatured', 'isBestSeller', 'isNew', 'tags', 'imageUrls'
];

async function fetchMappings() {
  try {
    const headers = { Authorization: `Bearer ${ADMIN_TOKEN}` };

    console.log('🔄 Fetching categories...');
    const catRes = await axios.get(`${API_URL}/categories`, { headers });
    const categories = catRes.data.data || catRes.data || [];

    console.log('🔄 Fetching brands...');
    const brandRes = await axios.get(`${API_URL}/admin/brands`, { headers });
    const brands = brandRes.data.data || brandRes.data || [];

    console.log('🔄 Fetching vendors...');
    const vendorRes = await axios.get(`${API_URL}/admin/users?role=VENDOR`, { headers });
    const vendors = vendorRes.data.data || vendorRes.data || [];

    // Create name -> ID mappings (case-insensitive)
    const categoryMap = {};
    const brandMap = {};
    const vendorMap = {};

    categories.forEach(cat => {
      const id = cat._id || cat.id;
      if (cat.name) categoryMap[cat.name.toLowerCase()] = id;
    });

    brands.forEach(brand => {
      const id = brand._id || brand.id;
      if (brand.name) brandMap[brand.name.toLowerCase()] = id;
    });

    vendors.forEach(vendor => {
      const id = vendor._id || vendor.id;
      if (vendor.name) vendorMap[vendor.name.toLowerCase()] = id;
      if (vendor.email) vendorMap[vendor.email.toLowerCase()] = id;
    });

    console.log(`✅ Loaded ${Object.keys(categoryMap).length} categories`);
    console.log(`✅ Loaded ${Object.keys(brandMap).length} brands`);
    console.log(`✅ Loaded ${Object.keys(vendorMap).length} vendors\n`);

    return { categoryMap, brandMap, vendorMap };
  } catch (error) {
    console.error('❌ Error fetching mappings:', error.response?.data?.message || error.message);
    process.exit(1);
  }
}

function parseCSVRow(line) {
  const values = [];
  let inQuotes = false;
  let current = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function mapCSV(inputFile, outputFile, mappings) {
  try {
    const content = fs.readFileSync(inputFile, 'utf-8');
    const lines = content.split('\n');

    if (lines.length === 0) {
      console.error('ERROR: Empty CSV file');
      process.exit(1);
    }

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVRow(headerLine).map(h => h.replace(/^"|"$/g, '').trim());

    console.log(`📋 Processing CSV with ${headers.length} columns`);

    // Find column indices
    const categoryIdx = headers.findIndex(h => h.toLowerCase() === 'categoryid');
    const brandIdx = headers.findIndex(h => h.toLowerCase() === 'brandid');
    const vendorIdx = headers.findIndex(h => h.toLowerCase() === 'vendorid');

    const categoryMap = mappings.categoryMap;
    const brandMap = mappings.brandMap;
    const vendorMap = mappings.vendorMap;

    let output = REQUIRED_HEADERS.map(h => `"${h}"`).join(',') + '\n';
    let replacedCount = { category: 0, brand: 0, vendor: 0 };

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVRow(line);

      // Map IDs
      if (categoryIdx !== -1 && values[categoryIdx]) {
        const original = values[categoryIdx].replace(/^"|"$/g, '').trim();
        if (original && !original.match(/^[0-9a-f]{24}$/i)) {
          const mapped = categoryMap[original.toLowerCase()];
          if (mapped) {
            values[categoryIdx] = `"${mapped}"`;
            replacedCount.category++;
            console.log(`  ℹ️  Row ${i}: category "${original}" → "${mapped}"`);
          } else {
            console.warn(`  ⚠️  Row ${i}: category "${original}" not found in database`);
          }
        }
      }

      if (brandIdx !== -1 && values[brandIdx]) {
        const original = values[brandIdx].replace(/^"|"$/g, '').trim();
        if (original && !original.match(/^[0-9a-f]{24}$/i)) {
          const mapped = brandMap[original.toLowerCase()];
          if (mapped) {
            values[brandIdx] = `"${mapped}"`;
            replacedCount.brand++;
          }
        }
      }

      if (vendorIdx !== -1 && values[vendorIdx]) {
        const original = values[vendorIdx].replace(/^"|"$/g, '').trim();
        if (original && !original.match(/^[0-9a-f]{24}$/i)) {
          const mapped = vendorMap[original.toLowerCase()];
          if (mapped) {
            values[vendorIdx] = `"${mapped}"`;
            replacedCount.vendor++;
          }
        }
      }

      // Ensure all required columns exist
      const rowData = REQUIRED_HEADERS.map(header => {
        const idx = headers.findIndex(h => h.toLowerCase() === header.toLowerCase());
        if (idx === -1) return '""';
        return values[idx] || '""';
      });

      output += rowData.join(',') + '\n';
    }

    fs.writeFileSync(outputFile, output.trim(), 'utf-8');

    console.log(`\n✨ Successfully mapped IDs!`);
    console.log(`📊 Replacements made:`);
    console.log(`   - Categories: ${replacedCount.category}`);
    console.log(`   - Brands: ${replacedCount.brand}`);
    console.log(`   - Vendors: ${replacedCount.vendor}`);
    console.log(`📁 Output: ${outputFile}`);

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

// Main
if (process.argv.length < 4) {
  console.log('CSV ID Mapper - Map category/brand/vendor names to ObjectIds');
  console.log('');
  console.log('Requirements:');
  console.log('  ADMIN_TOKEN - JWT token with admin access');
  console.log('  API_URL - Base API URL (default: http://localhost:3001/api/v1)');
  console.log('');
  console.log('Usage: ADMIN_TOKEN=xyz API_URL=http://localhost:3001/api/v1 node map-ids-in-csv.js <input.csv> <output.csv>');
  console.log('');
  console.log('Example:');
  console.log('  ADMIN_TOKEN=eyJhbGc... node map-ids-in-csv.js "glovia-products-template (3).csv" products-mapped.csv');
  process.exit(1);
}

if (!ADMIN_TOKEN) {
  console.error('❌ ERROR: ADMIN_TOKEN environment variable required');
  process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!fs.existsSync(inputFile)) {
  console.error(`❌ ERROR: Input file not found: ${inputFile}`);
  process.exit(1);
}

console.log(`📂 Input: ${inputFile}`);
console.log(`📂 Output: ${outputFile}`);
console.log(`🔗 API: ${API_URL}\n`);

(async () => {
  const mappings = await fetchMappings();
  mapCSV(inputFile, outputFile, mappings);
})();
