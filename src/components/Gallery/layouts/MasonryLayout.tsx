import { useMemo } from 'react';
import type { ImageItem, LayoutOptions } from '../../../types';
import { GalleryImage } from '../GalleryImage';
import styles from './MasonryLayout.module.css';

export interface MasonryLayoutProps {
  images: ImageItem[];
  layout: LayoutOptions;
  onImageClick?: (image: ImageItem, index: number) => void;
  loading?: 'lazy' | 'eager';
}

function distributeIntoColumns(
  images: ImageItem[],
  columnCount: number
): ImageItem[][] {
  const columns: ImageItem[][] = Array.from({ length: columnCount }, () => []);
  const columnHeights: number[] = Array(columnCount).fill(0);

  images.forEach((image) => {
    // Find shortest column
    const shortestIndex = columnHeights.indexOf(Math.min(...columnHeights));

    // Add image to shortest column
    columns[shortestIndex].push(image);

    // Update column height (use aspect ratio or default to square)
    const aspectRatio = image.width && image.height
      ? image.height / image.width
      : 1;
    columnHeights[shortestIndex] += aspectRatio;
  });

  return columns;
}

export function MasonryLayout({
  images,
  layout,
  onImageClick,
  loading,
}: MasonryLayoutProps) {
  const gap = typeof layout.gap === 'number' ? `${layout.gap}px` : layout.gap || '16px';
  const columnCount = layout.columns === 'auto' ? 3 : layout.columns || 3;

  const columns = useMemo(
    () => distributeIntoColumns(images, columnCount),
    [images, columnCount]
  );

  // Find original index for each image
  const getOriginalIndex = (image: ImageItem) =>
    images.findIndex((img) => img.id === image.id);

  const style: React.CSSProperties = {
    gap,
    gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
  };

  return (
    <div className={`${styles.masonry} gallery-masonry`} style={style}>
      {columns.map((column, colIndex) => (
        <div key={colIndex} className={styles.column} style={{ gap }}>
          {column.map((image) => (
            <GalleryImage
              key={image.id}
              image={image}
              index={getOriginalIndex(image)}
              onClick={onImageClick}
              loading={loading}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
