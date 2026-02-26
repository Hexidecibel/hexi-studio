import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useConfigurator } from '../useConfigurator';

describe('useConfigurator', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useConfigurator());
    expect(result.current.state.layout.type).toBe('grid');
    expect(result.current.state.images).toEqual([]);
  });

  it('should update layout type', () => {
    const { result } = renderHook(() => useConfigurator());

    act(() => {
      result.current.setLayoutType('masonry');
    });

    expect(result.current.state.layout.type).toBe('masonry');
  });

  it('should update layout options', () => {
    const { result } = renderHook(() => useConfigurator());

    act(() => {
      result.current.setLayout({ gap: 24 });
    });

    expect(result.current.state.layout.gap).toBe(24);
  });

  it('should set images', () => {
    const { result } = renderHook(() => useConfigurator());
    const images = [{ id: '1', src: 'test.jpg', alt: 'Test' }];

    act(() => {
      result.current.setImages(images);
    });

    expect(result.current.state.images).toEqual(images);
  });

  it('should reset to defaults', () => {
    const { result } = renderHook(() => useConfigurator());

    act(() => {
      result.current.setLayoutType('masonry');
      result.current.setLayout({ gap: 32 });
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.layout.type).toBe('grid');
    expect(result.current.state.layout.gap).toBe(16);
  });

  it('should generate export code', () => {
    const { result } = renderHook(() => useConfigurator());
    expect(result.current.exportCode).toContain('<Gallery');
    expect(result.current.exportCode).toContain('enableLightbox');
  });
});
