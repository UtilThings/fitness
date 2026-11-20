import { effectScope } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from '@/composables/useMediaQuery';

function mockMatchMedia(initial: boolean) {
  let listener: ((e: MediaQueryListEvent) => void) | undefined;
  const removeEventListener = vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({
    matches: initial,
    addEventListener: (_: string, cb: typeof listener) => (listener = cb),
    removeEventListener,
  });
  return {
    emit: (matches: boolean) => listener?.({ matches } as MediaQueryListEvent),
    removeEventListener,
  };
}

describe('useMediaQuery', () => {
  afterEach(() => vi.restoreAllMocks());

  it('refleja el valor inicial y los cambios', () => {
    const mql = mockMatchMedia(false);
    const scope = effectScope();
    const matches = scope.run(() => useMediaQuery('(max-width: 767px)'))!;
    expect(matches.value).toBe(false);
    mql.emit(true);
    expect(matches.value).toBe(true);
    scope.stop();
  });

  it('retira el listener al destruir el scope', () => {
    const mql = mockMatchMedia(false);
    const scope = effectScope();
    scope.run(() => useMediaQuery('(max-width: 767px)'));
    scope.stop();
    expect(mql.removeEventListener).toHaveBeenCalled();
  });
});
