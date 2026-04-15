#!/usr/bin/env node
/**
 * Custom Bulk Upload CSV Converter
 * Converts user-friendly CSV format to backend-compatible format
 * 
 * User Format:
 * Product Name, Slug, Description, Price (NRP), Discount (%), Stock Quantity, 
 * Size/Volume, SKU, Category, Sub-Category, Brand, Vendor, Product Images, 
 * Product Flags, Featured Product, New Arrival
 *
 * Backend Format:
 * name, slug, description, price, compareAtPrice, sku, stockQuantity, categoryId, 
 * brandId, vendorId, ingredients, benefits, howToUse, isFeatured, isBestSeller, 
 * isNew, tags, imageUrls
 *
 * Usage: ADMIN_TOKEN=xyz API_URL=http://localhost:3001/api/v1 node convert-bulk-csv.js input.csv output.csv
 */

const fs = require('fs');
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

// Predefined category mapping
const CATEGORY_NAMES = {
  'beauty': 'Beauty',
  'pharmacy': 'Pharmacy',
  'groceries': 'Groceries',
  'clothes & shose': 'Clothes & Shose',
  'essentials': 'Essentials'
};

async function fetchCategoryMap() {
  try {
    const { data } = await axios.get(`${API_URL}/categories`);
    const categories = data.data || data || [];
    
    const map = {};
    categories.forEach(cat => {
      if (cat.name) {
        map[cat.name.toLowerCase()] = cat._id || cat.id;
      }
    });
    
    return map;
  } catch (error) {
    console.warn('⚠️  Could not fetch categories from API, using category names as-is');
    return {};
  }
}

async function fetchBrandMap() {
  try {
    const headers = { Authorization: `Bearer ${ADMIN_TOKEN}` };
    const { data } = await axios.get(`${API_URL}/admin/brands`, { headers });
    const brands = data.data || data || [];
    
    const map = {};
    brands.forEach(brand => {
      if (brand.name) {
        map[brand.name.toLowerCase()] = brand._id || brand.id;
      }
    });
    
    return map;
  } catch (error) {
    console.warn('⚠️  Could not fetch brands from API');
    return {};
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

function convertRow(userRow, categoryMap, brandMap) {
  try {
    const [
      productName, slug, description, priceStr, discountStr, stockQtyStr, 
      sizeVolume, sku, category, subCategory, brand, vendor, imageUrls, 
      productFlags, featuredStr, newArrivalStr
    ] = userRow;

    // Validate required fields
    if (!productName || !slug || !description || !sku || !category) {
      throw new Error('Missing required fields');
    }

    const price = parseFloat(priceStr);
    const discount = parseFloat(discountStr) || 0;
    const stockQty = parseInt(stockQtyStr) || 0;
    
    // Calculate compareAtPrice (original price before discount)
    // If discount is 10%, compareAtPrice = price / (1 - 0.10) = price / 0.90
    const compareAtPrice = discount > 0 ? Math.round(price / (1 - (discount / 100))) : price;

    // Map category name to ID
    let categoryId = categoryMap[category.toLowerCase()];
    if (!categoryId) {
      // If not found, use the category name as-is (backend might validate)
      throw new Error(`Category not found: ${category}. Available: ${Object.keys(CATEGORY_NAMES).join(', ')}`);
    }

    // Map brand name to ID (optional)
    let brandId = '';
    if (brand && brand.trim()) {
      brandId = brandMap[brand.toLowerCase()] || '';
    }

    // Combine flags and size/volume into tags
    const tags = [];
    if (productFlags && productFlags.trim()) {
      productFlags.split(',').forEach(tag => tags.push(tag.trim()));
    }
    if (sizeVolume && sizeVolume.trim() && sizeVolume !== '-') {
      tags.push(`size:${sizeVolume}`);
    }
    if (subCategory && subCategory.trim()) {
      tags.push(subCategory.trim());
    }

    // Convert boolean fields
    const isFeatured = featuredStr.toLowerCase() === 'true' || featuredStr === '1';
    const isNew = newArrivalStr.toLowerCase() === 'true' || newArrivalStr === '1';

    return {
      name: productName.trim(),
      slug: slug.trim(),
      description: description.trim(),
      price,
      compareAtPrice,
      sku: sku.trim(),
      stockQuantity: stockQty,
      categoryId,
      brandId: brandId || undefined,
      vendorId: vendor && vendor.trim() ? vendor.trim() : undefined,
      ingredients: sizeVolume && sizeVolume.trim() ? `Size: ${sizeVolume}` : '',
      benefits: subCategory && subCategory.trim() ? `Category: ${subCategory}` : '',
      howToUse: '',
      isFeatured,
      isBestSeller: false,
      isNew,
      tags: tags.join(','),
      imageUrls: imageUrls.trim()
    };
  } catch (error) {
    throw new Error(`Row conversion failed: ${error.message}`);
  }
}

async function convert(inputFile, outputFile) {
  try {
    if (!fs.existsSync(inputFile)) {
      throw new Error(`Input file not found: ${inputFile}`);
    }

    console.log('🔄 Fetching category and brand mappings...');
    const categoryMap = await fetchCategoryMap();
    const brandMap = ADMIN_TOKEN ? await fetchBrandMap() : {};

    console.log(`✅ Loaded ${Object.keys(categoryMap).length} categories`);
    console.log(`✅ Loaded ${Object.keys(brandMap).length} brands\n`);

    const content = fs.readFileSync(inputFile, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    // Backend required headers
    const BACKEND_HEADERS = [
      'name', 'slug', 'description', 'price', 'compareAtPrice', 'sku', 'stockQuantity',
      'categoryId', 'brandId', 'vendorId', 'ingredients', 'benefits', 'howToUse',
      'isFeatured', 'isBestSeller', 'isNew', 'tags', 'imageUrls'
    ];

    let output = BACKEND_HEADERS.map(h => `"${h}"`).join(',') + '\n';
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const userRowValues = parseCSVRow(line);
        const convertedRow = convertRow(userRowValues, categoryMap, brandMap);

        // Format as CSV row
        const rowData = BACKEND_HEADERS.map(header => {
          const value = convertedRow[header] || '';
          return `"${value}"`;
        });

        output += rowData.join(',') + '\n';
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`Row ${i + 1}: ${error.message}`);
        console.warn(`⚠️  Row ${i + 1}: ${error.message}`);
      }
    }

    fs.writeFileSync(outputFile, output.trim(), 'utf-8');

    console.log('\n✨ Conversion complete!');
    console.log(`📊 Results:`);
    console.log(`   ✅ Success: ${successCount} rows`);
    console.log(`   ❌ Failed: ${errorCount} rows`);
    console.log(`📁 Output: ${outputFile}`);

    if (errorCount > 0 && errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      errors.slice(0, 10).forEach(err => console.log(`   ${err}`));
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more`);
      }
    }

    console.log(`\nNext: Upload "${outputFile}" to the admin or vendor bulk upload page`);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

// Main
if (process.argv.length < 4) {
  console.log('Custom CSV Converter for Bulk Product Upload');
  console.log('Converts user-friendly CSV format to backend format\n');
  console.log('Requirements:');
  console.log('  API_URL - Backend API URL (default: http://localhost:3001/api/v1)');
  console.log('  ADMIN_TOKEN - JWT token (optional, for brand mapping)\n');
  console.log('Usage: API_URL=http://localhost:3001/api/v1 node convert-bulk-csv.js <input.csv> <output.csv>\n');
  console.log('Example:');
  console.log('  node convert-bulk-csv.js products-custom.csv products-ready.csv\n');
  process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = process.argv[3];

console.log(`📂 Input: ${inputFile}`);
console.log(`📂 Output: ${outputFile}\n`);

convert(inputFile, outputFile);
