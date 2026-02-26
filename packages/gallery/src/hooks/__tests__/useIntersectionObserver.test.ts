import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIntersectionObserver } from '../useIntersectionObserver';
import { useRef } from 'react';

let observerCallback: IntersectionObserverCallback;
let observerOptions: IntersectionObserverInit | undefined;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  mockObserve.mockClear();
  mockDisconnect.mockClear();

  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
        observerCallback = cb;
        observerOptions = opts;
      }
      observe = mockObserve;
      disconnect = mockDisconnect;
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Helper that creates a real DOM node and assigns it to the IO hook's ref
 * before the effect runs, simulating what React does when attaching a ref to a DOM element.
 */
function useIOWithElement(opts?: Parameters<typeof useIntersectionObserver>[0]) {
  const io = useIntersectionObserver(opts);
  const initialized = useRef(false);

  // Assign a DOM node to the ref on first render (before the effect)
  if (!initialized.current) {
    const div = document.createElement('div');
    (io.ref as React.MutableRefObject<HTMLElement | null>).current = div;
    initialized.current = true;
  }

  return io;
}

describe('useIntersectionObserver', () => {
  it('starts with isIntersecting false', () => {
    const { result } = renderHook(() => useIntersectionObserver());

    expect(result.current.isIntersecting).toBe(false);
  });

  it('sets isIntersecting true on intersection', () => {
    const { result } = renderHook(() => useIOWithElement());

    expect(mockObserve).toHaveBeenCalled();

    act(() => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(result.current.isIntersecting).toBe(true);
  });

  it('disconnects after intersection with triggerOnce (default)', () => {
    renderHook(() => useIOWithElement());

    act(() => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('does not disconnect on intersection without triggerOnce', () => {
    renderHook(() => useIOWithElement({ triggerOnce: false }));

    mockDisconnect.mockClear();

    act(() => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it('falls back to true when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    const { result } = renderHook(() => useIntersectionObserver());

    expect(result.current.isIntersecting).toBe(true);
  });

  it('forwards config to IntersectionObserver', () => {
    renderHook(() =>
      useIOWithElement({ rootMargin: '100px', threshold: 0.5 }),
    );

    expect(observerOptions).toEqual(
      expect.objectContaining({ rootMargin: '100px', threshold: 0.5 }),
    );
  });
});
