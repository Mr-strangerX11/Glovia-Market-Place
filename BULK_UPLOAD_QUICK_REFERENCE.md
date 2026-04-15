# Quick Reference - Custom Bulk Upload

## Your CSV Format (16 columns)
```
Product Name | Slug | Description | Price (NRP) | Discount (%) | Stock Quantity |
Size/Volume | SKU | Category | Sub-Category | Brand | Vendor | 
Product Images | Product Flags | Featured Product | New Arrival
```

## 🎯 Typical Workflow

```bash
# Step 1: Prepare CSV with your template
# Edit: BULK_UPLOAD_TEMPLATE_CUSTOM.csv (add your products)

# Step 2: Convert to backend format
node scripts/convert-bulk-csv.js BULK_UPLOAD_TEMPLATE_CUSTOM.csv products-ready.csv

# Step 3: Upload
# Go to: http://localhost:3000/admin/products/bulk
# Select: products-ready.csv
# Review: Check preview for any errors
# Upload: Click "Upload X products"
```

## ✅ Required Fields (Must Fill)
- ✅ Product Name
- ✅ Slug (must be unique)
- ✅ Description  
- ✅ Price (NRP)
- ✅ Stock Quantity
- ✅ SKU (must be unique)
- ✅ Category (Beauty, Pharmacy, Groceries, Clothes & Shose, Essentials)

## ❌ Optional Fields (Can Leave Empty)
- Discount (%)
- Size/Volume
- Sub-Category
- Brand
- Vendor
- Product Flags
- Featured Product
- New Arrival

## 🏷️ Valid Categories
- Beauty
- Pharmacy
- Groceries
- Clothes & Shose
- Essentials

## 📊 Example Row

```csv
"Himalaya Cleansing Milk","himalaya-milk-200ml","Gentle natural milk","350","10","100","200ml","HIMALAYA-001","Beauty","Skincare","Himalaya","","https://img1.jpg,https://img2.jpg","organic,natural","true","false"
```

Product Name: Himalaya Cleansing Milk
Slug: himalaya-milk-200ml
Description: Gentle natural milk
Price: 350 NPR
Discount: 10% (compareAtPrice will be 389 NPR)
Stock: 100 units
Size: 200ml (stored as tag)
SKU: HIMALAYA-001 (must be unique)
Category: Beauty
Sub-Category: Skincare (stored as tag)
Brand: Himalaya
Vendor: (empty - not assigned)
Images: 2 URLs
Flags: organic, natural (stored as tags)
Featured: Yes (true)
New Arrival: No (false)

## 🔍 Troubleshooting

| Error | Fix |
|-------|-----|
| "Category not found" | Use exact name: Beauty, Pharmacy, Groceries, Clothes & Shose, Essentials |
| "Missing required fields" | Fill: Product Name, Slug, Description, Price, SKU, Category |
| "SKU already exists" | Use unique SKU value in CSV |
| "Slug already exists" | Use unique slug value in CSV |
| "Cannot find module" | Run from correct directory: /Users/macbook/Desktop/Glovia/web |

## 📱 URL Paths

| Action | URL |
|--------|-----|
| Admin Bulk Upload | http://localhost:3000/admin/products/bulk |
| Vendor Bulk Upload | http://localhost:3000/vendor/products/bulk |
| API Documentation | http://localhost:3001/api/docs |
| Check Categories | http://localhost:3001/api/v1/categories |

## 💾 Template Files

| File | Use |
|------|-----|
| BULK_UPLOAD_TEMPLATE_CUSTOM.csv | Start here - copy & edit for your products |
| scripts/convert-bulk-csv.js | Run this to convert to backend format |
| CUSTOM_BULK_UPLOAD_GUIDE.md | Full documentation with examples |
| QUICK_REFERENCE.md | This file - quick lookups |

