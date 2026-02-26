import { describe, it, expect, vi } from 'vitest';
import { createImagesFromFiles } from '../createImagesFromFiles';

// Mock URL.createObjectURL
vi.stubGlobal('URL', {
  ...URL,
  createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
});

function createMockFileList(files: File[]): FileList {
  return {
    length: files.length,
    item: (i: number) => files[i] || null,
    [Symbol.iterator]: function* () {
      for (let i = 0; i < files.length; i++) yield files[i];
    },
    ...Object.fromEntries(files.map((f, i) => [i, f])),
  } as unknown as FileList;
}

describe('createImagesFromFiles', () => {
  it('should convert image files to ImageItems', () => {
    const files = createMockFileList([
      new File([''], 'photo.jpg', { type: 'image/jpeg' }),
      new File([''], 'pic.png', { type: 'image/png' }),
    ]);

    const images = createImagesFromFiles(files);

    expect(images).toHaveLength(2);
    expect(images[0].alt).toBe('photo.jpg');
    expect(images[0].src).toBe('blob:photo.jpg');
    expect(images[1].alt).toBe('pic.png');
  });

  it('should skip non-image files', () => {
    const files = createMockFileList([
      new File([''], 'photo.jpg', { type: 'image/jpeg' }),
      new File([''], 'doc.pdf', { type: 'application/pdf' }),
    ]);

    const images = createImagesFromFiles(files);
    expect(images).toHaveLength(1);
  });

  it('should handle empty FileList', () => {
    const files = createMockFileList([]);
    const images = createImagesFromFiles(files);
    expect(images).toHaveLength(0);
  });
});
