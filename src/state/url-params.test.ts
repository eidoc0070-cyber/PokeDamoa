
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTabFromPath, restoreStateFromUrl } from './url-params';

describe('url-params utility', () => {
  describe('getTabFromPath', () => {
    it('should return the tab name from the path', () => {
      // Mock window.location
      vi.stubGlobal('location', { pathname: '/damage-calculator' });
      expect(getTabFromPath()).toBe('damage-calculator');
    });

    it('should return default "settings" for root path', () => {
      vi.stubGlobal('location', { pathname: '/' });
      expect(getTabFromPath()).toBe('settings');
    });
  });

  describe('restoreStateFromUrl', () => {
    it('should correctly parse tab and params from a URL string', () => {
      const url = 'http://localhost/damage-calculator?atkPoke=445&move=earthquake';
      const result = restoreStateFromUrl(url);
      
      expect(result).not.toBeNull();
      expect(result?.tab).toBe('damage-calculator');
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
