// Simple image optimization utility
export class ImageOptimizer {
  static cacheImageUrl(cacheKey: string, imageUrl: string) {
    try {
      localStorage.setItem(`image_cache_${cacheKey}`, imageUrl);
    } catch (error) {
      console.warn('Failed to cache image URL:', error);
    }
  }

  static preloadImage(imageUrl: string) {
    try {
      const img = new Image();
      img.src = imageUrl;
    } catch (error) {
      console.warn('Failed to preload image:', error);
    }
  }

  static getCachedImageUrl(cacheKey: string): string | null {
    try {
      return localStorage.getItem(`image_cache_${cacheKey}`);
    } catch (error) {
      console.warn('Failed to get cached image URL:', error);
      return null;
    }
  }
}