# Bulk Product Upload - Troubleshooting Guide

## Problem Diagnosis
Your CSV file has invalid references that are preventing bulk upload:

### Issues Found in Your CSV:
```
❌ categoryId: "https://glovia.com.np/products?category=skincare&search=Skincare"
   Should be: MongoDB ObjectId (24 hex characters like "507f1f77bcf86cd799439011")

❌ brandId: "mamaearth"
   Should be: MongoDB ObjectId or leave empty

❌ vendorId: "MM cosmetics"  
   Should be: MongoDB ObjectId or leave empty

❌ Extra column: "Ml/gm"
   Not recognized - will cause parsing issues
```

## Solution Steps

### Step 1: Get Valid ObjectIds
You need the actual MongoDB ObjectIds for categories, brands, and vendors.

**Option A: Use the Helper Script**
```bash
cd /Users/macbook/Desktop/Glovia/web
export ADMIN_TOKEN="your_jwt_token_here"
export API_URL="http://localhost:3001/api/v1"
node scripts/get-valid-ids.js
```

**Option B: Query Directly in MongoDB**
```bash
# Connect to MongoDB and run:
db.categories.find({}, { name: 1, _id: 1 }).pretty()
db.brands.find({}, { name: 1, _id: 1 }).pretty()
db.users.find({ role: "VENDOR" }, { email: 1, name: 1, _id: 1 }).pretty()
```

### Step 2: Update Your CSV File

**Required Columns (in exact order):**
```
name, slug, description, price, compareAtPrice, sku, stockQuantity, 
categoryId, brandId, vendorId, ingredients, benefits, howToUse, 
isFeatured, isBestSeller, isNew, tags, imageUrls
```

**Remove:** The "Ml/gm" column - it's not part of the schema

**Example Valid Row:**
```csv
"Mamaearth Charcoal Face Wash","mamaearth-charcoal-face-wash","Description here","430","500","mamaearth-charcoal-face-wash","100","507f1f77bcf86cd799439011","507f1f77bcf86cd799439012","507f1f77bcf86cd799439013","Charcoal","Removes dirt","Apply on wet face","false","false","true","skincare,charcoal","https://image.jpg"
```

**CSV Rules:**
- ✅ All values must be quoted (even numbers and booleans)
- ✅ categoryId: Required - must be valid MongoDB ObjectId
- ✅ brandId: Optional - leave empty if not applicable
- ✅ vendorId: Optional - leave empty if not applicable  
- ✅ Boolean fields: Use lowercase `true` or `false`
- ✅ Tags: Comma-separated, NOT in quotes inside the field (comma-separate the values)
- ✅ imageUrls: Comma-separated URLs

### Step 3: Validate Before Upload

The frontend will show validation errors for each row:
- Missing required fields → Row rejected
- Invalid categoryId → Row rejected
- SKU already exists → Row rejected
- Invalid price format → Row rejected

### Step 4: Upload via Admin Panel

1. Go to: `/admin/products/bulk`
2. Download the template button (or use the corrected CSV)
3. Fill with valid IDs
4. Upload CSV
5. Review preview (Step 2 shows all errors)
6. Click "Upload X valid products"

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "valid categoryId required" | categoryId is URL/name, not ObjectId | Get actual MongoDB ID for category |
| "Category not found" | ObjectId doesn't exist in database | Verify ID with `db.categories.findById()` |
| "SKU already exists" | Duplicate SKU in database | Use unique SKU values |
| "Slug already exists" | Duplicate slug in database | Use unique slug values |
| "Invalid price" | Price is NaN or negative | Use valid number like "430" |

## Testing with Small Batch

Before uploading 1000 products:
1. Create corrected CSV with 2-3 rows only
2. Validate all required fields are present
3. Upload and check results
4. Once working, batch upload remaining products

## Backend Logs

If you still get error "Upload failed. Please try again":

1. Check backend logs:
```bash
docker logs glovia-backend  # If running in Docker
# or
tail -f backend.log         # If running locally
```

2. Look for MongoDB connection errors or validation errors

3. Check your JWT token is still valid (401 Unauthorized)

## Files Provided

- `/scripts/get-valid-ids.js` - Script to fetch valid Category/Brand/Vendor IDs
- `/glovia-products-template-CORRECTED.csv` - Proper CSV format template

