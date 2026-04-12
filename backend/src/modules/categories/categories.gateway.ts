import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class CategoriesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private logger: Logger = new Logger('CategoriesGateway');

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    // Client automatically joins 'categories' room on connect
    client.join('categories');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe-categories')
  handleSubscribe(client: Socket, data: any) {
    this.logger.log(`Client ${client.id} subscribed to categories`);
    client.join('categories');
    return { event: 'subscribed', message: 'Connected to categories updates' };
  }

  // Method to be called when a category is created/updated
  broadcastCategoryUpdate(category: any) {
    this.server.to('categories').emit('category-updated', {
      event: 'category-updated',
      data: category,
      timestamp: new Date(),
    });
  }

  // Method to be called when subcategory is created
  broadcastSubcategoryCreated(subcategory: any, parentCategoryId: string) {
    this.server.to('categories').emit('subcategory-created', {
      event: 'subcategory-created',
      data: subcategory,
      parentCategoryId,
      timestamp: new Date(),
    });
  }

  // Broadcast to all connected clients about category/subcategory changes
  broadcastCategoriesUpdate(categories: any[]) {
    this.server.to('categories').emit('categories-updated', {
      event: 'categories-updated',
      data: categories,
      timestamp: new Date(),
    });
  }
}
