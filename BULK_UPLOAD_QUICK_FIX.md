# Quick Fix Guide - Bulk Product Upload

## 🚀 Quick Start (5 minutes)

### Option 1: Auto-Map Your CSV with Valid IDs (Easiest)

```bash
cd /Users/macbook/Desktop/Glovia/web

# Get your admin JWT token and run:
ADMIN_TOKEN="your_jwt_token_here" \
API_URL="http://localhost:3001/api/v1" \
node scripts/map-ids-in-csv.js "glovia-products-template (3).csv" products-ready.csv
```

This will automatically replace category/brand/vendor names with valid MongoDB ObjectIds from your database.

Then upload `products-ready.csv` to `/admin/products/bulk`

---

### Option 2: Manual Steps

**Step 1:** Clean your CSV
```bash
node scripts/clean-csv.js "glovia-products-template (3).csv" products-cleaned.csv
```

**Step 2:** Get valid IDs
```bash
ADMIN_TOKEN="your_jwt_token_here" \
node scripts/get-valid-ids.js
```

**Step 3:** Edit CSV and replace:
- `categoryId` → actual MongoDB ID (from output above)
- `brandId` → actual MongoDB ID (or leave empty)
- `vendorId` → actual MongoDB ID (or leave empty)

**Step 4:** Upload `products-cleaned.csv`

---

## 📋 CSV Requirements

**Column Order (exact):**
```
name, slug, description, price, compareAtPrice, sku, stockQuantity,
categoryId, brandId, vendorId, ingredients, benefits, howToUse,
isFeatured, isBestSeller, isNew, tags, imageUrls
```

**Important:**
- ✅ Remove the `Ml/gm` column from your current CSV
- ✅ categoryId: Must be valid MongoDB ObjectId (required)
- ✅ brandId: Can be empty if not applicable
- ✅ vendorId: Can be empty if not applicable
- ✅ All values in quotes: `"value"`
- ✅ Boolean: lowercase `true` or `false`

**Example Row:**
```csv
"Product Name","product-slug","Description text","430","500","SKU-001","100","507f1f77bcf86cd799439011","507f1f77bcf86cd799439012","","ingredients","benefits","usage","false","false","true","tag1,tag2","https://url1.jpg"
```

---

## 🔍 Problem Diagnosis

Your current CSV errors:
```
❌ categoryId: "https://glovia.com.np/..." (URL, should be ObjectId)
❌ brandId: "mamaearth" (name, should be ObjectId or empty)
❌ vendorId: "MM cosmetics" (name, should be ObjectId or empty)
❌ Column: "Ml/gm" (extra, needs removal)
```

---

## 📁 Files Created For You

1. **`BULK_UPLOAD_TROUBLESHOOTING.md`** - Full troubleshooting guide
2. **`glovia-products-template-CORRECTED.csv`** - Proper CSV format template
3. **`scripts/clean-csv.js`** - Remove extra columns
4. **`scripts/get-valid-ids.js`** - Fetch valid category/brand/vendor IDs
5. **`scripts/map-ids-in-csv.js`** - Auto-map names to IDs

---

## 🎯 Where to Upload

- **Admin**: `http://localhost:3000/admin/products/bulk`
- **Vendor**: `http://localhost:3000/vendor/products/bulk`

---

## ❓ FAQ

**Q: How do I get the ADMIN_TOKEN?**
A: Log in to admin panel, open DevTools → Application → Cookies → copy `access_token`

**Q: Can I skip brandId and vendorId?**
A: Yes, leave them empty string `""` if not applicable

**Q: Why is my upload still failing?**
A: Check:
1. All required fields present (name, slug, description, sku, categoryId)
2. categoryId is valid MongoDB ObjectId (24 hex chars)
3. No duplicate SKU or slug in database
4. Prices are numbers, not zero or negative

**Q: How many products can I upload at once?**
A: Recommended: 100-500 per batch for better performance

