import { Transform } from 'class-transformer';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

/** Trims strings; turns blank optional fields into undefined so they count as "not given". */
const trimToUndefined = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class CreateEnquiryDto {
  @IsInt({ message: 'productId must be a whole number' })
  @Min(1)
  productId!: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter your name' })
  @MaxLength(100)
  @Matches(/^[^\r\n]*$/, { message: 'Name must be on one line' })
  name!: string;

  @Transform(trim)
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email!: string;

  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @Matches(/^[0-9+()\-\s]{6,20}$/, {
    message: 'Phone can only contain digits, spaces and + ( ) -, 6 to 20 characters',
  })
  phone?: string;

  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
