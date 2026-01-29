import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContainerWidth } from '../useContainerWidth';
import { useRef } from 'react';

let observerCallback: ResizeObserverCallback;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  mockObserve.mockClear();
  mockDisconnect.mockClear();

  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: ResizeObserverCallback) {
        observerCallback = cb;
      }
      observe = mockObserve;
      disconnect = mockDisconnect;
      unobserve = vi.fn();
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Helper that creates a real DOM node and assigns it to the hook's ref
 * before the effect runs, simulating what React does when attaching a ref.
 */
function useContainerWidthWithElement(opts?: Parameters<typeof useContainerWidth>[0]) {
  const hook = useContainerWidth(opts);
  const initialized = useRef(false);

  if (!initialized.current) {
    const div = document.createElement('div');
    (hook.ref as React.MutableRefObject<HTMLDivElement | null>).current = div;
    initialized.current = true;
  }

  return hook;
}

describe('useContainerWidth', () => {
  it('returns default width when ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined);

    const { result } = renderHook(() => useContainerWidth());

    expect(result.current.width).toBe(1200);
  });

  it('updates width when ResizeObserver fires', () => {
    const { result } = renderHook(() => useContainerWidthWithElement());

    expect(mockObserve).toHaveBeenCalled();

    act(() => {
      observerCallback(
        [
          {
            contentBoxSize: [{ inlineSize: 800, blockSize: 600 }],
            contentRect: { width: 800 },
          } as unknown as ResizeObserverEntry,
        ],
        {} as ResizeObserver,
      );
    });

    expect(result.current.width).toBe(800);
  });

  it('disconnects observer on unmount', () => {
    const { unmount } = renderHook(() => useContainerWidthWithElement());

    expect(mockObserve).toHaveBeenCalled();

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('accepts a custom default width', () => {
    vi.stubGlobal('ResizeObserver', undefined);

    const { result } = renderHook(() => useContainerWidth({ defaultWidth: 600 }));

    expect(result.current.width).toBe(600);
  });
});
