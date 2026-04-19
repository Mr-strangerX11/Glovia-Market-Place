# Category Seeding Guide

## Overview
This script seeds parent categories and subcategories into the MongoDB database.

## Parent Categories Created

### 1. **Beauty** (5 subcategories)
- Skincare
- Makeup
- Haircare
- Fragrance
- Tools & Accessories

### 2. **Pharmacy** (5 subcategories)
- Medicines
- Supplements
- First Aid
- Medical Devices
- Wellness

### 3. **Groceries** (6 subcategories)
- Fresh Produce
- Dairy & Eggs
- Beverages
- Snacks
- Grains & Cereals
- Condiments & Sauces

### 4. **Clothes & Shoes** (5 subcategories)
- Men's Clothing
- Women's Clothing
- Kids' Clothing
- Footwear
- Accessories

### 5. **Essentials** (5 subcategories)
- Kitchen
- Bathroom
- Cleaning Supplies
- Household Items
- Lighting

**Total: 5 Parent Categories + 26 Subcategories = 31 Categories**

## How to Run

### Option 1: Using npm script (Recommended)

1. Add this to your `backend/package.json`:
```json
"scripts": {
  "seed:categories": "node scripts/seed-categories.js"
}
```

2. Run the script:
```bash
cd backend
npm run seed:categories
```

### Option 2: Direct Node execution

```bash
cd /Users/macbook/Desktop/Glovia/web/backend
node scripts/seed-categories.js
```

### Option 3: Using npm directly

```bash
npm exec node scripts/seed-categories.js
```

## What the Script Does

✅ Connects to MongoDB using `MONGODB_URI` from `.env`
✅ Clears all existing categories (safe to re-run)
✅ Creates 5 parent categories with proper slugs and descriptions
✅ Creates 26 subcategories linked to parent categories
✅ Sets display order for organizing categories
✅ Displays creation summary and structure
✅ Safely closes database connection

## Output Example

```
✓ MongoDB connected

📦 Starting category seeding...

✓ Deleted 31 existing categories
✓ Created parent: Beauty
  ├─ Subcategory: Skincare
  ├─ Subcategory: Makeup
  ...

✅ Seeding complete! Created 31 categories

📊 Summary:
  Parent Categories: 5
  Subcategories: 26
  Total: 31 categories

📋 Category Structure:

Beauty
  ├─ Skincare
  ├─ Makeup
  ├─ Haircare
  ├─ Fragrance
  ├─ Tools & Accessories
  ...
```

## Verify in Database

After running, verify categories were created:

**Using MongoDB Compass:**
1. Navigate to `glovia` database
2. Find `categories` collection
3. Should see 31 documents

**Using MongoDB Shell:**
```javascript
db.categories.find().pretty()
db.categories.countDocuments()  // Should return 31
```

## Troubleshooting

### "MongoDB connection failed"
- Check `.env` file has correct `MONGODB_URI`
- Ensure MongoDB is running
- Verify database credentials

### "E11000 duplicate key error"
- Categories already exist with same names/slugs
- Script automatically clears old categories before seeding
- Try running again

### Permission denied
- Ensure you have write access to backend directory
- Run with proper permissions if needed

## Customization

To modify categories, edit the `categoriesData` array in the script:

```javascript
const categoriesData = [
  {
    parent: {
      name: 'Your Category',
      slug: 'your-category',
      description: 'Description here',
      type: 'Your Category',
      displayOrder: 1,
    },
    subcategories: [
      { name: 'Sub 1', slug: 'sub-1', description: 'Description' },
      { name: 'Sub 2', slug: 'sub-2', description: 'Description' },
    ],
  },
];
```

Then re-run the script.
