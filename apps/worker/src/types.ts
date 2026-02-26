import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  ENVIRONMENT: string;
  CORS_ORIGIN: string;
  CDN_BASE_URL: string;
  MAGIC_LINK_BASE_URL?: string;
  // Email: SMTP (preferred)
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  // Email: Resend API (alternative)
  RESEND_API_KEY?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
}

export type AuthVariables = {
  user: AuthUser;
};
