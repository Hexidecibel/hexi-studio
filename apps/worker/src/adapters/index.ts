import type { StorageAdapter } from './storage';
import type { DatabaseAdapter } from './database';
import type { ImageTransformer } from './image-transform';
import { R2StorageAdapter } from './r2-storage';
import { D1DatabaseAdapter } from './d1-database';
import { PassthroughTransformer } from './passthrough-transform';

export type { StorageAdapter } from './storage';
export type { StorageObject, StoragePutOptions } from './storage';
export type { DatabaseAdapter, DatabaseStatement, DatabaseResult } from './database';
export type { ImageTransformer, ImageTransformOptions, ImageAnalysis } from './image-transform';

export interface Adapters {
  storage: StorageAdapter;
  db: DatabaseAdapter;
  imageTransformer: ImageTransformer;
}

export async function createAdapters(env: Record<string, unknown>): Promise<Adapters> {
  const mode = (env.RUNTIME_MODE as string) || 'cloudflare';

  if (mode === 'local') {
    const { LocalStorageAdapter } = await import('./local-storage');
    const { SqliteDatabaseAdapter } = await import('./sqlite-database');
    const { SharpTransformer } = await import('./sharp-transform');

    return {
      storage: new LocalStorageAdapter(env.STORAGE_PATH as string),
      db: new SqliteDatabaseAdapter(env.DATABASE_PATH as string),
      imageTransformer: new SharpTransformer(),
    };
  }

  if (mode === 's3') {
    const { S3StorageAdapter } = await import('./s3-storage');
    const { SqliteDatabaseAdapter } = await import('./sqlite-database');
    const { SharpTransformer } = await import('./sharp-transform');

    return {
      storage: new S3StorageAdapter({
        bucket: env.S3_BUCKET as string,
        region: (env.S3_REGION as string) || 'us-east-1',
        endpoint: env.S3_ENDPOINT as string | undefined,
        accessKeyId: env.S3_ACCESS_KEY_ID as string,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY as string,
        forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
      }),
      db: new SqliteDatabaseAdapter(env.DATABASE_PATH as string),
      imageTransformer: new SharpTransformer(),
    };
  }

  return {
    storage: new R2StorageAdapter(env.MEDIA_BUCKET as R2Bucket),
    db: new D1DatabaseAdapter(env.DB as D1Database),
    imageTransformer: new PassthroughTransformer(),
  };
}
