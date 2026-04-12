const BASE = process.env.API_URL || 'https://backend-glovia.vercel.app/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'superadmin@glovia.com.np';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SuperAdmin123!';
const now = Date.now();
const results = [];

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, data };
}

function mark(name, pass, meta = '') {
  results.push({ name, pass, meta });
  console.log(`${pass ? '✅' : '❌'} ${name}${meta ? ` :: ${meta}` : ''}`);
}

function brief(payload) {
  if (!payload) return '';
  const asString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return asString.length > 220 ? `${asString.slice(0, 220)}...` : asString;
}

function extractId(payload) {
  return payload?._id || payload?.id || payload?.data?._id || payload?.data?.id || null;
}

async function run() {
  const init = await req('POST', '/admin/init');
  mark('POST /admin/init', init.status === 200, `status ${init.status}`);

  const fix = await req('POST', '/admin/fix-superadmin');
  mark('POST /admin/fix-superadmin', fix.status === 200, `status ${fix.status}`);

  let login = await req('POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (login.status !== 200) {
    login = await req('POST', '/auth/login', {
      email: 'admin@glovia.com.np',
      password: 'Admin123!',
    });
  }

  mark('POST /auth/login (admin)', login.status === 200, `status ${login.status} ${brief(login.data)}`);
  if (login.status !== 200) {
    console.log('No admin token; aborting protected tests.');
    process.exit(2);
  }

  const token = login.data?.accessToken;

  const getEndpoints = [
    '/health',
    '/categories',
    '/brands',
    '/products',
    '/banners',
    '/promocodes',
    '/popups',
    '/recommendations',
    '/admin/dashboard',
    '/admin/users',
    '/admin/products',
    '/admin/orders',
    '/admin/settings/delivery',
    '/admin/settings/announcement',
  ];

  for (const ep of getEndpoints) {
    const r = await req('GET', ep, null, ep.startsWith('/admin') ? token : undefined);
    mark(`GET ${ep}`, r.status >= 200 && r.status < 300, `status ${r.status}`);
  }

  const cat = await req(
    'POST',
    '/categories',
    {
      name: `API Test Cat ${now}`,
      slug: `api-test-cat-${now}`,
      description: 'temp',
      type: 'SKINCARE',
    },
    token,
  );
  mark('POST /categories', cat.status >= 200 && cat.status < 300, `status ${cat.status} ${brief(cat.data)}`);

  const brand = await req(
    'POST',
    '/brands',
    {
      name: `API Test Brand ${now}`,
      slug: `api-test-brand-${now}`,
      description: 'temp',
    },
    token,
  );
  mark('POST /brands', brand.status >= 200 && brand.status < 300, `status ${brand.status} ${brief(brand.data)}`);

  const catId = extractId(cat.data);
  const brandId = extractId(brand.data);

  const product = await req(
    'POST',
    '/admin/products',
    {
      name: `API Test Product ${now}`,
      slug: `api-test-product-${now}`,
      description: 'temp product',
      price: 199,
      sku: `API-SKU-${now}`,
      stockQuantity: 8,
      categoryId: catId,
      brandId: brandId || undefined,
      images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800'],
      isFeatured: false,
      isNew: true,
    },
    token,
  );
  mark('POST /admin/products', product.status >= 200 && product.status < 300, `status ${product.status} ${brief(product.data)}`);

  const banner = await req(
    'POST',
    '/admin/banners',
    {
      title: `API Test Banner ${now}`,
      subtitle: 'temp',
      imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200',
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200',
      link: '/products',
      isActive: true,
      priority: 1,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    },
    token,
  );
  mark('POST /admin/banners', banner.status >= 200 && banner.status < 300, `status ${banner.status} ${brief(banner.data)}`);

  const productId = extractId(product.data);
  const bannerId = extractId(banner.data);

  if (bannerId) {
    const delBanner = await req('DELETE', `/admin/banners/${bannerId}`, null, token);
    mark('DELETE /admin/banners/:id', delBanner.status >= 200 && delBanner.status < 300, `status ${delBanner.status} ${brief(delBanner.data)}`);
  } else {
    mark('DELETE /admin/banners/:id', false, 'no banner id');
  }

  if (productId) {
    const delProduct = await req('DELETE', `/admin/products/${productId}`, null, token);
    mark('DELETE /admin/products/:id', delProduct.status >= 200 && delProduct.status < 300, `status ${delProduct.status} ${brief(delProduct.data)}`);
  } else {
    mark('DELETE /admin/products/:id', false, 'no product id');
  }

  if (brandId) {
    const delBrand = await req('DELETE', `/brands/${brandId}`, null, token);
    mark('DELETE /brands/:id', delBrand.status >= 200 && delBrand.status < 300, `status ${delBrand.status} ${brief(delBrand.data)}`);
  } else {
    mark('DELETE /brands/:id', false, 'no brand id');
  }

  if (catId) {
    const delCat = await req('DELETE', `/categories/${catId}`, null, token);
    mark('DELETE /categories/:id', delCat.status >= 200 && delCat.status < 300, `status ${delCat.status} ${brief(delCat.data)}`);
  } else {
    mark('DELETE /categories/:id', false, 'no category id');
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log('FAILED:');
    failed.forEach((f) => console.log(`- ${f.name} (${f.meta})`));
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('Script error:', e?.message || e);
  process.exit(1);
});
