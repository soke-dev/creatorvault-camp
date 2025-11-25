// Image handling utilities for campaign images including PocketBase file URLs
import { devLog } from '@/utils/debugLog';

export const getProxiedImageUrl = (originalUrl: string): string => {
  if (!originalUrl) return '';
  
  // Don't proxy PocketBase URLs - they're already handled properly
  if (originalUrl.includes('pockethost.io') || originalUrl.includes('/api/files/')) {
    return originalUrl;
  }
  
  // Don't proxy relative URLs
  if (originalUrl.startsWith('/')) {
    return originalUrl;
  }
  
  // Proxy external URLs to avoid CORS and expiration issues
  return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
};

export const isPocketBaseFileUrl = (url: string): boolean => {
  return url.includes('pockethost.io') && url.includes('/api/files/');
};

export const isExpiredS3Url = (url: string): boolean => {
  if (!url.includes('amazonaws.com')) return false;
  
  try {
    const urlObj = new URL(url);
    const expires = urlObj.searchParams.get('X-Amz-Expires') || urlObj.searchParams.get('Expires');
    
    if (expires) {
      const expirationTime = parseInt(expires) * 1000; // Convert to milliseconds
      return Date.now() > expirationTime;
    }
  } catch (error) {
    console.warn('Error parsing S3 URL for expiration check:', error);
  }
  
  return false; // Assume not expired if we can't determine
};

export const getOptimalImageUrl = (imageUrl: string | null, fileUrl: string | null): string | null => {
  // Priority 1: Use PocketBase file URL (never expires, no CORS issues)
  if (fileUrl && isPocketBaseFileUrl(fileUrl)) {
    devLog('[ImageHandler] Using PocketBase file URL:', fileUrl);
    return fileUrl;
  }
  
  // Priority 2: Use external URL with proxy if needed
  if (imageUrl) {
    if (imageUrl.includes('amazonaws.com')) {
      devLog('[ImageHandler] S3 URL detected, using proxy:', imageUrl);
      return getProxiedImageUrl(imageUrl);
    }
    return imageUrl;
  }
  
  return null;
};

export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackUrl?: string
) => {
  const target = event.target as HTMLImageElement;
  target.src = fallbackUrl || '/logo.png';
};

export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};