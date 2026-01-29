import { describe, it, expect } from 'vitest';
import { urlAdapter } from '../urlAdapter';

describe('urlAdapter', () => {
  it('should have the name "url"', () => {
    expect(urlAdapter.name).toBe('url');
  });

  it('should convert string URLs to ImageItems', async () => {
    const images = await urlAdapter.fetch({
      urls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
    });

    expect(images).toHaveLength(2);
    expect(images[0].id).toBe('url-0');
    expect(images[0].src).toBe('https://example.com/a.jpg');
    expect(images[0].alt).toBe('Image 1');
  });

  it('should convert object entries to ImageItems', async () => {
    const images = await urlAdapter.fetch({
      urls: [{ src: 'https://example.com/a.jpg', alt: 'My photo', title: 'Photo A' }],
    });

    expect(images[0].src).toBe('https://example.com/a.jpg');
    expect(images[0].alt).toBe('My photo');
    expect(images[0].title).toBe('Photo A');
  });

  it('should apply baseUrl to relative paths', async () => {
    const images = await urlAdapter.fetch({
      urls: ['images/a.jpg'],
      baseUrl: 'https://cdn.example.com/',
    });

    expect(images[0].src).toBe('https://cdn.example.com/images/a.jpg');
  });

  it('should validate that urls is non-empty', () => {
    expect(urlAdapter.validate!({ urls: ['a.jpg'] })).toBe(true);
    expect(urlAdapter.validate!({ urls: [] })).toBe(false);
  });
});
