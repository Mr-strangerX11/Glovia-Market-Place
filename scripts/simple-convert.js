#!/usr/bin/env node
/**
 * Simple CSV Converter - No Dependencies
 * Converts custom format → backend format
 */

const fs = require('fs');

// Mock category IDs (we'll use placeholder IDs that should be in the system)
// In real scenario, these would be fetched from API
const CATEGORY_MAP = {
  'beauty': 'BEAUTY_ID',
  'pharmacy': 'PHARMACY_ID',
  'groceries': 'GROCERIES_ID',
  'clothes & shoes': 'CLOTHES_SHOES_ID',
  'essentials': 'ESSENTIALS_ID'
};

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

function convertRow(userRow) {
  const [
    productName, slug, description, priceStr, discountStr, stockQtyStr, 
    sizeVolume, sku, category, subCategory, brand, vendor, imageUrls, 
    productFlags, featuredStr, newArrivalStr
  ] = userRow;

  const price = parseFloat(priceStr) || 0;
  const discount = parseFloat(discountStr) || 0;
  const stockQty = parseInt(stockQtyStr) || 0;
  
  // Calculate compareAtPrice
  const compareAtPrice = discount > 0 ? Math.round(price / (1 - (discount / 100))) : price;

  // Map category to placeholder ID
  let categoryId = CATEGORY_MAP[category.toLowerCase()] || 'UNKNOWN_CATEGORY';

  // Combine tags
  const tags = [];
  if (productFlags && productFlags.trim()) {
    productFlags.split(',').forEach(tag => tags.push(tag.trim()));
  }
  if (sizeVolume && sizeVolume.trim()) {
    tags.push(`size:${sizeVolume}`);
  }
  if (subCategory && subCategory.trim()) {
    tags.push(subCategory.trim());
  }

  const isFeatured = featuredStr.toLowerCase() === 'true' || featuredStr === '1';
  const isNew = newArrivalStr.toLowerCase() === 'true' || newArrivalStr === '1';

  return [
    `"${productName}"`,
    `"${slug}"`,
    `"${description}"`,
    `"${price}"`,
    `"${compareAtPrice}"`,
    `"${sku}"`,
    `"${stockQty}"`,
    `"${categoryId}"`,
    `"${brand || ''}"`,
    `"${vendor || ''}"`,
    `"${sizeVolume || ''}"`,
    `"${subCategory || ''}"`,
    `"${productFlags || ''}"`,
    `"${isFeatured ? 'true' : 'false'}"`,
    `"false"`,
    `"${isNew ? 'true' : 'false'}"`,
    `"${tags.join(',')}"`,
    `"${imageUrls || ''}"`
  ];
}

function convert(inputFile, outputFile) {
  const content = fs.readFileSync(inputFile, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  const BACKEND_HEADERS = [
    'name', 'slug', 'description', 'price', 'compareAtPrice', 'sku', 'stockQuantity',
    'categoryId', 'brandId', 'vendorId', 'ingredients', 'benefits', 'howToUse',
    'isFeatured', 'isBestSeller', 'isNew', 'tags', 'imageUrls'
  ];

  let output = BACKEND_HEADERS.map(h => `"${h}"`).join(',') + '\n';

  for (let i = 1; i < lines.length; i++) {
    const userRowValues = parseCSVRow(lines[i]);
    const convertedRow = convertRow(userRowValues);
    output += convertedRow.join(',') + '\n';
  }

  fs.writeFileSync(outputFile, output.trim(), 'utf-8');
  console.log(`✅ Converted ${lines.length - 1} rows`);
  console.log(`📁 Output: ${outputFile}`);
}

convert(process.argv[2], process.argv[3]);
