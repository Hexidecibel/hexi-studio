import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GalleryImage } from '../GalleryImage';
import type { ImageItem } from '../../../types';

// jsdom does not have IntersectionObserver, so the hook falls back to
// isIntersecting=true, meaning <img> always mounts in tests.

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

  it('renders image via IO fallback with default lazy loading', () => {
    render(<GalleryImage image={mockImage} index={0} />);

    // Image renders because IO is unavailable in jsdom (fallback to visible)
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
  });

  it('renders image immediately when loading is eager', () => {
    render(<GalleryImage image={mockImage} index={0} loading="eager" />);

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
  });

  it('does not render image before intersection when IO is available', () => {
    // Provide a mock IO that never fires
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );

    render(<GalleryImage image={mockImage} index={0} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    vi.unstubAllGlobals();
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

  it('renders srcSet when provided', () => {
    const imageWithSrcSet: ImageItem = {
      ...mockImage,
      srcSet: 'image-400.jpg 400w, image-800.jpg 800w',
    };
    render(<GalleryImage image={imageWithSrcSet} index={0} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('srcset', 'image-400.jpg 400w, image-800.jpg 800w');
  });

  it('omits srcSet when not provided', () => {
    render(<GalleryImage image={mockImage} index={0} />);

    const img = screen.getByRole('img');
    expect(img).not.toHaveAttribute('srcset');
  });

  it('includes sizes attribute when srcSet is present', () => {
    const imageWithSrcSet: ImageItem = {
      ...mockImage,
      srcSet: 'image-400.jpg 400w, image-800.jpg 800w',
    };
    render(<GalleryImage image={imageWithSrcSet} index={0} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('sizes');
  });
});
