import { useMemo } from 'react';
import type { ImageItem, LayoutOptions } from '../../../types';
import { useContainerWidth } from '../../../hooks/useContainerWidth';
import { GalleryImage } from '../GalleryImage';
import styles from './JustifiedLayout.module.css';

export interface JustifiedLayoutProps {
  images: ImageItem[];
  layout: LayoutOptions;
  onImageClick?: (image: ImageItem, index: number) => void;
  loading?: 'lazy' | 'eager';
  /** Not supported for justified layout (row composition depends on full image list) */
  virtualize?: boolean | number;
  onImageLoad?: () => void;
}

interface Row {
  images: ImageItem[];
  aspectRatioSum: number;
}

function createJustifiedRows(
  images: ImageItem[],
  targetRowHeight: number,
  containerWidth: number,
  gap: number
): Row[] {
  const rows: Row[] = [];
  let currentRow: Row = { images: [], aspectRatioSum: 0 };

  images.forEach((image) => {
    const aspectRatio = image.width && image.height
      ? image.width / image.height
      : 1.5; // Default landscape

    currentRow.images.push(image);
    currentRow.aspectRatioSum += aspectRatio;

    // Calculate what height this row would be
    const gapSpace = (currentRow.images.length - 1) * gap;
    const availableWidth = containerWidth - gapSpace;
    const rowHeight = availableWidth / currentRow.aspectRatioSum;

    // If row height is at or below target, finalize this row
    if (rowHeight <= targetRowHeight) {
      rows.push(currentRow);
      currentRow = { images: [], aspectRatioSum: 0 };
    }
  });

  // Add remaining images as last row
  if (currentRow.images.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

export function JustifiedLayout({
  images,
  layout,
  onImageClick,
  loading,
  virtualize: _virtualize,
  onImageLoad,
}: JustifiedLayoutProps) {
  const { ref, width: containerWidth } = useContainerWidth();
  const gap = typeof layout.gap === 'number' ? layout.gap : 16;
  const gapStr = `${gap}px`;
  const targetRowHeight = layout.rowHeight || 240;

  const rows = useMemo(
    () => createJustifiedRows(images, targetRowHeight, containerWidth, gap),
    [images, targetRowHeight, containerWidth, gap]
  );

  // Find original index for each image
  const getOriginalIndex = (image: ImageItem) =>
    images.findIndex((img) => img.id === image.id);

  return (
    <div ref={ref} className={`${styles.justified} gallery-justified`} style={{ gap: gapStr }}>
      {rows.map((row, rowIndex) => {
        // Calculate actual row height based on aspect ratios
        const gapSpace = (row.images.length - 1) * gap;
        const availableWidth = containerWidth - gapSpace;
        const rowHeight = Math.min(
          availableWidth / row.aspectRatioSum,
          layout.maxRowHeight || 300
        );

        return (
          <div
            key={rowIndex}
            className={styles.row}
            style={{ gap: gapStr, height: `${rowHeight}px` }}
          >
            {row.images.map((image) => {
              return (
                <GalleryImage
                  key={image.id}
                  image={image}
                  index={getOriginalIndex(image)}
                  onClick={onImageClick}
                  loading={loading}
                  onImageLoad={onImageLoad}
                  className={styles.image}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
