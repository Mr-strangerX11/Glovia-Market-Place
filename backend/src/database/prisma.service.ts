import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  constructor(@InjectConnection() private connection: Connection) {}

  async onModuleInit() {
    // Connection is already established by MongooseModule
    console.log('MongoDB connection established');
  }

  async onModuleDestroy() {
    await this.connection.close();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;
    
    const collections = await this.connection.db.collections();
    
    return Promise.all(
      collections.map((collection) => collection.deleteMany({})),
    );
  }
}

