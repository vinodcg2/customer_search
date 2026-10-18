import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedValue } from './useDebouncedValue';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(initialValue: string, delayMs = 300) {
  return renderHook(({ value }: { value: string }) => useDebouncedValue(value, delayMs), {
    initialProps: { value: initialValue },
  });
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', () => {
    const { result } = setup('a');

    expect(result.current).toBe('a');
  });

  it('updates only once the delay has fully elapsed', () => {
    const { result, rerender } = setup('a');

    rerender({ value: 'ab' });
    advance(299);
    expect(result.current).toBe('a');

    advance(1);
    expect(result.current).toBe('ab');
  });

  it('restarts the delay on every change so only the last value is emitted', () => {
    const { result, rerender } = setup('a');

    rerender({ value: 'ab' });
    advance(200);
    rerender({ value: 'abc' });
    advance(200);
    expect(result.current).toBe('a');

    advance(100);
    expect(result.current).toBe('abc');
  });

  it('never emits intermediate values', () => {
    const seen: string[] = [];
    const { result, rerender } = setup('');

    for (const value of ['a', 'an', 'ann']) {
      rerender({ value });
      advance(100);
      seen.push(result.current);
    }
    advance(300);

    expect(seen).toEqual(['', '', '']);
    expect(result.current).toBe('ann');
  });

  it('cancels the pending update on unmount', () => {
    const { rerender, unmount } = setup('a');
    rerender({ value: 'ab' });
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
