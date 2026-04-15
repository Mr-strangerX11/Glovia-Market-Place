#!/usr/bin/env node
/**
 * CSV Cleanser for Bulk Product Upload
 * Removes extra columns and prepares CSV for upload
 * Usage: node clean-csv.js input.csv output.csv
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_HEADERS = [
  'name', 'slug', 'description', 'price', 'compareAtPrice',
  'sku', 'stockQuantity', 'categoryId', 'brandId', 'vendorId',
  'ingredients', 'benefits', 'howToUse',
  'isFeatured', 'isBestSeller', 'isNew', 'tags', 'imageUrls'
];

function cleanCSV(inputFile, outputFile) {
  try {
    const content = fs.readFileSync(inputFile, 'utf-8');
    const lines = content.split('\n');
    
    if (lines.length === 0) {
      console.error('ERROR: Empty CSV file');
      process.exit(1);
    }

    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim());
    
    console.log(`📋 Found ${headers.length} columns: ${headers.join(', ')}`);
    console.log(`✅ Required ${REQUIRED_HEADERS.length} columns`);

    // Find indices of required columns
    const columnIndices = {};
    const missingColumns = [];

    REQUIRED_HEADERS.forEach(required => {
      const idx = headers.findIndex(h => h.toLowerCase() === required.toLowerCase());
      if (idx === -1) {
        missingColumns.push(required);
      } else {
        columnIndices[required] = idx;
      }
    });

    if (missingColumns.length > 0) {
      console.warn(`⚠️  Missing columns: ${missingColumns.join(', ')}`);
    }

    // Reorder columns to match required headers
    let output = REQUIRED_HEADERS.map(h => `"${h}"`).join(',') + '\n';

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing - handle quoted fields
      const values = [];
      let inQuotes = false;
      let current = '';

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
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

      // Extract values in correct order
      const rowData = REQUIRED_HEADERS.map(header => {
        const idx = columnIndices[header];
        if (idx === undefined) return '""';
        const value = values[idx] || '';
        // Already quoted if it has quotes, otherwise add them
        return value.startsWith('"') ? value : `"${value}"`;
      });

      output += rowData.join(',') + '\n';
    }

    fs.writeFileSync(outputFile, output.trim(), 'utf-8');
    
    console.log(`\n✨ Successfully cleaned CSV!`);
    console.log(`📁 Output: ${outputFile}`);
    console.log(`\n⚠️  IMPORTANT NOTES:`);
    console.log(`   - Check that categoryId contains valid MongoDB ObjectIds`);
    console.log(`   - Use the get-valid-ids.js script to get valid IDs`);
    console.log(`   - Replace URLs and names with actual ObjectIds`);

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

// Main
if (process.argv.length < 4) {
  console.log('CSV Cleanser for Bulk Product Upload');
  console.log('');
  console.log('Usage: node clean-csv.js <input.csv> <output.csv>');
  console.log('');
  console.log('Example:');
  console.log('  node clean-csv.js "glovia-products-template (3).csv" products-cleaned.csv');
  process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!fs.existsSync(inputFile)) {
  console.error(`ERROR: Input file not found: ${inputFile}`);
  process.exit(1);
}

console.log(`📂 Input: ${inputFile}`);
console.log(`📂 Output: ${outputFile}\n`);

cleanCSV(inputFile, outputFile);
