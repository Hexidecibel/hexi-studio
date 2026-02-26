import type { MediaItem } from '../types';

export function createImagesFromFiles(files: FileList): MediaItem[] {
  const items: MediaItem[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isImage && !isVideo) continue;

    items.push({
      id: `file-${i}-${file.name}`,
      src: URL.createObjectURL(file),
      alt: file.name,
      ...(isVideo && { type: 'video' as const }),
    });
  }

  return items;
}
