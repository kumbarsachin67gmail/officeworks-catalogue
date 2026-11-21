import { Inject, Injectable } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import type { EmailMessage, EmailSender } from './email-sender.js';

/** Sends email over SMTP. Locally this is Mailpit; in production any SMTP relay (e.g. SES SMTP). */
@Injectable()
export class SmtpEmailSender implements EmailSender {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const { host, port, secure, auth } = config.smtp;
    this.from = config.email.fromAddress;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth,
      // Kept well under nginx's 30 s proxy_read_timeout, so a slow SMTP server
      // gives the customer our 503 rather than a proxy timeout while the email
      // may still be sent in the background.
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 15_000,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
    });
  }
}
