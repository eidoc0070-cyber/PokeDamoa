
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTabFromPath, restoreStateFromUrl } from '../src/state/url-params';

// Mock window/location for non-browser environments like bun test
if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
}

// Helper for mocking location
const mockLocation = (pathname: string) => {
  if (typeof vi !== 'undefined' && vi.stubGlobal) {
    vi.stubGlobal('location', { pathname });
  } else {
    // Fallback for non-vitest environments like bun test
    // @ts-ignore
    globalThis.location = { pathname } as any;
  }
};

describe('url-params utility', () => {
  const originalLocation = typeof globalThis !== 'undefined' ? globalThis.location : undefined;

  afterEach(() => {
    if (typeof vi !== 'undefined' && vi.unstubAllGlobals) {
        vi.unstubAllGlobals();
    } else if (originalLocation) {
        // @ts-ignore
        globalThis.location = originalLocation;
    }
  });

  describe('getTabFromPath', () => {
    it('should return the tab name from the path', () => {
      mockLocation('/calculator');
      expect(getTabFromPath()).toBe('calculator');
    });

    it('should return default "settings" for root path', () => {
      mockLocation('/');
      expect(getTabFromPath()).toBe('settings');
    });
  });

  describe('restoreStateFromUrl', () => {
    it('should correctly parse tab and params from a URL string', () => {
      const url = 'http://localhost/calculator?atkPoke=445&move=earthquake';
      const result = restoreStateFromUrl(url);
      
      expect(result).not.toBeNull();
      expect(result?.tab).toBe('calculator');
      expect(result?.params).toEqual({
        atkPoke: '445',
        move: 'earthquake'
      });
    });

    it('should handle root path in URL string', () => {
      const url = 'http://localhost/';
      const result = restoreStateFromUrl(url);
      expect(result?.tab).toBe('settings');
    });

    it('should return null for invalid URL', () => {
      const result = restoreStateFromUrl('not-a-url');
      expect(result).toBeNull();
    });
  });
});
