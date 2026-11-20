/**
 * Typed application config, read once from environment variables at startup.
 * Every variable is documented in the repo-root `.env.example`.
 * Invalid values stop the app at startup instead of failing on a later request.
 */
export const APP_CONFIG = Symbol('APP_CONFIG');

export interface AppConfig {
  port: number;
  fakeStore: {
    baseUrl: string;
    timeoutMs: number;
    cacheTtlMs: number;
  };
  topRated: {
    featuredProductIds: number[];
    categoryTopRatedCount: number;
  };
  /** Provider-neutral email settings, used whichever EmailSender is bound. */
  email: {
    fromAddress: string;
    salesInbox: string;
  };
  /** Settings for SmtpEmailSender only. Another provider (e.g. SES) would get its own section. */
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth?: { user: string; pass: string };
  };
}

type Env = Record<string, string | undefined>;

export function loadAppConfig(env: Env): AppConfig {
  return {
    port: readInt(env, 'PORT', 3000, { min: 1, max: 65535 }),
    fakeStore: {
      baseUrl: readUrl(env, 'FAKE_STORE_BASE_URL', 'https://fakestoreapi.com'),
      timeoutMs: readInt(env, 'FAKE_STORE_TIMEOUT_MS', 5000, { min: 1 }),
      cacheTtlMs: readInt(env, 'PRODUCT_CACHE_TTL_MS', 5 * 60 * 1000, { min: 0 }),
    },
    topRated: {
      featuredProductIds: readIdList(env, 'FEATURED_PRODUCT_IDS', [1, 5, 9, 13, 17]),
      categoryTopRatedCount: readInt(env, 'CATEGORY_TOP_RATED_COUNT', 3, { min: 0 }),
    },
    email: {
      fromAddress: readEmail(env, 'ENQUIRY_FROM_EMAIL', 'catalogue@example.com'),
      salesInbox: readEmail(env, 'SALES_INBOX_EMAIL', 'sales@example.com'),
    },
    smtp: {
      host: readString(env, 'SMTP_HOST', 'localhost'),
      port: readInt(env, 'SMTP_PORT', 1025, { min: 1, max: 65535 }),
      secure: readBoolean(env, 'SMTP_SECURE', false),
      auth: readSmtpAuth(env),
    },
  };
}

function readOptional(env: Env, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

function readString(env: Env, name: string, fallback: string): string {
  return readOptional(env, name) ?? fallback;
}

function readInt(env: Env, name: string, fallback: number, bounds: { min: number; max?: number }): number {
  const raw = readOptional(env, name);
  if (raw === undefined) return fallback;
  const value = /^\d+$/.test(raw) ? Number(raw) : NaN;
  const { min, max = Number.MAX_SAFE_INTEGER } = bounds;
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be a whole number from ${min} to ${max}, got "${raw}"`);
  }
  return value;
}

function readBoolean(env: Env, name: string, fallback: boolean): boolean {
  const raw = readOptional(env, name)?.toLowerCase();
  if (raw === undefined) return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`${name} must be "true" or "false", got "${raw}"`);
}

function readUrl(env: Env, name: string, fallback: string): string {
  const raw = readString(env, name, fallback);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} must be a full http(s) URL, got "${raw}"`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must be a full http(s) URL, got "${raw}"`);
  }
  return raw.replace(/\/+$/, '');
}

/** A light sanity check (something@something.something); the email provider is the real judge. */
function readEmail(env: Env, name: string, fallback: string): string {
  const raw = readString(env, name, fallback);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    throw new Error(`${name} must be an email address, got "${raw}"`);
  }
  return raw;
}

function readSmtpAuth(env: Env): AppConfig['smtp']['auth'] {
  const user = readOptional(env, 'SMTP_USER');
  const pass = readOptional(env, 'SMTP_PASS');
  if (!user && !pass) return undefined;
  if (!user || !pass) throw new Error('SMTP_USER and SMTP_PASS must be set together, or both left empty');
  return { user, pass };
}

function readIdList(env: Env, name: string, fallback: number[]): number[] {
  const raw = readOptional(env, name);
  if (raw === undefined) return fallback;
  const parts = raw.split(',').map((part) => part.trim());
  if (parts.some((part) => !/^[1-9]\d{0,8}$/.test(part))) {
    throw new Error(`${name} must be a comma-separated list of product ids, got "${raw}"`);
  }
  return [...new Set(parts.map(Number))];
}
