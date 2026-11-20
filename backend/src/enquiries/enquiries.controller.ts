import { Body, Controller, Post } from '@nestjs/common';
import { CreateEnquiryDto } from './create-enquiry.dto.js';
import { EnquiriesService, type EnquiryResult } from './enquiries.service.js';

@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Post()
  submit(@Body() enquiry: CreateEnquiryDto): Promise<EnquiryResult> {
    return this.enquiries.submit(enquiry);
  }
}
