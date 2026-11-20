// Shapes returned by the backend API (/api). They mirror backend/src/products/product.ts.

export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: {
    rate: number;
    count: number;
  };
}

export interface CategoryView {
  category: string;
  topRated: Product[];
  others: Product[];
}

export interface EnquiryRequest {
  productId: number;
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

export interface EnquiryResponse {
  message: string;
}
