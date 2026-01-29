import type { ImageItem, SourceAdapter } from '../types';

export interface UrlAdapterConfig {
  urls: (string | { src: string; alt?: string; title?: string })[];
  baseUrl?: string;
}

export const urlAdapter: SourceAdapter<UrlAdapterConfig> = {
  name: 'url',

  fetch: async (config) => {
    const { urls, baseUrl } = config;

    return urls.map((entry, index): ImageItem => {
      if (typeof entry === 'string') {
        const src = baseUrl ? new URL(entry, baseUrl).href : entry;
        return {
          id: `url-${index}`,
          src,
          alt: `Image ${index + 1}`,
        };
      }

      const src = baseUrl ? new URL(entry.src, baseUrl).href : entry.src;
      return {
        id: `url-${index}`,
        src,
        alt: entry.alt || `Image ${index + 1}`,
        title: entry.title,
      };
    });
  },

  validate: (config) => {
    return Array.isArray(config.urls) && config.urls.length > 0;
  },
};
