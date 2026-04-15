# Real-Time Updates - Quick Setup Checklist

## ✅ Completed Setup

The following files have been created/updated to enable real-time updates:

### Backend Files Created/Updated

1. ✅ **Realtime Module** (`backend/src/modules/realtime/`)
   - `realtime.gateway.ts` - WebSocket gateway
   - `realtime.module.ts` - Module definition
   - `realtime.service.ts` - Event emission service

2. ✅ **Updated Modules**
   - `banners.module.ts` - Added RealtimeModule import
   - `banners.service.ts` - Added event emissions
   - `flash-deals.module.ts` - Added RealtimeModule import
   - `flash-deals.service.ts` - Added event emissions
   - `brands.module.ts` - Added RealtimeModule import
   - `brands.service.ts` - Added event emissions
   - `app.module.ts` - Added RealtimeModule import

### Frontend Files Created

1. ✅ **Hooks** (`frontend/src/hooks/`)
   - `useRealtime.ts` - Low-level WebSocket hook
   - `useHomePageRealtime.ts` - Home page specific hook
   - `useRealtimeHomePageUpdates.example.ts` - Integration example

## 📋 Next Steps

### Step 1: Update app.module.ts (Already Done)
The RealtimeModule is already imported. Verify:
```bash
grep -n "RealtimeModule" backend/src/app.module.ts
```

### Step 2: Update Products Module
Add real-time support to products service:

```typescript
// In backend/src/modules/products/products.module.ts
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    // ... existing imports
    RealtimeModule,  // Add this
  ],
  // ...
})
export class ProductsModule {}
```

### Step 3: Update Products Service
```typescript
// In backend/src/modules/products/products.service.ts
constructor(
  // ... existing injections
  private realtimeService: RealtimeService,  // Add this
) {}

// In each CRUD method, emit events:
async updateProduct(id: string, dto: UpdateProductDto) {
  const product = await this.productModel.findByIdAndUpdate(id, dto, { new: true });
  
  // Add this:
  this.realtimeService.emitProductUpdate({
    id: product._id,
    ...product.toObject(),
  });
  
  return product;
}
```

### Step 4: Update Categories Module (Optional)
Follow the same pattern as products:

```typescript
// Similar to products, add RealtimeModule and emit events
this.realtimeService.emitCategoryUpdate(data);
```

### Step 5: Update Orders Module (Optional)
For order status updates:

```typescript
async updateOrderStatus(id: string, status: string) {
  const order = await this.orderModel.findByIdAndUpdate(id, { status }, { new: true });
  
  // Add this:
  this.realtimeService.emitOrderstatusUpdate(id, status);
  
  return order;
}
```

### Step 6: Update Frontend Home Page

Add the real-time hook to `frontend/src/app/HomeContent.client.tsx`:

```typescript
import { useHomePageRealtime } from '@/hooks/useHomePageRealtime';

export default function HomeContent({ brands, banners }: HomeContentProps) {
  const [banners, setBanners] = useState(normalizeList<Banner>(banners));
  const [vendors, setVendors] = useState<any[]>([]);
  
  // Add this hook
  const { latestUpdate, isConnected } = useHomePageRealtime();

  // Listen for banner updates
  useEffect(() => {
    if (latestUpdate?.type === 'banners') {
      bannersAPI.getAll()
        .then(res => {
          const newBanners = res.data?.data || res.data || [];
          setBanners(normalizeList(newBanners));
        })
        .catch(console.error);
    }
  }, [latestUpdate?.data?.id, latestUpdate?.type]);

  // Listen for vendor updates
  useEffect(() => {
    if (latestUpdate?.type === 'brands') {
      adminAPI.getFeaturedVendors()
        .then(res => {
          const vendors = res.data?.data || [];
          setVendors(vendors.slice(0, 8));
        })
        .catch(console.error);
    }
  }, [latestUpdate?.data?.id, latestUpdate?.type]);

  return (
    <div>
      {isConnected && (
        <div className="fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg shadow-sm text-sm">
          🔴 Live updates enabled
        </div>
      )}
      {/* Rest of component */}
    </div>
  );
}
```

### Step 7: Verify Environment Variables

Backend `.env`:
```env
WEBSOCKET_ENABLED=true
WEBSOCKET_CORS_ORIGIN=http://localhost:3000
WEBSOCKET_NAMESPACE=/realtime
```

Frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🧪 Testing Real-Time Updates

### Test 1: Start Backend and Frontend
```bash
# Terminal 1: Start backend
cd backend
npm run start:dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### Test 2: Verify Connection
Open browser console and run:
```javascript
// Should show connection status
console.log('WebSocket ready')
```

### Test 3: Manual Testing
1. Open home page in browser
2. Go to Admin Dashboard → Banners
3. Create/Update a banner
4. Watch the home page update in real-time

### Test 4: Multiple Windows
1. Open home page in two browser windows
2. Update a banner in admin dashboard
3. Both windows should update simultaneously

## 🔧 Additional Services to Update

These services should also emit events following the same pattern:

- [ ] `src/modules/products/products.service.ts` - Product CRUD
- [ ] `src/modules/categories/categories.service.ts` - Category CRUD  
- [ ] `src/modules/orders/orders.service.ts` - Order status changes
- [ ] `src/modules/users/users.service.ts` - User profile updates (vendors)
- [ ] `src/modules/admin/admin.service.ts` - Admin actions

For each service, follow this pattern:

1. Import RealtimeModule in the module
2. Inject RealtimeService in the service
3. Emit appropriate events in CRUD methods

## 📚 Documentation Files

- `REALTIME_UPDATES_GUIDE.md` - Complete implementation guide
- `frontend/src/hooks/useRealtimeHomePageUpdates.example.ts` - Integration example

## ⚠️ Important Notes

1. **WebSocket Port**: Backend uses port 3001 for WebSocket (via Socket.IO)
2. **CORS**: Make sure CORS is configured for your frontend domain
3. **Scalability**: For production with multiple instances, use Redis adapter
4. **Event Deduplication**: Always use event IDs to prevent duplicate updates
5. **Performance**: Consider debouncing rapid consecutive updates

## 🚀 Deployment Checklist

- [ ] Update backend `.env` with production CORS origin
- [ ] Update frontend `.env` with production API URL
- [ ] Test WebSocket connection in staging
- [ ] Set up Redis adapter if using multiple backend instances
- [ ] Monitor WebSocket connections in production
- [ ] Test with multiple concurrent users

## Support & Troubleshooting

If WebSocket connection fails:
1. Check if backend is running on correct port
2. Verify CORS origin in backend config
3. Check browser console for connection errors
4. Try forcing a hard page refresh

For detailed troubleshooting, see REALTIME_UPDATES_GUIDE.md section "Troubleshooting"
