import { describe, it, expect, vi } from 'vitest';
import { s3Adapter } from '../s3Adapter';

const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult>
  <Contents><Key>photos/beach.jpg</Key></Contents>
  <Contents><Key>photos/sunset.png</Key></Contents>
  <Contents><Key>photos/readme.txt</Key></Contents>
  <Contents><Key>photos/mountain.webp</Key></Contents>
</ListBucketResult>`;

describe('s3Adapter', () => {
  it('should have the name "s3"', () => {
    expect(s3Adapter.name).toBe('s3');
  });

  it('should parse S3 XML and return only image files', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      text: async () => mockXml,
      status: 200,
      statusText: 'OK',
    })) as unknown as typeof fetch;

    const images = await s3Adapter.fetch({
      bucket: 'my-bucket',
      region: 'us-east-1',
      prefix: 'photos/',
      fetchFn: mockFetch,
    });

    expect(images).toHaveLength(3);
    expect(images[0].src).toBe('https://my-bucket.s3.us-east-1.amazonaws.com/photos/beach.jpg');
    expect(images[0].alt).toBe('beach.jpg');
  });

  it('should throw on non-OK response', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    })) as unknown as typeof fetch;

    await expect(
      s3Adapter.fetch({ bucket: 'private', region: 'us-east-1', fetchFn: mockFetch })
    ).rejects.toThrow('S3 listing failed: 403 Forbidden');
  });

  it('should filter by custom extensions', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      text: async () => mockXml,
    })) as unknown as typeof fetch;

    const images = await s3Adapter.fetch({
      bucket: 'my-bucket',
      region: 'us-east-1',
      extensions: ['.png'],
      fetchFn: mockFetch,
    });

    expect(images).toHaveLength(1);
    expect(images[0].alt).toBe('sunset.png');
  });

  it('should validate bucket and region', () => {
    expect(s3Adapter.validate!({ bucket: 'b', region: 'r' })).toBe(true);
    expect(s3Adapter.validate!({ bucket: '', region: 'r' })).toBe(false);
    expect(s3Adapter.validate!({ bucket: 'b', region: '' })).toBe(false);
  });
});
