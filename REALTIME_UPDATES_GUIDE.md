# Real-Time Updates Implementation Guide

## Overview

This system enables real-time synchronization of data across SuperAdmin, Admin, and Vendor dashboards with the home page. When any dashboard updates data (brands, banners, flash deals, products, categories), all connected clients receive instant updates.

## Architecture

### Backend Components

1. **RealtimeGateway** (`src/modules/realtime/realtime.gateway.ts`)
   - WebSocket gateway using Socket.IO
   - Manages client connections and subscriptions
   - Broadcasts events to subscribed channels

2. **RealtimeService** (`src/modules/realtime/realtime.service.ts`)
   - Central service for emitting domain-specific events
   - Methods for each model type (products, banners, brands, flash-deals, categories, orders)
   - Sends events to appropriate channels

3. **Updated Modules**
   - `BannersModule` - Emits banner create/update/delete events
   - `BrandsModule` - Emits brand create/update/delete events
   - `FlashDealsModule` - Emits flash deal create/update/delete events

### Frontend Components

1. **useRealtime Hook** (`src/hooks/useRealtime.ts`)
   - Low-level WebSocket connection management
   - Subscribe/unsubscribe to channels
   - Listen to events
   - Automatic reconnection

2. **useHomePageRealtime Hook** (`src/hooks/useHomePageRealtime.ts`)
   - High-level hook for home page real-time updates
   - Consolidates all dashboard-related events
   - Manages state for latest updates

## Event Types

### Available Events

```
Banners:
- banner:created
- banner:updated
- banner:deleted

Brands/Vendors:
- brand:created
- brand:updated
- brand:deleted

Flash Deals:
- flashdeal:created
- flashdeal:updated
- flashdeal:deleted

Categories:
- category:created
- category:updated
- category:deleted

Products:
- product:created
- product:updated
- product:deleted

Orders:
- order:updated
- order:status-changed

Home Page (Broadcast):
- homepage:update
```

## Usage Examples

### Backend: Adding Real-Time to a New Module

To add real-time support to any module:

1. **Import RealtimeModule**
   ```typescript
   import { RealtimeModule } from '../realtime/realtime.module';
   
   @Module({
     imports: [
       MongooseModule.forFeature([...]),
       RealtimeModule,  // Add this
     ],
     providers: [YourService],
   })
   export class YourModule {}
   ```

2. **Inject RealtimeService**
   ```typescript
   import { RealtimeService } from '../realtime/realtime.service';
   
   @Injectable()
   export class YourService {
     constructor(
       private realtimeService: RealtimeService,
     ) {}
   }
   ```

3. **Emit Events**
   ```typescript
   async create(dto: CreateDto) {
     const item = await this.model.create(dto);
     
     // Emit event
     this.realtimeService.emitProductCreated({
       id: item._id,
       ...item.toObject(),
     });
     
     return item;
   }
   ```

### Frontend: Listening to Real-Time Updates

1. **Basic Usage in Home Page**
   ```typescript
   'use client';
   
   import { useHomePageRealtime } from '@/hooks/useHomePageRealtime';
   
   export function HomePage() {
     const { latestUpdate, isConnected, updates } = useHomePageRealtime();
     
     useEffect(() => {
       if (latestUpdate?.type === 'banners') {
         // Refresh banners
         refetchBanners();
       }
     }, [latestUpdate]);
     
     return (
       <div>
         {isConnected && <div className="text-green-500">Live updates enabled</div>}
       </div>
     );
   }
   ```

2. **Using Low-Level Hook**
   ```typescript
   const realtime = useRealtime({
     autoConnect: true,
     channels: ['banners', 'products'],
   });
   
   useEffect(() => {
     const unsubscribe = realtime.on('banner:updated', (data) => {
       console.log('Banner updated:', data);
       // Handle update
     });
     
     return unsubscribe;
   }, [realtime]);
   ```

## Configuration

### Backend Configuration

Set the following environment variables in `.env`:

```env
# WebSocket Configuration
WEBSOCKET_ENABLED=true
WEBSOCKET_CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
WEBSOCKET_NAMESPACE=/realtime

# Optional: Custom port
WEBSOCKET_PORT=3001
```

### Frontend Configuration

Set the following in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
# Or for production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Integration Steps

### Step 1: Update Existing Services

**For Products Service:**
```typescript
// 1. Import RealtimeModule in ProductsModule
// 2. Inject RealtimeService in ProductsService
// 3. Add event emissions in create/update/delete methods:

async updateProduct(id: string, dto: UpdateProductDto) {
  const product = await this.productModel.findByIdAndUpdate(id, dto, { new: true });
  
  this.realtimeService.emitProductUpdate({
    id: product._id,
    ...product.toObject(),
  });
  
  return product;
}
```

**For Categories Service:**
```typescript
// Same pattern as above
this.realtimeService.emitCategoryUpdate(data);
```

**For Orders Service:**
```typescript
// For order status updates:
async updateOrderStatus(orderId: string, status: string) {
  const order = await this.orderModel.findByIdAndUpdate(
    orderId,
    { status },
    { new: true }
  );
  
  this.realtimeService.emitOrderstatusUpdate(orderId, status);
  
  return order;
}
```

### Step 2: Update Home Page Component

```typescript
'use client';

import { useHomePageRealtime } from '@/hooks/useHomePageRealtime';

export default function HomeContent({ brands: initialBrands, banners: initialBanners }) {
  const [brands, setBrands] = useState(initialBrands);
  const [banners, setBanners] = useState(initialBanners);
  const { latestUpdate, isConnected } = useHomePageRealtime();

  // Listen for real-time banner updates
  useEffect(() => {
    if (latestUpdate?.type === 'banners') {
      // Fetch fresh banners
      fetchBanners().then(setBanners);
    }
  }, [latestUpdate?.data?.id]); // Key by ID to deduplicate

  // Listen for real-time brand updates
  useEffect(() => {
    if (latestUpdate?.type === 'brands') {
      // Fetch fresh brands
      fetchBrands().then(setBrands);
    }
  }, [latestUpdate?.data?.id]);

  return (
    <div>
      {isConnected && (
        <div className="bg-green-50 text-green-700 p-2 text-sm">
          🔴 Live updates enabled - changes will appear instantly
        </div>
      )}
      {/* Rest of component */}
    </div>
  );
}
```

### Step 3: Update Dashboard Components

In dashboard update endpoints, emit events:

```typescript
// In Admin Dashboard - Flash Deals Section
@Post('flash-deals')
async createFlashDeal(@Body() dto: CreateFlashDealDto) {
  // Service handles event emission automatically
  return this.flashDealsService.createFlashDeal(dto, adminId);
}

@Patch('flash-deals/:id')
async updateFlashDeal(@Param('id') id: string, @Body() dto: UpdateFlashDealDto) {
  // Service handles event emission automatically
  return this.flashDealsService.updateFlashDeal(id, dto, adminId);
}
```

## Testing

### Backend Testing

```bash
# Test WebSocket connection
npm run test:realtime

# Check gateway is registered
curl http://localhost:3001/health
```

### Frontend Testing

Open browser console:

```javascript
// Check if connected
window.__realtimeDebug?.isConnected

// Listen to events
window.__realtimeDebug?.on('banner:updated', console.log)

// Simulate event (for testing)
window.__realtimeDebug?.emit('test-event', { data: 'test' })
```

## Troubleshooting

### WebSocket Connection Issues

1. **Connection Refused**
   - Ensure backend is running on correct port
   - Check CORS configuration
   - Verify firewall allows WebSocket

2. **Events Not Received**
   - Check if client is subscribed to correct channel
   - Verify event is being emitted on backend
   - Check browser console for errors

3. **Memory Leaks**
   - Ensure unsubscribe functions are called
   - Clean up listeners in useEffect cleanup

### Performance Considerations

- Updates are emitted to specific channels, not broadcasted globally
- Each client maintains its own connection (can be pooled if needed)
- Consider throttling rapid updates: 

```typescript
// Dashboard: Debounce rapid changes
const debouncedUpdate = debounce((data) => {
  this.realtimeService.emitProductUpdate(data);
}, 500);
```

## Production Deployment

### Docker Configuration

```dockerfile
# Ensure WebSocket port is exposed
EXPOSE 3001

# Your docker-compose.yml
ports:
  - "3001:3001"
```

### Load Balancing

For multiple backend instances, use Redis adapter:

```typescript
// In main.ts
import { RedisIoAdapter } from '@nestjs/platform-socket.io/dist/adapters/redis-io.adapter';

app.useWebSocketAdapter(new RedisIoAdapter(app));
```

### Monitoring

Track real-time metrics:

```typescript
// In realtime.gateway.ts
afterInit(server: Server) {
  setInterval(() => {
    const connections = server.engine.clientsCount;
    console.log(`Active WebSocket connections: ${connections}`);
  }, 30000);
}
```

## Best Practices

1. **Always emit on mutations** - Add event emission to all CRUD operations
2. **Include full object** -Send complete entity data in events
3. **Add timestamps** - Track when updates occurred
4. **Use channels** - Keep related events in same channel
5. **Handle disconnections** - Implement fallback polling if needed
6. **Validate on frontend** - Don't blindly apply updates
7. **Batch updates** - Debounce rapid consecutive updates
8. **Test thoroughly** - Test with multiple clients and network conditions
