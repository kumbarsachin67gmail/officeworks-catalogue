import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { EnquiriesModule } from './enquiries/enquiries.module.js';
import { HealthController } from './health.controller.js';
import { ProductsModule } from './products/products.module.js';

@Module({
  imports: [ConfigModule, ProductsModule, EnquiriesModule],
  controllers: [HealthController],
})
export class AppModule {}
