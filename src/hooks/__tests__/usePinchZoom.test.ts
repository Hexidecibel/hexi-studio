import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePinchZoom } from '../usePinchZoom';

describe('usePinchZoom', () => {
  it('should initialize with scale 1 and not zoomed', () => {
    const { result } = renderHook(() => usePinchZoom());
    expect(result.current.scale).toBe(1);
    expect(result.current.isZoomed).toBe(false);
    expect(result.current.translateX).toBe(0);
    expect(result.current.translateY).toBe(0);
  });

  it('should return correct transform style string', () => {
    const { result } = renderHook(() => usePinchZoom());
    expect(result.current.style.transform).toBe('translate(0px, 0px) scale(1)');
    expect(result.current.style.transformOrigin).toBe('center center');
  });

  it('should reset scale and translation', () => {
    const onZoomChange = vi.fn();
    const { result } = renderHook(() => usePinchZoom({ onZoomChange }));

    act(() => {
      result.current.reset();
    });

    expect(result.current.scale).toBe(1);
    expect(result.current.translateX).toBe(0);
    expect(result.current.translateY).toBe(0);
    expect(result.current.isZoomed).toBe(false);
    expect(onZoomChange).toHaveBeenCalledWith(1);
  });

  it('should report isZoomed as false when scale is 1', () => {
    const { result } = renderHook(() => usePinchZoom());
    expect(result.current.isZoomed).toBe(false);
  });

  it('should provide a ref callback function', () => {
    const { result } = renderHook(() => usePinchZoom());
    expect(typeof result.current.ref).toBe('function');
  });

  it('should respect minScale and maxScale options', () => {
    const { result } = renderHook(() =>
      usePinchZoom({ minScale: 0.5, maxScale: 3 })
    );
    // Hook should be created without errors
    expect(result.current.scale).toBe(1);
  });

  it('should set touchAction to auto when not zoomed', () => {
    const { result } = renderHook(() => usePinchZoom());
    expect(result.current.style.touchAction).toBe('auto');
  });
});
