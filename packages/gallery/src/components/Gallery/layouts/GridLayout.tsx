import { useRef } from 'react';
import type { ImageItem, LayoutOptions } from '../../../types';
import { GalleryImage } from '../GalleryImage';
import { useContainerWidth } from '../../../hooks/useContainerWidth';
import { useVirtualization } from '../../../hooks/useVirtualization';
import styles from './GridLayout.module.css';

export interface GridLayoutProps {
  images: ImageItem[];
  layout: LayoutOptions;
  onImageClick?: (image: ImageItem, index: number) => void;
  loading?: 'lazy' | 'eager';
  virtualize?: boolean | number;
  onImageLoad?: () => void;
  isSelecting?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (image: ImageItem) => void;
  onLongPress?: (image: ImageItem) => void;
}

function getColumnCount(containerWidth: number, explicitColumns: number | 'auto' | undefined): number {
  if (explicitColumns && explicitColumns !== 'auto') return explicitColumns;
  // Match the CSS breakpoints for auto-fill minmax
  if (containerWidth < 640) return Math.max(1, Math.floor(containerWidth / 150));
  if (containerWidth < 768) return Math.max(1, Math.floor(containerWidth / 200));
  if (containerWidth >= 1024) return Math.max(1, Math.floor(containerWidth / 280));
  return Math.max(1, Math.floor(containerWidth / 250));
}

export function GridLayout({
  images,
  layout,
  onImageClick,
  loading,
  virtualize,
  onImageLoad,
  isSelecting,
  selected,
  onToggleSelect,
  onLongPress,
}: GridLayoutProps) {
  const gapNum = typeof layout.gap === 'number' ? layout.gap : 16;
  const gapStr = typeof layout.gap === 'string' ? layout.gap : `${gapNum}px`;
  const columns = layout.columns;
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref: widthRef, width: containerWidth } = useContainerWidth();

  const enabled = virtualize === true || typeof virtualize === 'number';
  const colCount = getColumnCount(containerWidth, columns);
  const rowCount = Math.ceil(images.length / colCount);
  const estimatedRowHeight = 280 + gapNum;

  const { virtualItems, totalHeight, isVirtualized } = useVirtualization({
    totalCount: rowCount,
    estimatedItemHeight: estimatedRowHeight,
    containerRef,
    enabled,
  });

  const gridStyle: React.CSSProperties = {
    gap: gapStr,
    ...(columns && columns !== 'auto' && { gridTemplateColumns: `repeat(${columns}, 1fr)` }),
  };

  // Merge refs: widthRef for measuring, containerRef for scroll tracking
  const setRefs = (node: HTMLDivElement | null) => {
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    (widthRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  if (isVirtualized) {
    return (
      <div
        ref={setRefs}
        className={`${styles.grid} ${styles.virtualContainer} gallery-grid`}
        style={{ position: 'relative', height: totalHeight, width: '100%' }}
      >
        {virtualItems.map((vRow) => {
          const startIdx = vRow.index * colCount;
          const rowImages = images.slice(startIdx, startIdx + colCount);
          return (
            <div
              key={vRow.index}
              className={styles.virtualRow}
              style={{
                position: 'absolute',
                top: vRow.offsetTop,
                left: 0,
                right: 0,
                display: 'grid',
                gridTemplateColumns: `repeat(${colCount}, 1fr)`,
                gap: gapStr,
              }}
            >
              {rowImages.map((image, i) => (
                <GalleryImage
                  key={image.id}
                  image={image}
                  index={startIdx + i}
                  onClick={onImageClick}
                  loading={loading}
                  onImageLoad={onImageLoad}
                  isSelecting={isSelecting}
                  isSelected={selected?.has(image.id)}
                  onToggleSelect={onToggleSelect}
                  onLongPress={onLongPress}
                />
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={setRefs} className={`${styles.grid} gallery-grid`} style={gridStyle}>
      {images.map((image, index) => (
        <GalleryImage
          key={image.id}
          image={image}
          index={index}
          onClick={onImageClick}
          loading={loading}
          onImageLoad={onImageLoad}
          isSelecting={isSelecting}
          isSelected={selected?.has(image.id)}
          onToggleSelect={onToggleSelect}
          onLongPress={onLongPress}
        />
      ))}
    </div>
  );
}
