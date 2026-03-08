import { useMemo, useRef } from 'react';
import type { ImageItem, LayoutOptions } from '../../../types';
import { GalleryImage } from '../GalleryImage';
import { useVirtualization } from '../../../hooks/useVirtualization';
import { useContainerWidth } from '../../../hooks/useContainerWidth';
import styles from './MasonryLayout.module.css';

export interface MasonryLayoutProps {
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

interface ItemPosition {
  image: ImageItem;
  x: number;
  y: number;
  width: number;
  height: number;
}

function getMasonryColumnCount(containerWidth: number, explicitColumns: number | 'auto' | undefined): number {
  if (explicitColumns && explicitColumns !== 'auto') return explicitColumns;
  if (containerWidth < 400) return 1;
  if (containerWidth < 640) return 2;
  if (containerWidth < 1024) return 3;
  if (containerWidth < 1280) return 4;
  return 5;
}

function getSpanningItems(images: ImageItem[], columnCount: number): Set<string> {
  if (columnCount < 2) return new Set();

  const scored = images
    .filter((img) => typeof img.metadata?.qualityScore === 'number')
    .map((img) => ({ id: img.id, score: img.metadata!.qualityScore as number }));

  if (scored.length === 0) return new Set();

  scored.sort((a, b) => b.score - a.score);

  // Top 20% of scored images, but cap at 15% of total
  const maxSpan = Math.max(1, Math.floor(images.length * 0.15));
  const top20pct = Math.max(1, Math.floor(scored.length * 0.2));
  const spanCount = Math.min(maxSpan, top20pct);

  const spanning = new Set<string>();
  for (let i = 0; i < spanCount; i++) {
    if (scored[i].score >= 0.6) {
      spanning.add(scored[i].id);
    }
  }

  return spanning;
}

function computeMasonryPositions(
  images: ImageItem[],
  columnCount: number,
  containerWidth: number,
  gapPx: number,
  spanningItems: Set<string>
): { positions: ItemPosition[]; containerHeight: number } {
  const colWidth = (containerWidth - gapPx * (columnCount - 1)) / columnCount;
  const columnHeights: number[] = Array(columnCount).fill(0);
  const positions: ItemPosition[] = [];

  for (const image of images) {
    const spans = spanningItems.has(image.id) && columnCount >= 2;
    const aspectRatio = image.width && image.height
      ? image.height / image.width
      : 0.75;

    if (spans) {
      // Find best pair of adjacent columns (lowest max height between them)
      let bestStart = 0;
      let bestMaxHeight = Infinity;
      for (let i = 0; i < columnCount - 1; i++) {
        const maxH = Math.max(columnHeights[i], columnHeights[i + 1]);
        if (maxH < bestMaxHeight) {
          bestMaxHeight = maxH;
          bestStart = i;
        }
      }

      const itemWidth = colWidth * 2 + gapPx;
      const itemHeight = itemWidth * aspectRatio;
      const x = bestStart * (colWidth + gapPx);
      const y = bestMaxHeight;

      positions.push({ image, x, y, width: itemWidth, height: itemHeight });

      const newHeight = y + itemHeight + gapPx;
      columnHeights[bestStart] = newHeight;
      columnHeights[bestStart + 1] = newHeight;
    } else {
      // Place in shortest column
      const shortestIdx = columnHeights.indexOf(Math.min(...columnHeights));
      const itemWidth = colWidth;
      const itemHeight = itemWidth * aspectRatio;
      const x = shortestIdx * (colWidth + gapPx);
      const y = columnHeights[shortestIdx];

      positions.push({ image, x, y, width: itemWidth, height: itemHeight });

      columnHeights[shortestIdx] = y + itemHeight + gapPx;
    }
  }

  // Remove trailing gap from container height
  const containerHeight = Math.max(...columnHeights) - (positions.length > 0 ? gapPx : 0);
  return { positions, containerHeight: Math.max(0, containerHeight) };
}

export function MasonryLayout({
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
}: MasonryLayoutProps) {
  const gapStr = typeof layout.gap === 'number' ? `${layout.gap}px` : layout.gap || '16px';
  const gapPx = parseFloat(gapStr) || 16;
  const { ref: widthRef, width: containerWidth } = useContainerWidth();
  const columnCount = getMasonryColumnCount(containerWidth, layout.columns);
  const containerRef = useRef<HTMLDivElement>(null);

  const setRefs = (node: HTMLDivElement | null) => {
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    (widthRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  if (images.length === 0) {
    return <div ref={setRefs} className={`${styles.masonry} gallery-masonry`} />;
  }

  const spanningItems = useMemo(
    () => getSpanningItems(images, columnCount),
    [images, columnCount]
  );

  const { positions, containerHeight } = useMemo(
    () => computeMasonryPositions(images, columnCount, containerWidth, gapPx, spanningItems),
    [images, columnCount, containerWidth, gapPx, spanningItems]
  );

  // Virtualization: estimate rows for scroll-based visibility
  const estimatedRows = Math.ceil(images.length / columnCount);
  const enabled = virtualize === true || typeof virtualize === 'number';
  const { virtualItems, isVirtualized } = useVirtualization({
    totalCount: estimatedRows,
    estimatedItemHeight: 280,
    containerRef,
    enabled,
  });

  // Compute visible Y range for virtualization
  const visibleTop = isVirtualized && virtualItems.length > 0
    ? virtualItems[0].index * 280
    : 0;
  const visibleBottom = isVirtualized && virtualItems.length > 0
    ? (virtualItems[virtualItems.length - 1].index + 1) * 280
    : containerHeight;

  return (
    <div
      ref={setRefs}
      className={`${styles.masonry} gallery-masonry`}
      style={{ position: 'relative', height: containerHeight }}
    >
      {positions.map((pos, index) => {
        // Virtualization: skip items outside visible range
        if (isVirtualized && (pos.y + pos.height < visibleTop || pos.y > visibleBottom)) {
          return (
            <div
              key={pos.image.id}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: pos.width,
                height: pos.height,
              }}
              aria-hidden="true"
            />
          );
        }

        return (
          <div
            key={pos.image.id}
            className={styles.item}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: pos.width,
              height: pos.height,
            }}
          >
            <GalleryImage
              image={pos.image}
              index={index}
              onClick={onImageClick}
              loading={loading}
              onImageLoad={onImageLoad}
              isSelecting={isSelecting}
              isSelected={selected?.has(pos.image.id)}
              onToggleSelect={onToggleSelect}
              onLongPress={onLongPress}
            />
          </div>
        );
      })}
    </div>
  );
}
