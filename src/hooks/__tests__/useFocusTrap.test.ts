import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFocusTrap } from '../useFocusTrap';

function createContainer() {
  const container = document.createElement('div');
  container.innerHTML = `
    <button data-testid="first">First</button>
    <button data-testid="second">Second</button>
    <button data-testid="last">Last</button>
  `;
  document.body.appendChild(container);
  return container;
}

describe('useFocusTrap', () => {
  it('focuses first focusable element on activation', () => {
    const container = createContainer();

    const { result } = renderHook(() => useFocusTrap(false));

    // Assign the container to the ref
    Object.defineProperty(result.current, 'current', {
      value: container,
      writable: true,
    });

    const { rerender } = renderHook(
      ({ active }) => {
        const ref = useFocusTrap(active);
        Object.defineProperty(ref, 'current', {
          value: container,
          writable: true,
        });
        return ref;
      },
      { initialProps: { active: true } },
    );

    expect(document.activeElement).toBe(container.querySelector('[data-testid="first"]'));

    rerender({ active: false });
    container.remove();
  });

  it('wraps focus from last to first on Tab', () => {
    const container = createContainer();
    const last = container.querySelector<HTMLElement>('[data-testid="last"]')!;
    last.focus();

    renderHook(() => {
      const ref = useFocusTrap(true);
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      });
      return ref;
    });

    // Simulate Tab on last element
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(document.activeElement).toBe(container.querySelector('[data-testid="first"]'));

    container.remove();
  });

  it('wraps focus from first to last on Shift+Tab', () => {
    const container = createContainer();
    const first = container.querySelector<HTMLElement>('[data-testid="first"]')!;
    first.focus();

    renderHook(() => {
      const ref = useFocusTrap(true);
      Object.defineProperty(ref, 'current', {
        value: container,
        writable: true,
      });
      return ref;
    });

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(document.activeElement).toBe(container.querySelector('[data-testid="last"]'));

    container.remove();
  });

  it('restores focus on deactivation', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const container = createContainer();

    const { rerender } = renderHook(
      ({ active }) => {
        const ref = useFocusTrap(active);
        Object.defineProperty(ref, 'current', {
          value: container,
          writable: true,
        });
        return ref;
      },
      { initialProps: { active: true } },
    );

    // First focusable should have focus
    expect(document.activeElement).toBe(container.querySelector('[data-testid="first"]'));

    // Deactivate
    rerender({ active: false });

    expect(document.activeElement).toBe(trigger);

    container.remove();
    trigger.remove();
  });
});
