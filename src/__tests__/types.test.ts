import { describe, it, expect } from 'vitest';
import type {
  ImageItem,
  LayoutType,
  LayoutOptions,
  GalleryProps,
  SourceAdapter,
} from '../types';
import { DEFAULT_LAYOUT } from '../types';

describe('Types', () => {
  describe('ImageItem', () => {
    it('should accept minimal required properties', () => {
      const image: ImageItem = {
        id: '1',
        src: 'https://example.com/image.jpg',
        alt: 'Test image',
      };

      expect(image.id).toBe('1');
      expect(image.src).toBe('https://example.com/image.jpg');
      expect(image.alt).toBe('Test image');
    });

    it('should accept all optional properties', () => {
      const image: ImageItem = {
        id: '1',
        src: 'https://example.com/image.jpg',
        alt: 'Test image',
        width: 1920,
        height: 1080,
        thumbnail: 'https://example.com/thumb.jpg',
        blurDataUrl: 'data:image/jpeg;base64,...',
        srcSet: 'image-320.jpg 320w, image-640.jpg 640w',
        title: 'Beautiful Sunset',
        description: 'A sunset over the ocean',
        metadata: { photographer: 'John Doe', date: '2024-01-01' },
      };

      expect(image.width).toBe(1920);
      expect(image.height).toBe(1080);
      expect(image.metadata?.photographer).toBe('John Doe');
    });
  });

  describe('LayoutType', () => {
    it('should only allow valid layout types', () => {
      const validTypes: LayoutType[] = ['grid', 'masonry', 'justified'];

      validTypes.forEach((type) => {
        expect(['grid', 'masonry', 'justified']).toContain(type);
      });
    });
  });

  describe('LayoutOptions', () => {
    it('should accept minimal configuration', () => {
      const layout: LayoutOptions = {
        type: 'grid',
      };

      expect(layout.type).toBe('grid');
    });

    it('should accept full configuration', () => {
      const layout: LayoutOptions = {
        type: 'justified',
        columns: 4,
        gap: '16px',
        rowHeight: 200,
        maxRowHeight: 300,
      };

      expect(layout.columns).toBe(4);
      expect(layout.gap).toBe('16px');
      expect(layout.rowHeight).toBe(200);
    });

    it('should accept auto columns', () => {
      const layout: LayoutOptions = {
        type: 'masonry',
        columns: 'auto',
      };

      expect(layout.columns).toBe('auto');
    });
  });

  describe('DEFAULT_LAYOUT', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_LAYOUT.type).toBe('grid');
      expect(DEFAULT_LAYOUT.columns).toBe('auto');
      expect(DEFAULT_LAYOUT.gap).toBe(16);
    });
  });

  describe('GalleryProps', () => {
    it('should accept minimal props', () => {
      const props: GalleryProps = {
        images: [],
      };

      expect(props.images).toEqual([]);
    });

    it('should accept full props', () => {
      const props: GalleryProps = {
        images: [{ id: '1', src: 'test.jpg', alt: 'test' }],
        layout: { type: 'masonry' },
        className: 'my-gallery',
        onImageClick: () => {},
        enableLightbox: true,
        loading: 'lazy',
        renderImage: () => null,
      };

      expect(props.enableLightbox).toBe(true);
      expect(props.loading).toBe('lazy');
    });
  });

  describe('SourceAdapter', () => {
    it('should define adapter interface', () => {
      const adapter: SourceAdapter<{ url: string }> = {
        name: 'test-adapter',
        fetch: async (config) => {
          return [{ id: '1', src: config.url, alt: 'test' }];
        },
        validate: (config) => !!config.url,
      };

      expect(adapter.name).toBe('test-adapter');
      expect(adapter.validate?.({ url: 'test' })).toBe(true);
    });
  });
});
