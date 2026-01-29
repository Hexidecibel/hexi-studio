import type { ImageItem, SourceAdapter } from '../types';

export interface S3AdapterConfig {
  bucket: string;
  region: string;
  prefix?: string;
  extensions?: string[];
  fetchFn?: typeof fetch;
}

const DEFAULT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'];

function buildBucketUrl(bucket: string, region: string, prefix?: string): string {
  let url = `https://${bucket}.s3.${region}.amazonaws.com/?list-type=2`;
  if (prefix) {
    url += `&prefix=${encodeURIComponent(prefix)}`;
  }
  return url;
}

function parseS3Xml(xml: string): string[] {
  const keys: string[] = [];
  const keyRegex = /<Key>([^<]+)<\/Key>/g;
  let match;
  while ((match = keyRegex.exec(xml)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

function isImageFile(key: string, extensions: string[]): boolean {
  const lower = key.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

export const s3Adapter: SourceAdapter<S3AdapterConfig> = {
  name: 's3',

  fetch: async (config) => {
    const {
      bucket,
      region,
      prefix,
      extensions = DEFAULT_EXTENSIONS,
      fetchFn = fetch,
    } = config;

    const url = buildBucketUrl(bucket, region, prefix);
    const response = await fetchFn(url);

    if (!response.ok) {
      throw new Error(`S3 listing failed: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    const keys = parseS3Xml(xml);
    const imageKeys = keys.filter((key) => isImageFile(key, extensions));

    return imageKeys.map((key, index): ImageItem => {
      const filename = key.split('/').pop() || key;
      return {
        id: `s3-${index}`,
        src: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
        alt: filename,
      };
    });
  },

  validate: (config) => {
    return Boolean(config.bucket && config.region);
  },
};
