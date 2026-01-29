import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLightbox } from '../useLightbox';
import type { ImageItem } from '../../types';

const images: ImageItem[] = [
  { id: '1', src: '/1.jpg', alt: 'One' },
  { id: '2', src: '/2.jpg', alt: 'Two' },
  { id: '3', src: '/3.jpg', alt: 'Three' },
];

describe('useLightbox', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  it('starts closed', () => {
    const { result } = renderHook(() => useLightbox({ images }));
    expect(result.current.isOpen).toBe(false);
    expect(result.current.currentImage).toBeUndefined();
  });

  it('opens at the given index', () => {
    const { result } = renderHook(() => useLightbox({ images }));

    act(() => result.current.open(1));

    expect(result.current.isOpen).toBe(true);
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentImage).toBe(images[1]);
  });

  it('closes', () => {
    const { result } = renderHook(() => useLightbox({ images }));

    act(() => result.current.open(0));
    act(() => result.current.close());

    expect(result.current.isOpen).toBe(false);
  });

  it('navigates next', () => {
    const { result } = renderHook(() => useLightbox({ images }));

    act(() => result.current.open(0));
    act(() => result.current.next());

    expect(result.current.currentIndex).toBe(1);
  });

  it('navigates prev', () => {
    const { result } = renderHook(() => useLightbox({ images }));

    act(() => result.current.open(2));
    act(() => result.current.prev());

    expect(result.current.currentIndex).toBe(1);
  });

  it('does not go past last image', () => {
    const { result } = renderHook(() => useLightbox({ images }));

    act(() => result.current.open(2));
    act(() => result.current.next());

    expect(result.current.currentIndex).toBe(2);
    expect(result.current.hasNext).toBe(false);
  });

  it('does not go before first image', () => {
    const { result } = renderHook(() => useLightbox({ images }));

    act(() => result.current.open(0));
    act(() => result.current.prev());

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.hasPrev).toBe(false);
  });

  it('goTo navigates to a specific index', () => {
    const { result } = renderHook(() => useLightbox({ images }));

    act(() => result.current.open(0));
    act(() => result.current.goTo(2));

    expect(result.current.currentIndex).toBe(2);
  });

  it('reports totalCount', () => {
    const { result } = renderHook(() => useLightbox({ images }));
    expect(result.current.totalCount).toBe(3);
  });

  it('reports hasNext and hasPrev correctly', () => {
    const { result } = renderHook(() => useLightbox({ images }));

    act(() => result.current.open(1));

    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrev).toBe(true);
  });

  it('closes on Escape key', () => {
    const { result } = renderHook(() => useLightbox({ images }));

    act(() => result.current.open(0));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('navigates with arrow keys', () => {
    const { result } = renderHook(() => useLightbox({ images }));

    act(() => result.current.open(0));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });

    expect(result.current.currentIndex).toBe(1);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it('locks body scroll when open', () => {
    const { result } = renderHook(() => useLightbox({ images }));

    act(() => result.current.open(0));
    expect(document.body.style.overflow).toBe('hidden');

    act(() => result.current.close());
    expect(document.body.style.overflow).toBe('');
  });
});
