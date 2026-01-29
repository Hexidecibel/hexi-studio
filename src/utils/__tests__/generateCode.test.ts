import { describe, it, expect } from 'vitest';
import { generateCode } from '../generateCode';

describe('generateCode', () => {
  it('should generate minimal code for default config', () => {
    const code = generateCode({
      images: [],
      layout: { type: 'grid', columns: 'auto', gap: 16 },
    });

    expect(code).toContain('<Gallery');
    expect(code).toContain('images={images}');
    expect(code).toContain('enableLightbox');
    expect(code).not.toContain('layout=');
  });

  it('should include layout prop when non-default type', () => {
    const code = generateCode({
      images: [],
      layout: { type: 'masonry', columns: 'auto', gap: 16 },
    });

    expect(code).toContain("type: 'masonry'");
  });

  it('should include gap when non-default', () => {
    const code = generateCode({
      images: [],
      layout: { type: 'grid', columns: 'auto', gap: 24 },
    });

    expect(code).toContain('gap: 24');
  });

  it('should include rowHeight for justified layout', () => {
    const code = generateCode({
      images: [],
      layout: { type: 'justified', columns: 'auto', gap: 16, rowHeight: 300 },
    });

    expect(code).toContain('rowHeight: 300');
  });

  it('should add theme comment when theme is set', () => {
    const code = generateCode({
      images: [],
      layout: { type: 'grid', columns: 'auto', gap: 16 },
      theme: { bgPrimary: '#000' },
    });

    expect(code).toContain('CSS custom properties');
  });
});
