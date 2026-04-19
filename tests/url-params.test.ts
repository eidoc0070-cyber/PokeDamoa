import { describe, it, expect, afterEach } from 'bun:test'; // vitest -> bun:test
import { getTabFromPath, restoreStateFromUrl } from '../src/state/url-params';

// Helper for mocking location
const mockLocation = (pathname: string) => {
    // @ts-ignore
    window.happyDOM.setURL(`http://localhost${pathname}`);
};

describe('url-params utility', () => {
  const originalUrl = window.location.href;

  afterEach(() => {
    // @ts-ignore
    window.happyDOM.setURL(originalUrl);
  });

  describe('getTabFromPath', () => {
    it('should return the main tab name from the path', () => {
      mockLocation('/calculator');
      expect(getTabFromPath().mainTab).toBe('calculator');
    });

    it('should return the sub tab name if present', () => {
      mockLocation('/pokedex/move');
      const info = getTabFromPath();
      expect(info.mainTab).toBe('pokedex');
      expect(info.subTab).toBe('move');
    });

    it('should return default "settings" for root path', () => {
      mockLocation('/');
      expect(getTabFromPath().mainTab).toBe('settings');
    });
  });

  describe('restoreStateFromUrl', () => {
    it('should correctly parse tab and params from a URL string', () => {
      const url = 'http://localhost/calculator/damage?atkPoke=445&move=earthquake';
      const result = restoreStateFromUrl(url);
      
      expect(result).not.toBeNull();
      expect(result?.mainTab).toBe('calculator');
      expect(result?.subTab).toBe('damage');
      expect(result?.params).toEqual({
        atkPoke: '445',
        move: 'earthquake'
      });
    });

    it('should handle root path in URL string', () => {
      const url = 'http://localhost/';
      const result = restoreStateFromUrl(url);
      expect(result?.mainTab).toBe('settings');
    });

    it('should return null for invalid URL', () => {
      const result = restoreStateFromUrl('not-a-url');
      expect(result).toBeNull();
    });
  });
});
