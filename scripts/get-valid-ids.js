#!/usr/bin/env node
/**
 * Script to fetch valid Category, Brand, and Vendor IDs for bulk product upload
 * Usage: node get-valid-ids.js
 */

const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:3001/api/v1';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN; // Set via env or update here

async function getValidIds() {
  try {
    if (!ADMIN_TOKEN) {
      console.error('ERROR: ADMIN_TOKEN environment variable not set');
      console.log('Usage: ADMIN_TOKEN=your_token API_URL=http://localhost:3001/api/v1 node get-valid-ids.js');
      process.exit(1);
    }

    const headers = { Authorization: `Bearer ${ADMIN_TOKEN}` };
    
    console.log('Fetching categories...');
    const categoriesRes = await axios.get(`${API_BASE}/categories`, { headers });
    const categories = categoriesRes.data.data || categoriesRes.data;
    
    console.log('Fetching brands...');
    const brandsRes = await axios.get(`${API_BASE}/admin/brands`, { headers });
    const brands = brandsRes.data.data || brandsRes.data;
    
    console.log('Fetching vendors...');
    const vendorsRes = await axios.get(`${API_BASE}/admin/users?role=VENDOR`, { headers });
    const vendors = vendorsRes.data.data || vendorsRes.data;

    console.log('\n=== CATEGORIES ===');
    categories.forEach(cat => {
      console.log(`${cat.name}: ${cat._id || cat.id}`);
    });

    console.log('\n=== BRANDS ===');
    brands.forEach(brand => {
      console.log(`${brand.name}: ${brand._id || brand.id}`);
    });

    console.log('\n=== VENDORS ===');
    vendors.slice(0, 10).forEach(vendor => {
      console.log(`${vendor.name} (${vendor.email}): ${vendor._id || vendor.id}`);
    });

    console.log('\nCopy these IDs into your CSV file.');
  } catch (error) {
    console.error('Error fetching data:', error.response?.data || error.message);
    process.exit(1);
  }
}

getValidIds();
