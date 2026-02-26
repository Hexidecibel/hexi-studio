import type { StorageAdapter, StorageObject, StoragePutOptions } from './storage';

export class R2StorageAdapter implements StorageAdapter {
  constructor(private bucket: R2Bucket) {}

  async put(key: string, body: ArrayBuffer | ReadableStream | string, options?: StoragePutOptions): Promise<void> {
    await this.bucket.put(key, body, {
      httpMetadata: options?.httpMetadata,
    });
  }

  async get(key: string): Promise<StorageObject | null> {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    return {
      body: obj.body,
      etag: obj.etag,
      contentType: obj.httpMetadata?.contentType || 'application/octet-stream',
      size: obj.size,
    };
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }
}
