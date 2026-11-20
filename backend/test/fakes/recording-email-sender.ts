import type { EmailMessage, EmailSender } from '../../src/enquiries/email-sender.js';

/** Test double for EmailSender: records messages instead of sending. Set `failWith` to simulate a provider error. */
export class RecordingEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  failWith: Error | undefined;

  async send(message: EmailMessage): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.sent.push(message);
  }
}
