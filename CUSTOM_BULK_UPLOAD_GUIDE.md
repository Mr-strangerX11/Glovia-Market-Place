# Custom Bulk Product Upload Guide

## 📋 Overview

This guide explains how to upload products in bulk using your custom format:

```
Product Name, Slug, Description, Price (NRP), Discount (%), Stock Quantity,
Size/Volume, SKU, Category, Sub-Category, Brand, Vendor, Product Images,
Product Flags, Featured Product, New Arrival
```

## 🚀 Quick Start (2 steps)

### Step 1: Prepare Your CSV File

Use the template: `BULK_UPLOAD_TEMPLATE_CUSTOM.csv`

**Example:**
```csv
Product Name,Slug,Description,Price (NRP),Discount (%),Stock Quantity,Size/Volume,SKU,Category,Sub-Category,Brand,Vendor,Product Images,Product Flags,Featured Product,New Arrival
"Himalaya Cleansing Milk","himalaya-milk","Gentle milk","350","10","100","200ml","HIMALAYA-001","Beauty","Skincare","Himalaya","MM cosmetics","https://img1.jpg","skincare,mild","true","true"
```

### Step 2: Convert to Backend Format

```bash
cd /Users/macbook/Desktop/Glovia/web

# Option A: Without brand mapping (quick)
node scripts/convert-bulk-csv.js your-products.csv products-ready.csv

# Option B: With brand mapping (requires admin token)
API_URL=http://localhost:3001/api/v1 \
ADMIN_TOKEN="your_jwt_token" \
node scripts/convert-bulk-csv.js your-products.csv products-ready.csv
```

Then upload `products-ready.csv` to `/admin/products/bulk` or `/vendor/products/bulk`

---

## 📝 Field Descriptions

| Field | Required | Format | Notes |
|-------|----------|--------|-------|
| **Product Name** | ✅ Yes | Text | Main product name |
| **Slug** | ✅ Yes | URL-safe text | Must be unique (e.g., "himalaya-milk-200ml") |
| **Description** | ✅ Yes | Text | Product description |
| **Price (NRP)** | ✅ Yes | Number | Price in Nepali Rupees (e.g., 350) |
| **Discount (%)** | ❌ No | Number 0-100 | Discount percentage (e.g., 10 for 10% off) |
| **Stock Quantity** | ✅ Yes | Number | Units in stock (e.g., 100) |
| **Size/Volume** | ❌ No | Text | Size/volume info (e.g., "200ml", "1kg", "M-XL") |
| **SKU** | ✅ Yes | Text | Must be unique (e.g., "HIMALAYA-001") |
| **Category** | ✅ Yes | Predefined | See options below |
| **Sub-Category** | ❌ No | Text | Custom subcategory (stored as tag) |
| **Brand** | ❌ No | Text | Brand name (mapped to brand ID if exists) |
| **Vendor** | ❌ No | Text | Vendor ID or name to assign product to |
| **Product Images** | ❌ No | URLs | Comma-separated image URLs |
| **Product Flags** | ❌ No | Text | Comma-separated tags (e.g., "organic,natural") |
| **Featured Product** | ❌ No | true/false | Mark as featured (true/false) |
| **New Arrival** | ❌ No | true/false | Mark as new (true/false) |

---

## 🏷️ Valid Categories

Use exact category name (case-insensitive):
- `Beauty`
- `Pharmacy`
- `Groceries`
- `Clothes & Shose`
- `Essentials`

**Note:** If category doesn't match, conversion will fail. Check available categories:

```bash
curl http://localhost:3001/api/v1/categories | jq '.[] | .name'
```

---

## 💡 Examples

### Example 1: Beauty Product with Discount
```csv
"Himalaya Cleansing Milk","himalaya-milk-200ml","Gentle cleansing milk for all skin types","350","10","100","200ml","HIMALAYA-MILK-001","Beauty","Skincare","Himalaya","MM cosmetics","https://example.com/img1.jpg,https://example.com/img2.jpg","natural,mild","true","false"
```

**What happens:**
- Price: 350 NPR
- Discount: 10% (original price becomes: 389 NPR)
- Stock: 100 units
- Size stored as tag: "size:200ml"
- Sub-category stored as tag: "Skincare"
- Flags added: "natural", "mild"
- Marked as featured product
- Not marked as new arrival

### Example 2: Pharmacy Product (No Discount)
```csv
"Paracetamol 500mg","paracetamol-500mg","Pain and fever relief","25","0","200","Pack of 10","PARA-500-001","Pharmacy","Pain Relief","","","https://example.com/img.jpg","medicine,tablet","false","false"
```

**What happens:**
- Price: 25 NPR (no discount, compareAtPrice also 25)
- No brand assigned
- No vendor assigned
- Tags: "medicine", "tablet", "size:Pack of 10", "Pain Relief"

### Example 3: Clothing (CSV Format)
```csv
"Cotton T-Shirt Blue","cotton-tshirt-blue","100% comfortable cotton t-shirt","400","20","75","M-XL","TSHIRT-001","Clothes & Shose","T-Shirts","","","https://example.com/img.jpg","casual,cotton","false","true"
```

---

## 🔄 Conversion Process

The converter does the following:

1. **Parses your custom CSV** with 16 columns
2. **Fetches category mappings** from the API (converts "Beauty" → MongoDBID)
3. **Calculates discount** (converts discount % to compareAtPrice)
4. **Combines fields** (Size, Sub-Category, Flags → tags)
5. **Validates required fields** (Name, Slug, Description, SKU, Category)
6. **Outputs backend format** with 18 columns ready for upload

### Conversion Mapping

| Your Field | → Backend Field | Notes |
|-----------|-----------------|-------|
| Discount (%) | compareAtPrice | Calculated from price and discount |
| Category | categoryId | Mapped via API lookup |
| Sub-Category | tags | Added to tags array |
| Size/Volume | tags | Added as "size:XXX" tag |
| Product Flags | tags | Split by comma and added |
| Brand | brandId | Optional, mapped if found |
| New Arrival | isNew | Boolean conversion |
| Featured Product | isFeatured | Boolean conversion |

---

## ⚠️ Common Issues & Fixes

### ❌ "Category not found"
**Problem:** Category name doesn't match exactly

**Solution:** Use correct category name:
```
✅ "Beauty"      (correct)
❌ "beauty"      (will fail - case sensitive in mappings)
❌ "BEAUTY"      (will fail)
❌ "Cosmetics"   (doesn't exist - use "Beauty")
```

### ❌ "Missing required fields"
**Problem:** One of the required fields is empty

**Example issue:**
```csv
"","himalaya-milk","Description","350","10","100","200ml","SKU","Beauty","",""
        ↑ Missing Product Name
```

**Solution:** Fill all required fields: ✅ Name, ✅ Slug, ✅ Description, ✅ Price, ✅ SKU, ✅ Category

### ❌ "SKU already exists"
**Problem:** SKU is duplicate in database

**Solution:** Use unique SKU for each product (add date/variant to make unique):
```
Bad:  HIMALAYA-001, HIMALAYA-001 (duplicate!)
Good: HIMALAYA-001-MILK, HIMALAYA-001-OIL (unique)
```

### ❌ "Slug already exists"
**Problem:** Slug is duplicate in database

**Solution:** Make slugs unique by adding variant info:
```
Bad:  himalaya-milk, himalaya-milk (duplicate!)
Good: himalaya-milk-200ml, himalaya-milk-500ml (unique)
```

### ✅ Brand not found → Brand left empty
**Note:** This is OK! If brand is not found in database, it's left empty. You can leave brand column empty if not using brands.

---

## 🎯 Workflow Example

### Create and upload 100 products:

**1. Create CSV file** (`my-products.csv`) with 100 rows using template

**2. Convert to backend format:**
```bash
node scripts/convert-bulk-csv.js my-products.csv my-products-converted.csv
```

Output:
```
🔄 Fetching category and brand mappings...
✅ Loaded 5 categories
✅ Loaded 12 brands

✨ Conversion complete!
📊 Results:
   ✅ Success: 98 rows
   ❌ Failed: 2 rows

⚠️  Errors encountered:
   Row 15: Missing required fields
   Row 42: SKU already exists
```

**3. Fix failed rows** (rows 15 and 42 in your CSV)

**4. Re-convert:**
```bash
node scripts/convert-bulk-csv.js my-products.csv my-products-converted.csv
```

Output:
```
✅ Loaded 5 categories
✅ Loaded 12 brands

✨ Conversion complete!
📊 Results:
   ✅ Success: 100 rows
   ❌ Failed: 0 rows

📁 Output: my-products-converted.csv
Next: Upload "my-products-converted.csv" to the admin or vendor bulk upload page
```

**5. Upload converted file:**
- Go to `/admin/products/bulk` or `/vendor/products/bulk`
- Select `my-products-converted.csv`
- Review preview
- Click "Upload 100 products"

**6. Check results** in admin dashboard

---

## 📂 Files Provided

| File | Purpose |
|------|---------|
| `BULK_UPLOAD_TEMPLATE_CUSTOM.csv` | CSV template with your field format + examples |
| `scripts/convert-bulk-csv.js` | Conversion script (reads custom format → backend format) |
| `CUSTOM_BULK_UPLOAD_GUIDE.md` | This guide (detailed documentation) |

---

## ✅ Final Checklist Before Upload

- [ ] CSV file has correct header row
- [ ] All 16 columns present (even if some empty)
- [ ] Required fields filled: Product Name, Slug, Description, Price, SKU, Category
- [ ] All SKUs unique in file AND database
- [ ] All slugs unique in file AND database
- [ ] Category name matches exactly (Beauty, Pharmacy, Groceries, Clothes & Shose, Essentials)
- [ ] Prices are numbers (not text)
- [ ] Discount is 0-100 or empty
- [ ] Boolean fields use "true" or "false" (lowercase)
- [ ] Image URLs are valid and accessible
- [ ] Conversion script runs without errors
- [ ] Converted CSV file has 18 columns
- [ ] Backend server is running (`http://localhost:3001/api/v1`)
- [ ] Frontend at `/admin/products/bulk` or `/vendor/products/bulk` accessible

---

## 🆘 Need Help?

1. **Check category names:**
   ```bash
   curl http://localhost:3001/api/v1/categories
   ```

2. **Run conversion with verbose output:**
   ```bash
   node scripts/convert-bulk-csv.js input.csv output.csv 2>&1 | head -50
   ```

3. **View Swagger API docs:**
   ```
   http://localhost:3001/api/docs
   ```

4. **Check backend logs** for detailed error messages during upload

