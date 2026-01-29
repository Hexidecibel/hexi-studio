import { useMemo, useRef } from 'react';
import type { ImageItem, LayoutOptions } from '../../../types';
import { GalleryImage } from '../GalleryImage';
import { useVirtualization } from '../../../hooks/useVirtualization';
import styles from './MasonryLayout.module.css';

export interface MasonryLayoutProps {
  images: ImageItem[];
  layout: LayoutOptions;
  onImageClick?: (image: ImageItem, index: number) => void;
  loading?: 'lazy' | 'eager';
  virtualize?: boolean | number;
  onImageLoad?: () => void;
}

function distributeIntoColumns(
  images: ImageItem[],
  columnCount: number
): ImageItem[][] {
  const columns: ImageItem[][] = Array.from({ length: columnCount }, () => []);
  const columnHeights: number[] = Array(columnCount).fill(0);

  images.forEach((image) => {
    const shortestIndex = columnHeights.indexOf(Math.min(...columnHeights));
    columns[shortestIndex].push(image);
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
  virtualize,
  onImageLoad,
}: MasonryLayoutProps) {
  const gap = typeof layout.gap === 'number' ? `${layout.gap}px` : layout.gap || '16px';
  const columnCount = layout.columns === 'auto' ? 3 : layout.columns || 3;
  const containerRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(
    () => distributeIntoColumns(images, columnCount),
    [images, columnCount]
  );

  const getOriginalIndex = (image: ImageItem) =>
    images.findIndex((img) => img.id === image.id);

  // Virtualize based on the longest column's item count
  const enabled = virtualize === true || typeof virtualize === 'number';
  const maxColumnLength = Math.max(...columns.map((c) => c.length), 0);
  const { virtualItems, isVirtualized } = useVirtualization({
    totalCount: maxColumnLength,
    estimatedItemHeight: 280,
    containerRef,
    enabled,
  });

  const gridStyle: React.CSSProperties = {
    gap,
    gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
  };

  // When virtualized, only render items whose row index falls within the visible range
  const visibleRowStart = isVirtualized && virtualItems.length > 0
    ? virtualItems[0].index
    : 0;
  const visibleRowEnd = isVirtualized && virtualItems.length > 0
    ? virtualItems[virtualItems.length - 1].index
    : maxColumnLength - 1;

  return (
    <div ref={containerRef} className={`${styles.masonry} gallery-masonry`} style={gridStyle}>
      {columns.map((column, colIndex) => (
        <div key={colIndex} className={styles.column} style={{ gap }}>
          {column.map((image, rowInCol) => {
            if (isVirtualized && (rowInCol < visibleRowStart || rowInCol > visibleRowEnd)) {
              // Render a spacer to preserve layout height
              const aspectRatio = image.width && image.height
                ? image.height / image.width
                : 1;
              return (
                <div
                  key={image.id}
                  style={{ aspectRatio: `1 / ${aspectRatio}`, width: '100%' }}
                  aria-hidden="true"
                />
              );
            }
            return (
              <GalleryImage
                key={image.id}
                image={image}
                index={getOriginalIndex(image)}
                onClick={onImageClick}
                loading={loading}
                onImageLoad={onImageLoad}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
