import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

/** Turns the `:id` route param into a positive integer, or answers 400. */
@Injectable()
export class ParseProductIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!/^[1-9]\d{0,8}$/.test(value)) {
      throw new BadRequestException('Product id must be a positive whole number');
    }
    return Number(value);
  }
}
