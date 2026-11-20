/**
 * The only way the app sends email.
 *
 * SMTP (SmtpEmailSender, Mailpit locally) is one implementation. Moving to
 * SES, SendGrid or similar means writing another class that implements this
 * interface and changing the EMAIL_SENDER provider in enquiries.module.ts.
 */
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

/** Plain text only: no HTML is ever built from user input. */
export interface EmailMessage {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}

export interface EmailSender {
  /** Resolves once the provider has accepted the message; rejects if it was not sent. */
  send(message: EmailMessage): Promise<void>;
}
