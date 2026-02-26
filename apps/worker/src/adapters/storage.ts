export interface StorageObject {
  body: ReadableStream;
  etag: string;
  contentType: string;
  size: number;
}

export interface StoragePutOptions {
  httpMetadata?: {
    contentType?: string;
  };
}

export interface StorageAdapter {
  put(key: string, body: ArrayBuffer | ReadableStream | string, options?: StoragePutOptions): Promise<void>;
  get(key: string): Promise<StorageObject | null>;
  delete(key: string): Promise<void>;
}
