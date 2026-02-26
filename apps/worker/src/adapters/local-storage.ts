import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { StorageAdapter, StorageObject, StoragePutOptions } from './storage';

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private basePath: string) {}

  private resolve(key: string): string {
    return path.join(this.basePath, key);
  }

  async put(key: string, body: ArrayBuffer | ReadableStream | string, options?: StoragePutOptions): Promise<void> {
    const filePath = this.resolve(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    if (body instanceof ArrayBuffer) {
      await fs.writeFile(filePath, Buffer.from(body));
    } else if (typeof body === 'string') {
      await fs.writeFile(filePath, body);
    } else {
      // ReadableStream
      const chunks: Uint8Array[] = [];
      const reader = body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      await fs.writeFile(filePath, Buffer.concat(chunks));
    }

    // Store content-type in a sidecar .meta file
    if (options?.httpMetadata?.contentType) {
      await fs.writeFile(filePath + '.meta', JSON.stringify({
        contentType: options.httpMetadata.contentType,
      }));
    }
  }

  async get(key: string): Promise<StorageObject | null> {
    const filePath = this.resolve(key);
    try {
      const stat = await fs.stat(filePath);
      const data = await fs.readFile(filePath);
      const hash = crypto.createHash('md5').update(data).digest('hex');

      let contentType = 'application/octet-stream';
      try {
        const meta = JSON.parse(await fs.readFile(filePath + '.meta', 'utf-8'));
        contentType = meta.contentType || contentType;
      } catch {
        // no meta file, use default
      }

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(data));
          controller.close();
        },
      });

      return {
        body: stream,
        etag: `"${hash}"`,
        contentType,
        size: stat.size,
      };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolve(key);
    try {
      await fs.unlink(filePath);
      await fs.unlink(filePath + '.meta').catch(() => {});
    } catch {
      // file doesn't exist, that's fine
    }
  }
}
