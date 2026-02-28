import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { StorageAdapter } from './adapters/storage';
import type { DatabaseAdapter } from './adapters/database';
import type { ImageTransformer } from './adapters/image-transform';

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
  // Admin
  ADMIN_EMAIL?: string;
  // S3-compatible storage
  S3_BUCKET?: string;
  S3_REGION?: string;
  S3_ENDPOINT?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_FORCE_PATH_STYLE?: string;
  // OAuth - Google
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  // OAuth - Apple
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
  APPLE_REDIRECT_URI?: string;
  // Dashboard URL for OAuth redirects
  DASHBOARD_URL?: string;
  // 4sure OIDC
  FOURSURE_CLIENT_ID?: string;
  FOURSURE_CLIENT_SECRET?: string;
  FOURSURE_ISSUER?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
  isAdmin: boolean;
}

export interface ApiKeyTenant {
  id: string;
  userId: string;
}

export type AuthVariables = {
  user: AuthUser;
  apiTenant: ApiKeyTenant;
};

export type AdapterVariables = {
  storage: StorageAdapter;
  db: DatabaseAdapter;
  imageTransformer: ImageTransformer;
};
