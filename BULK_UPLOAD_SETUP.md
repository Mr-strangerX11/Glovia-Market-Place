# 🚀 Custom Bulk Product Upload - Complete Setup

## Overview

You can now upload products in bulk using your custom format:

```
Product Name | Slug | Description | Price (NRP) | Discount (%) | Stock Quantity |
Size/Volume | SKU | Category | Sub-Category | Brand | Vendor | 
Product Images | Product Flags | Featured Product | New Arrival
```

**No need to use MongoDB ObjectIds or complex formats - just use friendly names!**

---

## 📁 Files Provided

### 📋 Templates & Examples
- **`BULK_UPLOAD_TEMPLATE_CUSTOM.csv`** ← **START HERE** 
  - Your custom format with 6 example products
  - Copy and edit this file with your products

### 🔧 Scripts (Tools)
1. **`scripts/convert-bulk-csv.js`** ← MAIN SCRIPT
   - Converts your CSV → backend format
   - Handles all mappings & calculations
   - Shows errors clearly
   
2. **`scripts/check-categories.js`**
   - Lists all available categories
   - Helps you choose correct category names
   
3. **Previous scripts** (if needed)
   - `scripts/map-ids-in-csv.js`
   - `scripts/get-valid-ids.js`
   - `scripts/clean-csv.js`

### 📚 Documentation
1. **`CUSTOM_BULK_UPLOAD_GUIDE.md`** ← READ THIS FIRST
   - Complete guide with field descriptions
   - Examples, troubleshooting, workflow
   - ~300 lines, very detailed

2. **`BULK_UPLOAD_QUICK_REFERENCE.md`**
   - Quick lookup reference
   - Common errors & fixes
   - One-page cheat sheet

3. **Other guides** (from initial fix)
   - `BULK_UPLOAD_QUICK_FIX.md`
   - `BULK_UPLOAD_TROUBLESHOOTING.md`
   - `VALIDATION_CHECKLIST.md`

---

## ⚡ Quick Start (3 Steps)

### Step 1: Prepare Your Products CSV

```bash
# Copy the template
cp BULK_UPLOAD_TEMPLATE_CUSTOM.csv my-products.csv

# Open in Excel, Google Sheets, or text editor
# Fill in your products (16 columns)
# Save as CSV
```

**Required columns to fill:**
- ✅ Product Name
- ✅ Slug (unique identifier)
- ✅ Description
- ✅ Price (NRP)
- ✅ Stock Quantity
- ✅ SKU (unique)
- ✅ Category (Beauty, Pharmacy, Groceries, Clothes & Shose, Essentials)

### Step 2: Convert to Backend Format

```bash
cd /Users/macbook/Desktop/Glovia/web

# Check available categories first (optional but recommended)
node scripts/check-categories.js

# Convert your CSV
node scripts/convert-bulk-csv.js my-products.csv products-ready.csv
```

**Output will show:**
```
🔄 Fetching category and brand mappings...
✅ Loaded 5 categories
✅ Loaded 12 brands

✨ Conversion complete!
📊 Results:
   ✅ Success: 98 rows
   ❌ Failed: 2 rows

📁 Output: products-ready.csv
Next: Upload "products-ready.csv" to the admin or vendor bulk upload page
```

### Step 3: Upload to Your System

1. Open: `http://localhost:3000/admin/products/bulk` 
   (or `/vendor/products/bulk` for vendors)

2. Upload: `products-ready.csv`

3. Review: Check preview for any rows with errors

4. Submit: Click "Upload X products"

5. Done! ✅

---

## 🎯 Your CSV Column Mapping

| Your Column | Example Value | Required | Notes |
|------------|---------------|----------|-------|
| Product Name | "Himalaya Milk" | ✅ | Main product name |
| Slug | "himalaya-milk-200ml" | ✅ | URL-friendly, must be unique |
| Description | "Gentle natural..." | ✅ | Product description |
| Price (NRP) | "350" | ✅ | Price in Nepali Rupees |
| Discount (%) | "10" | ❌ | Optional discount (0-100) |
| Stock Quantity | "100" | ✅ | Units available |
| Size/Volume | "200ml" | ❌ | Stored as product tag |
| SKU | "HIMALAYA-001" | ✅ | Unique stock code |
| Category | "Beauty" | ✅ | Must match: Beauty, Pharmacy, Groceries, Clothes & Shose, Essentials |
| Sub-Category | "Skincare" | ❌ | Stored as product tag |
| Brand | "Himalaya" | ❌ | Optional (auto-mapped if exists) |
| Vendor | "" | ❌ | Leave empty for now |
| Product Images | "https://url1.jpg,https://url2.jpg" | ❌ | Comma-separated URLs |
| Product Flags | "organic,natural" | ❌ | Comma-separated tags |
| Featured Product | "true" | ❌ | true or false (lowercase) |
| New Arrival | "false" | ❌ | true or false (lowercase) |

---

## 🧮 Conversion Details

### What the Converter Does:

1. **Reads** your 16-column CSV
2. **Validates** required fields (Name, Slug, Description, Price, SKU, Category)
3. **Maps** category names → MongoDB ObjectIds
4. **Calculates** compareAtPrice from discount %
5. **Combines** Size, Sub-Category, Flags into tags
6. **Maps** brand names → brand IDs (optional)
7. **Outputs** 18-column CSV ready for the system

### Discount Calculation Example:
```
Your input:  Price=100, Discount=10%
Calculator:  100 / (1 - 0.10) = 100 / 0.90 = 111.11
Output:      Price=100, CompareAtPrice=111
(Shows: "111 → 100" like a 10% discount)
```

---

## ✅ Pre-Upload Checklist

- [ ] Template copied: `my-products.csv` created
- [ ] Products added with required fields filled
- [ ] All SKUs unique (no duplicates)
- [ ] All slugs unique (no duplicates)
- [ ] Category names match exactly
- [ ] Prices are numbers (not text)
- [ ] Boolean fields use "true"/"false" (lowercase)
- [ ] Image URLs are valid and accessible
- [ ] Backend running at `http://localhost:3001/api/v1`
- [ ] Conversion script runs successfully
- [ ] Output file `products-ready.csv` created
- [ ] Frontend at `http://localhost:3000/admin/products/bulk` accessible

---

## 🔍 Check Before Converting

```bash
# 1. Verify backend is running
curl http://localhost:3001/api/v1/health

# 2. Check available categories
cd /Users/macbook/Desktop/Glovia/web
node scripts/check-categories.js

# 3. Verify category names in your CSV match exactly
```

---

## 📊 Example: Full Workflow

### Create products-backup.csv with initial data:
```csv
Product Name,Slug,Description,Price (NRP),Discount (%),Stock Quantity,Size/Volume,SKU,Category,Sub-Category,Brand,Vendor,Product Images,Product Flags,Featured Product,New Arrival
"Test Product","test-product","A test product","100","5","50","50ml","TEST-001","Beauty","Skincare","","","https://example.com/test.jpg","test","true","false"
```

### Run conversion:
```bash
node scripts/convert-bulk-csv.js products-backup.csv products-ready.csv
```

### Output:
```
✨ Conversion complete!
✅ Success: 1 rows
❌ Failed: 0 rows
📁 Output: products-ready.csv
```

### Check converted file:
```bash
head -2 products-ready.csv
# Shows: 18 columns ready for upload
```

### Upload:
- Go to `http://localhost:3000/admin/products/bulk`
- Upload `products-ready.csv`
- Done! ✅

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Category not found" | Run `node scripts/check-categories.js` and use exact name |
| "SKU already exists" | Change SKU to unique value |
| "Slug already exists" | Change slug to unique value |
| "Missing required fields" | Fill: Name, Slug, Description, Price, SKU, Category |
| Script not found | Run from: `/Users/macbook/Desktop/Glovia/web` |
| Backend not responding | Start backend: `node /path/to/backend/dist/main.js` |

---

## 📞 Support

1. **Read full guide:** `CUSTOM_BULK_UPLOAD_GUIDE.md` (has ~50 FAQs)
2. **Check quick reference:** `BULK_UPLOAD_QUICK_REFERENCE.md`
3. **Review examples:** `BULK_UPLOAD_TEMPLATE_CUSTOM.csv`
4. **API Docs:** `http://localhost:3001/api/docs`

---

## 🎉 Ready?

1. Copy template: `cp BULK_UPLOAD_TEMPLATE_CUSTOM.csv my-products.csv`
2. Edit your products in Excel or Google Sheets
3. Convert: `node scripts/convert-bulk-csv.js my-products.csv products-ready.csv`
4. Upload: Go to `/admin/products/bulk`
5. Done! ✅

**Good luck! Let me know if you need any help.** 🚀

