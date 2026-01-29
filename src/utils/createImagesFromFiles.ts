import type { ImageItem } from '../types';

export function createImagesFromFiles(files: FileList): ImageItem[] {
  const images: ImageItem[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith('image/')) continue;

    images.push({
      id: `file-${i}-${file.name}`,
      src: URL.createObjectURL(file),
      alt: file.name,
    });
  }

  return images;
}
