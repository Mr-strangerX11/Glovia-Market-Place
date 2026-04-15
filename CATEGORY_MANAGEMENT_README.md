# Category Management System with Real-time Updates

## Overview

This document describes the implementation of a dynamic category management system for the Glovia marketplace. The system allows admins, super admins, and vendors to:

1. **Select from 5 predefined main categories**: Beauty, Pharmacy, Groceries, Clothes & Shose, Essentials
2. **Create custom subcategories** under any main category
3. **View real-time updates** across all dashboards and the home page when categories change

## Features Implemented

### 1. Predefined Main Categories

The system seeds 5 main categories when initialized:
- **Beauty** - Skincare, Makeup, Haircare products
- **Pharmacy** - Medications, Supplements, Wellness products
- **Groceries** - Food, Beverages, Pantry items
- **Clothes & Shose** - Apparel, Footwear, Fashion items
- **Essentials** - Home, Kitchen, Daily essentials

### 2. Backend Changes

#### Database Schema Updates
- Updated `ProductCategory` enum to include the 5 main categories
- Added `isMainCategory` boolean field to the Category schema to distinguish main categories from subcategories

#### API Endpoints

**New Endpoints:**
- `POST /categories/subcategory` - Create a subcategory (VENDOR, ADMIN, SUPER_ADMIN)
- `GET /categories/main` - Get all main categories with their subcategories

**Updated Endpoints:**
- Existing category endpoints now support role-based access including VENDOR role

#### Real-time Updates with WebSocket

- Implemented `CategoriesGateway` using Socket.IO for real-time updates
- Broadcasts category updates on creation/modification
- Supports subcategory creation broadcasts
- Clients automatically join 'categories' room for receiving updates

### 3. Frontend Changes

#### Product Creation Form

**Enhancements:**
- Updated to fetch main categories using `/categories/main` endpoint
- Main categories dropdown shows all 5 predefined categories
- Subcategories dropdown dynamically loads when main category is selected
- Added "Create sub-category" button in the form
- Vendors can now create new subcategories on-the-fly while adding products

#### New Components

**CreateSubcategoryModal** (`src/components/admin/CreateSubcategoryModal.tsx`)
- Modal form for creating subcategories
- Validates subcategory name and auto-generates slug
- Provides optional description field
- Shows success/error messages

#### Real-time Updates Hook

**useCategoryUpdates** (`src/hooks/useCategoryUpdates.ts`)
- Custom React hook for Socket.IO integration
- Listens to category update events
- Broadcasts subscription to categories channel
- Can be integrated into any component needing real-time updates

#### API Updates

**categoriesAPI** enhancements:
- `getMain()` - Fetch main categories
- `createSubcategory(data)` - Create a new subcategory

## How to Use

### For Admins/SuperAdmins/Vendors - Adding a Product

1. Navigate to "Add New Product" page
2. Fill in product details (name, price, stock, etc.)
3. In the "Categorization" section:
   - Select a **Main Category** from the dropdown (Beauty, Pharmacy, etc.)
   - Optionally select an existing **Sub-Category**
   - If no suitable sub-category exists, click **"+ Create sub-category"** button
   - Fill in subcategory details in the modal and submit
   - The new sub-category will automatically be selected
4. Continue filling the rest of the form and submit

### For End Users - Viewing Real-time Updates

- When a vendor creates a new subcategory, it's immediately reflected in:
  - Product creation forms across all dashboards
  - Home page category filters (if applicable)
  - Any component using the `useCategoryUpdates` hook

## Technical Architecture

### Backend Flow

```
1. Category Creation Request
   ↓
2. CategoriesService validates & creates category
   ↓
3. Emits broadcast via CategoriesGateway
   ↓
4. WebSocket sends update to all connected clients
   ↓
5. Clients receive and update their UI
```

### Frontend Flow

```
1. User clicks "Create sub-category"
   ↓
2. Modal displays for subcategory creation
   ↓
3. User submits form
   ↓
4. API call to POST /categories/subcategory
   ↓
5. Server broadcasts update via WebSocket
   ↓
6. useCategoryUpdates hook receives update
   ↓
7. Components listening to updates re-render
```

## Database Schema - Category

```typescript
{
  _id: ObjectId,
  name: string,          // e.g., "Skincare" or "Serums"
  slug: string,          // unique, auto-generated from name
  description: string,   // optional description
  image: string,         // optional image URL
  type: ProductCategory, // enum value (BEAUTY, PHARMACY, etc.)
  parentId: ObjectId,    // null for main categories, refs parent for subcategories
  isMainCategory: boolean, // true for main categories, false for subcategories
  isActive: boolean,     // default: true
  displayOrder: number,  // sorting order
  createdAt: Date,
  updatedAt: Date
}
```

## Seeding Initial Categories

To seed the 5 main categories:

```bash
# Backend - Make GET request to:
GET /categories/seed

# Or via code:
# The seed runs automatically on first initialization
```

## Real-time Update Events

The WebSocket broadcasts the following events:

```javascript
// When a category/subcategory is created
{
  event: 'category-updated',
  data: { ... category object ... },
  timestamp: Date
}

// When a subcategory is created
{
  event: 'subcategory-created',
  data: { ... subcategory object ... },
  parentCategoryId: String,
  timestamp: Date
}

// When categories list is updated
{
  event: 'categories-updated',
  data: [ ... array of categories ... ],
  timestamp: Date
}
```

## Integration with Existing Components

### Integrating Real-time Updates into Any Component

```typescript
import { useCategoryUpdates } from '@/hooks/useCategoryUpdates';

export default function MyComponent() {
  const { isConnected, lastUpdate } = useCategoryUpdates((update) => {
    console.log('Category update received:', update);
    // Refresh categories or perform other actions
    fetchCategories();
  });

  return (
    <div>
      {isConnected ? <p>✓ Connected</p> : <p>✗ Disconnected</p>}
      {lastUpdate && <p>Last update: {lastUpdate.event}</p>}
    </div>
  );
}
```

## Environment Setup

### Backend Requirements
- Socket.IO installed (`npm install socket.io @nestjs/websockets`)
- CORS configured for frontend URL
- WebSocket gateway registered in module

### Frontend Requirements
- Socket.IO client installed (`npm install socket.io-client`)
- `NEXT_PUBLIC_API_URL` environment variable pointing to backend

## Deployment Considerations

1. **WebSocket Support**: Ensure your hosting platform supports WebSocket connections
2. **CORS Configuration**: Update CORS origin in gateway for production domains
3. **Socket.IO Adapter**: For multi-server deployments, use Redis adapter for Socket.IO
4. **Connection Pooling**: Monitor WebSocket connection count under load

## Future Enhancements

1. **Category Images**: Add image upload for main categories
2. **Category Analytics**: Track which categories are used most
3. **Batch Operations**: Allow bulk creation of subcategories
4. **Category Templates**: Pre-built subcategory templates for each main category
5. **Mobile Support**: Ensure real-time updates work on mobile dashboards
6. **Offline Support**: Cache categories locally with periodic sync

## Testing

### Manual Testing Steps

1. **Create Subcategory**:
   - Go to product creation page
   - Select a main category
   - Click "Create sub-category"
   - Fill form and submit
   - Verify subcategory appears in dropdown

2. **Real-time Update**:
   - Open product form in two browser tabs
   - Create subcategory in one tab
   - Verify it appears automatically in the other tab's dropdown

3. **Form Submission**:
   - Create product with main category only
   - Create product with main category + subcategory
   - Verify products are created correctly in database

## Troubleshooting

### WebSocket Connection Issues
- Check browser console for connection errors
- Verify `NEXT_PUBLIC_API_URL` is correct
- Ensure backend WebSocket port is accessible
- Check browser network tab for WebSocket upgrade requests

### Categories Not Displaying
- Verify categories are seeded: `GET /categories/seed`
- Check MongoDB for category documents
- Verify user has appropriate roles (VENDOR, ADMIN, SUPER_ADMIN)

### Real-time Updates Not Working
- Verify Socket.IO library is installed on both frontend and backend
- Check WebSocket connection status in browser devtools
- Verify CategoriesGateway is properly registered in module

## Questions & Support

For implementation questions or issues, refer to:
- Backend: `/backend/src/modules/categories/`
- Frontend: `/frontend/src/hooks/useCategoryUpdates.ts`
- Gateway: `/backend/src/modules/categories/categories.gateway.ts`
