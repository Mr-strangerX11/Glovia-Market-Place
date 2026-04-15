const http = require('http');

const BASE_URL = 'http://localhost:3001/api/v1';

// Admin credentials
const ADMIN_EMAIL = 'admin@glovia.com.np';
const ADMIN_PASSWORD = 'AdminPass123!';

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
    displayOrder: 0,
  },
  {
    name: 'Pharmacy',
    slug: 'pharmacy',
    description: 'Pharmacy and healthcare products',
    type: 'PHARMACY',
    displayOrder: 1,
  },
  {
    name: 'Groceries',
    slug: 'groceries',
    description: 'Grocery and food items',
    type: 'GROCERIES',
    displayOrder: 2,
  },
  {
    name: 'Clothes & Shoes',
    slug: 'clothes-shoes',
    description: 'Clothing and footwear',
    type: 'CLOTHES_SHOES',
    displayOrder: 3,
  },
  {
    name: 'Essentials',
    slug: 'essentials',
    description: 'Daily essentials and household items',
    type: 'ESSENTIALS',
    displayOrder: 4,
  },
];

let authToken = '';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function login() {
  console.log('🔐 Logging in as admin...');
  try {
    const res = await makeRequest('POST', '/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (res.status === 200 && res.data.access_token) {
      authToken = res.data.access_token;
      console.log('✅ Login successful!');
      return true;
    } else {
      console.log('❌ Login failed:', res.data);
      return false;
    }
  } catch (err) {
    console.log('❌ Login error:', err.message);
    return false;
  }
}

async function deleteCategory(id, name) {
  try {
    const res = await makeRequest('DELETE', `/categories/${id}`);
    if (res.status === 200 || res.status === 204) {
      console.log(`✅ Deleted: ${name}`);
      return true;
    } else {
      console.log(`❌ Failed to delete ${name}:`, res.data);
      return false;
    }
  } catch (err) {
    console.log(`❌ Error deleting ${name}:`, err.message);
    return false;
  }
}

async function createCategory(category) {
  try {
    const res = await makeRequest('POST', '/categories', category);
    if (res.status === 201 || res.status === 200) {
      console.log(`✅ Created: ${category.name}`);
      return true;
    } else {
      console.log(`❌ Failed to create ${category.name}:`, res.data);
      return false;
    }
  } catch (err) {
    console.log(`❌ Error creating ${category.name}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('📦 Category Management Tool\n');

  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without authentication');
    process.exit(1);
  }

  console.log('\n');

  // Step 2: Delete old categories
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
    await deleteCategory(CATEGORIES_TO_DELETE[i], oldCategoryNames[i]);
  }

  console.log('\n');

  // Step 3: Create new categories
  console.log('➕ Creating new categories...\n');
  for (const category of NEW_CATEGORIES) {
    await createCategory(category);
  }

  console.log('\n✨ Category update complete!');
}

main().catch(console.error);
