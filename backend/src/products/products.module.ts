import { Module } from '@nestjs/common';
import { FakeStoreRepository } from './fake-store.repository.js';
import { httpFetchProvider } from './http-fetch.js';
import { PRODUCT_REPOSITORY } from './product.repository.js';
import { CategoriesController, ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { TopRatedPolicy } from './top-rated.policy.js';

@Module({
  controllers: [ProductsController, CategoriesController],
  providers: [
    ProductsService,
    TopRatedPolicy,
    httpFetchProvider,
    // Swap the product data source here (e.g. a database repository).
    { provide: PRODUCT_REPOSITORY, useClass: FakeStoreRepository },
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
