import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { StorageAdapter, StorageObject, StoragePutOptions } from './storage';

export interface S3StorageConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;

    // Default forcePathStyle to true when a custom endpoint is set
    // (needed for MinIO, Backblaze B2, Wasabi, etc.)
    const forcePathStyle = config.forcePathStyle ?? !!config.endpoint;

    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint || undefined,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle,
    });
  }

  async put(key: string, body: ArrayBuffer | ReadableStream | string, options?: StoragePutOptions): Promise<void> {
    let bodyBuffer: Buffer;

    if (body instanceof ArrayBuffer) {
      bodyBuffer = Buffer.from(body);
    } else if (typeof body === 'string') {
      bodyBuffer = Buffer.from(body, 'utf-8');
    } else {
      // ReadableStream - collect to Buffer
      const arrayBuffer = await new Response(body).arrayBuffer();
      bodyBuffer = Buffer.from(arrayBuffer);
    }

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: bodyBuffer,
      ContentType: options?.httpMetadata?.contentType,
    }));
  }

  async get(key: string): Promise<StorageObject | null> {
    try {
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));

      const stream = response.Body?.transformToWebStream() as ReadableStream;
      if (!stream) return null;

      return {
        body: stream,
        etag: response.ETag || '',
        contentType: response.ContentType || 'application/octet-stream',
        size: response.ContentLength || 0,
      };
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'NoSuchKey') {
        return null;
      }
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }
}
