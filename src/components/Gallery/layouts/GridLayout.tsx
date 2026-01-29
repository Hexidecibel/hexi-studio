import type { ImageItem, LayoutOptions } from '../../../types';
import { GalleryImage } from '../GalleryImage';
import styles from './GridLayout.module.css';

export interface GridLayoutProps {
  images: ImageItem[];
  layout: LayoutOptions;
  onImageClick?: (image: ImageItem, index: number) => void;
  loading?: 'lazy' | 'eager';
}

export function GridLayout({
  images,
  layout,
  onImageClick,
  loading,
}: GridLayoutProps) {
  const gap = typeof layout.gap === 'number' ? `${layout.gap}px` : layout.gap || '16px';
  const columns = layout.columns === 'auto' ? undefined : layout.columns;

  const style: React.CSSProperties = {
    gap,
    ...(columns && { gridTemplateColumns: `repeat(${columns}, 1fr)` }),
  };

  return (
    <div className={`${styles.grid} gallery-grid`} style={style}>
      {images.map((image, index) => (
        <GalleryImage
          key={image.id}
          image={image}
          index={index}
          onClick={onImageClick}
          loading={loading}
        />
      ))}
    </div>
  );
}
