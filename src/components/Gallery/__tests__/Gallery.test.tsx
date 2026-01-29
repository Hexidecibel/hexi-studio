import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Gallery } from '../Gallery';
import type { ImageItem } from '../../../types';

const mockImages: ImageItem[] = [
  { id: '1', src: 'https://example.com/1.jpg', alt: 'Image 1' },
  { id: '2', src: 'https://example.com/2.jpg', alt: 'Image 2' },
  { id: '3', src: 'https://example.com/3.jpg', alt: 'Image 3' },
];

describe('Gallery', () => {
  it('renders all images', () => {
    render(<Gallery images={mockImages} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
  });

  it('renders empty state when no images', () => {
    render(<Gallery images={[]} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Gallery images={mockImages} className="my-gallery" />);

    expect(container.firstChild).toHaveClass('my-gallery');
  });

  it('uses grid layout by default', () => {
    const { container } = render(<Gallery images={mockImages} />);

    expect(container.querySelector('.gallery-grid')).toBeInTheDocument();
  });

  it('uses masonry layout when specified', () => {
    const { container } = render(
      <Gallery images={mockImages} layout={{ type: 'masonry' }} />
    );

    expect(container.querySelector('.gallery-masonry')).toBeInTheDocument();
  });

  it('uses justified layout when specified', () => {
    const { container } = render(
      <Gallery images={mockImages} layout={{ type: 'justified' }} />
    );

    expect(container.querySelector('.gallery-justified')).toBeInTheDocument();
  });

  it('passes onImageClick to images', () => {
    const handleClick = vi.fn();
    render(<Gallery images={mockImages} onImageClick={handleClick} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('applies custom gap', () => {
    const { container } = render(
      <Gallery images={mockImages} layout={{ type: 'grid', gap: 24 }} />
    );

    const grid = container.querySelector('.gallery-grid');
    expect(grid).toHaveStyle({ gap: '24px' });
  });

  it('applies string gap value', () => {
    const { container } = render(
      <Gallery images={mockImages} layout={{ type: 'grid', gap: '2rem' }} />
    );

    const grid = container.querySelector('.gallery-grid');
    expect(grid).toHaveStyle({ gap: '2rem' });
  });
});
