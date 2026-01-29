import type { GalleryProps } from '../../types';
import { DEFAULT_LAYOUT } from '../../types';
import { GridLayout } from './layouts/GridLayout';
import { MasonryLayout } from './layouts/MasonryLayout';
import { JustifiedLayout } from './layouts/JustifiedLayout';
import styles from './Gallery.module.css';

export function Gallery({
  images,
  layout,
  className,
  onImageClick,
  loading,
}: GalleryProps) {
  const resolvedLayout = { ...DEFAULT_LAYOUT, ...layout };

  const containerClassName = [styles.gallery, className].filter(Boolean).join(' ');

  const layoutProps = {
    images,
    layout: resolvedLayout,
    onImageClick,
    loading,
  };

  return (
    <div className={containerClassName}>
      {resolvedLayout.type === 'masonry' ? (
        <MasonryLayout {...layoutProps} />
      ) : resolvedLayout.type === 'justified' ? (
        <JustifiedLayout {...layoutProps} />
      ) : (
        <GridLayout {...layoutProps} />
      )}
    </div>
  );
}
