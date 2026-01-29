import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GalleryImage } from '../GalleryImage';
import type { ImageItem } from '../../../types';

const mockImage: ImageItem = {
  id: '1',
  src: 'https://example.com/image.jpg',
  alt: 'Test image',
};

const mockImageWithMetadata: ImageItem = {
  id: '2',
  src: 'https://example.com/image2.jpg',
  alt: 'Image with metadata',
  width: 1920,
  height: 1080,
  thumbnail: 'https://example.com/thumb.jpg',
  blurDataUrl: 'data:image/jpeg;base64,/9j/4AAQ...',
  title: 'Beautiful Sunset',
};

describe('GalleryImage', () => {
  it('renders an image with correct src and alt', () => {
    render(<GalleryImage image={mockImage} index={0} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'Test image');
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('uses thumbnail when available', () => {
    render(<GalleryImage image={mockImageWithMetadata} index={0} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
  });

  it('applies lazy loading by default', () => {
    render(<GalleryImage image={mockImage} index={0} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('applies eager loading when specified', () => {
    render(<GalleryImage image={mockImage} index={0} loading="eager" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<GalleryImage image={mockImage} index={0} onClick={handleClick} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledWith(mockImage, 0);
  });

  it('renders as div without onClick', () => {
    render(<GalleryImage image={mockImage} index={0} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows blur placeholder when blurDataUrl is provided', () => {
    render(<GalleryImage image={mockImageWithMetadata} index={0} />);

    const container = screen.getByRole('img').parentElement;
    expect(container).toHaveStyle({ backgroundImage: expect.stringContaining('data:image') });
  });

  it('applies custom className', () => {
    render(<GalleryImage image={mockImage} index={0} className="custom-class" />);

    const wrapper = screen.getByRole('img').closest('.gallery-image');
    expect(wrapper).toHaveClass('custom-class');
  });

  it('has correct aspect ratio style when dimensions provided', () => {
    render(<GalleryImage image={mockImageWithMetadata} index={0} />);

    const wrapper = screen.getByRole('img').closest('.gallery-image');
    expect(wrapper).toHaveStyle({ aspectRatio: '1920 / 1080' });
  });
});
