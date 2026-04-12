const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'https://backend-glovia.vercel.app/api/v1';
const ADMIN_EMAIL = 'superadmin@glovia.com.np';
const ADMIN_PASSWORD = 'SuperAdmin123!';

async function createProduct() {
  try {
    // 1. Login as admin
    console.log('Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    const token = loginResponse.data.accessToken;
    console.log('Login successful!');

    // 2. Upload image (if image file exists)
    let imageUrl = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800';
    
    const imagePath = path.join(__dirname, 'product-image.jpg');
    if (fs.existsSync(imagePath)) {
      console.log('Uploading image...');
      const formData = new FormData();
      formData.append('file', fs.createReadStream(imagePath));

      const uploadResponse = await axios.post(`${API_URL}/upload/image`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`,
        },
      });

      imageUrl = uploadResponse.data.url;
      console.log('Image uploaded:', imageUrl);
    } else {
      console.log('Using default image URL (no local image found)');
    }

    // 3. Get categories to find Skincare ID
    console.log('Getting categories...');
    const categoriesResponse = await axios.get(`${API_URL}/categories`);
    const skincareCategory = categoriesResponse.data.find(cat => 
      cat.name.toLowerCase() === 'skincare'
    );

    if (!skincareCategory) {
      throw new Error('Skincare category not found');
    }

    // 4. Create product
    console.log('Creating product...');
    const productData = {
      name: 'Derma Facewash',
      slug: 'derma-facewash',
      description: 'its an face wash',
      price: 500,
      discountPercentage: 5,
      stockQuantity: 47,
      sku: 'fw-12',
      categoryId: skincareCategory._id,
      images: [imageUrl],
      isFeatured: true,
      isNew: true,
    };

    const productResponse = await axios.post(`${API_URL}/admin/products`, productData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('\n✅ Product created successfully!');
    console.log('Product ID:', productResponse.data._id);
    console.log('Product Name:', productResponse.data.name);
    console.log('Final Price: ₨', productResponse.data.price - (productResponse.data.price * productResponse.data.discountPercentage / 100));
    console.log('\nView product at: /products/' + productResponse.data.slug);

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

createProduct();
