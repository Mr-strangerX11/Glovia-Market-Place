# Bulk Upload Validation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER UPLOADS CSV FILE                                               │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
        ┌────────────────────────────────────────────┐
        │  PARSE CSV & VALIDATE EACH ROW            │
        └────────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
    VALID ROWS                   INVALID ROWS
    ┌──────────┐                ┌──────────┐
    │ name ✓   │                │ Empty    │
    │ slug ✓   │                │ Invalid  │
    │ price ✓  │                │ Data     │
    │ sku ✓    │                └──────────┘
    │ category ✓ (MongoDB ObjectId)
    │ sku unique ✓
    │ slug unique ✓
    └──────────┘
         │
         ▼
    ┌──────────────────────────┐
    │  STEP 2: PREVIEW         │
    │  Show all rows with      │
    │  error messages          │
    └──────────────────────────┘
         │
         ▼
    ┌──────────────────────────┐
    │  USER REVIEWS            │
    │  Can remove error rows   │
    │  before uploading        │
    └──────────────────────────┘
         │
         ▼
    ┌──────────────────────────┐
    │  UPLOAD VALID ROWS       │
    │  Backend creates         │
    │  products in DB          │
    └──────────────────────────┘
         │
         ▼
    ┌──────────────────────────┐
    │  RESULTS SHOWN           │
    │  ✓ 98 Success            │
    │  ✗ 2 Failed              │
    │  Download failed rows    │
    └──────────────────────────┘
```

## ✅ VALIDATION CHECKLIST

### Frontend Validation (Step 1)
- [ ] Field: `name` - required, not empty
- [ ] Field: `slug` - required, not empty  
- [ ] Field: `description` - required, not empty
- [ ] Field: `price` - required, valid number ≥ 0
- [ ] Field: `sku` - required, not empty
- [ ] Field: `categoryId` - required, valid MongoDB ObjectId (NOT URL, NOT name)
- [ ] Field: `stockQuantity` - if present, must be valid number ≥ 0
- [ ] Field: `brandId` - if present, must be valid ObjectId or empty
- [ ] Field: `vendorId` - if present, must be valid ObjectId or empty
- [ ] Boolean fields - lowercase `true`/`false`

### Backend Validation (Step 3)
- [ ] categoryId exists in database
- [ ] brandId exists in database (if provided)
- [ ] vendorId exists in database (if provided)
- [ ] SKU unique in database
- [ ] slug unique in database

### CSV Format Requirements
- [ ] All values quoted: `"value"`
- [ ] No extra columns (remove Ml/gm, etc.)
- [ ] Columns in exact order
- [ ] Comma-separated (not tab, not semicolon)
- [ ] No extra rows/blank lines at end

## 🚨 YOUR CURRENT CSV ISSUES

```
Row 1: Mamaearth Charcoal Face Wash
  ❌ categoryId: "https://glovia.com.np/products?category=skincare" 
     Expected: "507f1f77bcf86cd799439011" (24-char MongoDB ID)
     Status: WILL BE REJECTED ✗

  ❌ brandId: "mamaearth"
     Expected: "507f1f77bcf86cd799439012" or "" (empty)
     Status: WILL BE REJECTED ✗

  ❌ vendorId: "MM cosmetics"
     Expected: "507f1f77bcf86cd799439013" or "" (empty)
     Status: WILL BE REJECTED ✗

  ❌ Column exists: "Ml/gm" 
     This column doesn't exist in template
     Status: WILL BE SKIPPED ⚠️

  Result: ROW REJECTED - Cannot upload
```

## 🔧 SOLUTIONS RANKED BY EASE

1. **Auto-Fix (RECOMMENDED)** - Run:
   ```bash
   ADMIN_TOKEN=xyz node scripts/map-ids-in-csv.js input.csv output.csv
   ```
   Time: 2 minutes

2. **Manual Fix** - Get IDs and edit CSV manually
   Time: 10-15 minutes

3. **Use Template** - Start fresh with corrected template
   Time: 30 minutes (re-enter all data)

