import { Controller, Get, Param, Query } from '@nestjs/common';
import { ParseProductIdPipe } from './parse-product-id.pipe.js';
import type { CategoryView, Product } from './product.js';
import { ProductsService } from './products.service.js';
import { SearchQueryDto } from './search-query.dto.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // `featured` and `search` must stay above `:id`, or `:id` would capture them.
  @Get('featured')
  getFeatured(): Promise<Product[]> {
    return this.products.getFeatured();
  }

  @Get('search')
  search(@Query() query: SearchQueryDto): Promise<Product[]> {
    return this.products.search(query.q);
  }

  @Get(':id')
  getById(@Param('id', ParseProductIdPipe) id: number): Promise<Product> {
    return this.products.getById(id);
  }
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(): Promise<string[]> {
    return this.products.listCategories();
  }

  // Express URL-decodes the param, so "men's%20clothing" arrives as "men's clothing".
  @Get(':category')
  get(@Param('category') category: string): Promise<CategoryView> {
    return this.products.getCategory(category);
  }
}
