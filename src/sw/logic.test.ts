/**
 * Tests für Service Worker Logic (Pure Functions)
 */

import { describe, it, expect } from 'vitest';
import { 
  isSameOrigin, 
  isNavigation, 
  isStaticAsset, 
  isSafeScheme,
  generateCacheNames,
  isOldCache
} from './logic';

describe('Service Worker Logic', () => {
  describe('isSameOrigin', () => {
    it('should detect same origin correctly', () => {
      const origin = 'https://example.com';
      
      expect(isSameOrigin('https://example.com/path', origin)).toBe(true);
      expect(isSameOrigin('https://example.com:443/path', origin)).toBe(true);
      expect(isSameOrigin('https://other.com/path', origin)).toBe(false);
      expect(isSameOrigin('http://example.com/path', origin)).toBe(false);
    });

    it('should handle localhost correctly', () => {
      const origin = 'http://localhost:3000';
      
      expect(isSameOrigin('http://localhost:3000/api', origin)).toBe(true);
      expect(isSameOrigin('http://localhost:3001/api', origin)).toBe(false);
      expect(isSameOrigin('https://localhost:3000/api', origin)).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      expect(isSameOrigin('invalid-url', 'https://example.com')).toBe(false);
      expect(isSameOrigin('', 'https://example.com')).toBe(false);
    });
  });

  describe('isNavigation', () => {
    it('should detect navigation requests', () => {
      const navRequest = { mode: 'navigate' } as Request;
      const fetchRequest = { mode: 'cors' } as Request;
      const noModeRequest = {} as Request;
      
      expect(isNavigation(navRequest)).toBe(true);
      expect(isNavigation(fetchRequest)).toBe(false);
      expect(isNavigation(noModeRequest)).toBe(false);
    });
  });

  describe('isStaticAsset', () => {
    it('should detect static asset destinations', () => {
      const styleRequest = { destination: 'style' } as Request;
      const scriptRequest = { destination: 'script' } as Request;
      const fontRequest = { destination: 'font' } as Request;
      const imageRequest = { destination: 'image' } as Request;
      const documentRequest = { destination: 'document' } as Request;
      const fetchRequest = { destination: '' } as Request;
      
      expect(isStaticAsset(styleRequest)).toBe(true);
      expect(isStaticAsset(scriptRequest)).toBe(true);
      expect(isStaticAsset(fontRequest)).toBe(true);
      expect(isStaticAsset(imageRequest)).toBe(true);
      expect(isStaticAsset(documentRequest)).toBe(false);
      expect(isStaticAsset(fetchRequest)).toBe(false);
    });
  });

  describe('isSafeScheme', () => {
    it('should detect safe schemes', () => {
      expect(isSafeScheme('blob://something')).toBe(true);
      expect(isSafeScheme('data:text/plain;base64,SGVsbG8=')).toBe(true);
      expect(isSafeScheme('https://example.com')).toBe(false);
      expect(isSafeScheme('http://localhost')).toBe(false);
    });
  });

  describe('generateCacheNames', () => {
    it('should generate versioned cache names', () => {
      const names = generateCacheNames('v1.0');
      
      expect(names.static).toBe('ct-static-v1.0');
      expect(names.pages).toBe('ct-pages-v1.0');
    });

    it('should generate different names for different versions', () => {
      const v1 = generateCacheNames('v1.0');
      const v2 = generateCacheNames('v1.1');
      
      expect(v1.static).not.toBe(v2.static);
      expect(v1.pages).not.toBe(v2.pages);
    });
  });

  describe('isOldCache', () => {
    it('should identify old caches correctly', () => {
      const currentCaches = ['ct-static-v1.0', 'ct-pages-v1.0'];
      
      expect(isOldCache('ct-static-v0.9', currentCaches)).toBe(true);
      expect(isOldCache('ct-static-v1.0', currentCaches)).toBe(false);
      expect(isOldCache('other-cache', currentCaches)).toBe(true);
    });
  });
});