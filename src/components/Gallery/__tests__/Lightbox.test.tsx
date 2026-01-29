import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Lightbox } from '../Lightbox';
import type { ImageItem } from '../../../types';

const images: ImageItem[] = [
  { id: '1', src: '/img1.jpg', alt: 'Image 1', title: 'First Image', description: 'A beautiful scene' },
  { id: '2', src: '/img2.jpg', alt: 'Image 2', title: 'Second Image' },
  { id: '3', src: '/img3.jpg', alt: 'Image 3' },
];

const defaultProps = {
  images,
  currentIndex: 0,
  isOpen: true,
  hasNext: true,
  hasPrev: false,
  totalCount: 3,
  onClose: vi.fn(),
  onNext: vi.fn(),
  onPrev: vi.fn(),
};

describe('Lightbox', () => {
  it('does not render when closed', () => {
    render(<Lightbox {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders as a portal on document.body', () => {
    const { container } = render(
      <div data-testid="parent">
        <Lightbox {...defaultProps} />
      </div>,
    );

    // Dialog should NOT be inside the parent container
    const dialog = screen.getByRole('dialog');
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(dialog.parentElement).toBe(document.body);
  });

  it('displays the current image', () => {
    render(<Lightbox {...defaultProps} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/img1.jpg');
    expect(img).toHaveAttribute('alt', 'Image 1');
  });

  it('shows counter text', () => {
    render(<Lightbox {...defaultProps} currentIndex={1} />);

    expect(screen.getByText('2 of 3')).toBeInTheDocument();
  });

  it('displays image title and description', () => {
    render(<Lightbox {...defaultProps} />);

    expect(screen.getByText('First Image')).toBeInTheDocument();
    expect(screen.getByText('A beautiful scene')).toBeInTheDocument();
  });

  it('hides title/description when not provided', () => {
    render(<Lightbox {...defaultProps} currentIndex={2} hasPrev={true} hasNext={false} />);

    expect(screen.queryByText('First Image')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Lightbox {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Close lightbox'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<Lightbox {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close when image area is clicked', () => {
    const onClose = vi.fn();
    render(<Lightbox {...defaultProps} onClose={onClose} />);

    const img = screen.getByRole('img');
    fireEvent.click(img.closest('div')!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onNext when next button is clicked', () => {
    const onNext = vi.fn();
    render(<Lightbox {...defaultProps} onNext={onNext} />);

    fireEvent.click(screen.getByLabelText('Next image'));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('calls onPrev when prev button is clicked', () => {
    const onPrev = vi.fn();
    render(<Lightbox {...defaultProps} hasPrev={true} onPrev={onPrev} />);

    fireEvent.click(screen.getByLabelText('Previous image'));
    expect(onPrev).toHaveBeenCalledOnce();
  });

  it('hides prev button at first image', () => {
    render(<Lightbox {...defaultProps} hasPrev={false} />);

    expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();
  });

  it('hides next button at last image', () => {
    render(<Lightbox {...defaultProps} hasNext={false} />);

    expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    render(<Lightbox {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Image lightbox');
  });

  it('has aria-live on counter for screen reader updates', () => {
    render(<Lightbox {...defaultProps} />);

    const counter = screen.getByText('1 of 3');
    expect(counter).toHaveAttribute('aria-live', 'polite');
  });

  it('updates displayed image when currentIndex changes', () => {
    const { rerender } = render(<Lightbox {...defaultProps} currentIndex={0} />);

    expect(screen.getByRole('img')).toHaveAttribute('src', '/img1.jpg');

    rerender(<Lightbox {...defaultProps} currentIndex={1} />);

    expect(screen.getByRole('img')).toHaveAttribute('src', '/img2.jpg');
  });
});
