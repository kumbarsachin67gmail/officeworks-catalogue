import { Matches } from 'class-validator';

/**
 * The `:id` route param, validated as text. A DTO rather than a param pipe:
 * with `transform: true`, the global ValidationPipe would turn a `number` param
 * into a number first ("0x10" -> 16, "1e1" -> 10) before any later check ran.
 * At most 9 digits, so it stays a safe integer and fits a database int column.
 */
export class ProductIdParams {
  @Matches(/^[1-9]\d{0,8}$/, { message: 'Product id must be a positive whole number' })
  id!: string;
}
