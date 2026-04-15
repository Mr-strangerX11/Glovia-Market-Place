import { Injectable, Inject } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private realtimeGateway: RealtimeGateway) {}

  // Emit product updates
  emitProductUpdate(data: any) {
    this.realtimeGateway.emitToChannel('products', 'product:updated', {
      timestamp: new Date(),
      ...data,
    });
  }

  emitProductCreated(data: any) {
    this.realtimeGateway.emitToChannel('products', 'product:created', {
      timestamp: new Date(),
      ...data,
    });
  }

  emitProductDeleted(productId: string) {
    this.realtimeGateway.emitToChannel('products', 'product:deleted', {
      productId,
      timestamp: new Date(),
    });
  }

  // Emit banner updates
  emitBannerUpdate(data: any) {
    this.realtimeGateway.emitToChannel('banners', 'banner:updated', {
      timestamp: new Date(),
      ...data,
    });
  }

  emitBannerCreated(data: any) {
    this.realtimeGateway.emitToChannel('banners', 'banner:created', {
      timestamp: new Date(),
      ...data,
    });
  }

  emitBannerDeleted(bannerId: string) {
    this.realtimeGateway.emitToChannel('banners', 'banner:deleted', {
      bannerId,
      timestamp: new Date(),
    });
  }

  // Emit brand/vendor updates
  emitBrandUpdate(data: any) {
    this.realtimeGateway.emitToChannel('brands', 'brand:updated', {
      timestamp: new Date(),
      ...data,
    });
  }

  emitBrandCreated(data: any) {
    this.realtimeGateway.emitToChannel('brands', 'brand:created', {
      timestamp: new Date(),
      ...data,
    });
  }

  emitBrandDeleted(brandId: string) {
    this.realtimeGateway.emitToChannel('brands', 'brand:deleted', {
      brandId,
      timestamp: new Date(),
    });
  }

  // Emit flash deals updates
  emitFlashDealUpdate(data: any) {
    this.realtimeGateway.emitToChannel('flash-deals', 'flashdeal:updated', {
      timestamp: new Date(),
      ...data,
    });
  }

  emitFlashDealCreated(data: any) {
    this.realtimeGateway.emitToChannel('flash-deals', 'flashdeal:created', {
      timestamp: new Date(),
      ...data,
    });
  }

  emitFlashDealDeleted(dealId: string) {
    this.realtimeGateway.emitToChannel('flash-deals', 'flashdeal:deleted', {
      dealId,
      timestamp: new Date(),
    });
  }

  // Emit category updates
  emitCategoryUpdate(data: any) {
    this.realtimeGateway.emitToChannel('categories', 'category:updated', {
      timestamp: new Date(),
      ...data,
    });
  }

  emitCategoryCreated(data: any) {
    this.realtimeGateway.emitToChannel('categories', 'category:created', {
      timestamp: new Date(),
      ...data,
    });
  }

  emitCategoryDeleted(categoryId: string) {
    this.realtimeGateway.emitToChannel('categories', 'category:deleted', {
      categoryId,
      timestamp: new Date(),
    });
  }

  // Emit order updates
  emitOrderUpdate(data: any) {
    this.realtimeGateway.emitToChannel('orders', 'order:updated', {
      timestamp: new Date(),
      ...data,
    });
  }

  emitOrderstatusUpdate(orderId: string, status: string) {
    this.realtimeGateway.emitToChannel('orders', 'order:status-changed', {
      orderId,
      status,
      timestamp: new Date(),
    });
  }

  // Home page specific updates
  emitHomePageUpdate(data: any) {
    this.realtimeGateway.broadcastEvent('homepage:update', {
      timestamp: new Date(),
      ...data,
    });
  }
}
