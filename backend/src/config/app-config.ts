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
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser?: string;
    smtpPass?: string;
    fromAddress: string;
    salesInbox: string;
  };
}

type Env = Record<string, string | undefined>;

export function loadAppConfig(env: Env): AppConfig {
  return {
    port: readInt(env, 'PORT', 3000),
    fakeStore: {
      baseUrl: readString(env, 'FAKE_STORE_BASE_URL', 'https://fakestoreapi.com').replace(/\/+$/, ''),
      timeoutMs: readInt(env, 'FAKE_STORE_TIMEOUT_MS', 5000),
      cacheTtlMs: readInt(env, 'PRODUCT_CACHE_TTL_MS', 5 * 60 * 1000),
    },
    topRated: {
      featuredProductIds: readIdList(env, 'FEATURED_PRODUCT_IDS', [1, 5, 9, 13, 17]),
      categoryTopRatedCount: readInt(env, 'CATEGORY_TOP_RATED_COUNT', 3),
    },
    email: {
      smtpHost: readString(env, 'SMTP_HOST', 'localhost'),
      smtpPort: readInt(env, 'SMTP_PORT', 1025),
      smtpSecure: readBoolean(env, 'SMTP_SECURE', false),
      smtpUser: readOptional(env, 'SMTP_USER'),
      smtpPass: readOptional(env, 'SMTP_PASS'),
      fromAddress: readString(env, 'ENQUIRY_FROM_EMAIL', 'catalogue@example.com'),
      salesInbox: readString(env, 'SALES_INBOX_EMAIL', 'sales@example.com'),
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

function readInt(env: Env, name: string, fallback: number): number {
  const raw = readOptional(env, name);
  if (raw === undefined) return fallback;
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${name} must be a non-negative whole number, got "${raw}"`);
  }
  return Number(raw);
}

function readBoolean(env: Env, name: string, fallback: boolean): boolean {
  const raw = readOptional(env, name)?.toLowerCase();
  if (raw === undefined) return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`${name} must be "true" or "false", got "${raw}"`);
}

function readIdList(env: Env, name: string, fallback: number[]): number[] {
  const raw = readOptional(env, name);
  if (raw === undefined) return fallback;
  const parts = raw.split(',').map((part) => part.trim());
  if (parts.some((part) => !/^[1-9]\d*$/.test(part))) {
    throw new Error(`${name} must be a comma-separated list of product ids, got "${raw}"`);
  }
  return [...new Set(parts.map(Number))];
}
