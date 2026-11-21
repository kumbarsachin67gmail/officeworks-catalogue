import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createTransport, sendMail } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: 'id-1' });
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) };
});
vi.mock('nodemailer', () => ({ default: { createTransport } }));

import { loadAppConfig } from '../../src/config/app-config.js';
import { SmtpEmailSender } from '../../src/enquiries/smtp-email-sender.js';

const message = { to: 'sales@shop.test', replyTo: 'asha@example.com', subject: 'New enquiry: Ring', text: 'Hello' };

describe('SmtpEmailSender', () => {
  beforeEach(() => {
    createTransport.mockClear();
    sendMail.mockClear();
  });

  afterEach(() => vi.restoreAllMocks());

  it('connects with the configured SMTP settings and no auth when none is set', () => {
    new SmtpEmailSender(loadAppConfig({ SMTP_HOST: 'mailpit', SMTP_PORT: '1025' }));

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'mailpit', port: 1025, secure: false, auth: undefined }),
    );
  });

  it('passes credentials when both are set', () => {
    new SmtpEmailSender(loadAppConfig({ SMTP_USER: 'user', SMTP_PASS: 'secret', SMTP_SECURE: 'true' }));

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true, auth: { user: 'user', pass: 'secret' } }),
    );
  });

  it('sends exactly the plain-text message, from the configured sender', async () => {
    const sender = new SmtpEmailSender(loadAppConfig({ ENQUIRY_FROM_EMAIL: 'shop@shop.test' }));

    await sender.send(message);

    expect(sendMail).toHaveBeenCalledWith({ from: 'shop@shop.test', ...message });
    expect(sendMail.mock.calls[0]?.[0]).not.toHaveProperty('html');
  });

  it('rejects when the SMTP server does', async () => {
    sendMail.mockRejectedValueOnce(Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT' }));
    const sender = new SmtpEmailSender(loadAppConfig({}));

    await expect(sender.send(message)).rejects.toThrow('Connection timeout');
  });
});
