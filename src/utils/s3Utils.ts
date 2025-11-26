/**
 * Utility functions for handling AWS S3 URLs and expired tokens
 */

import { devLog } from '@/utils/debugLog';

export function isS3UrlExpired(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Check if it's an S3 URL with expiration
    if (urlObj.hostname.includes('s3.') || urlObj.hostname.includes('amazonaws.com')) {
      const expiresParam = urlObj.searchParams.get('X-Amz-Expires');
      const dateParam = urlObj.searchParams.get('X-Amz-Date');
      
      if (expiresParam && dateParam) {
        // Parse the date in format YYYYMMDDTHHMMSSZ
        const year = parseInt(dateParam.substring(0, 4));
        const month = parseInt(dateParam.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(dateParam.substring(6, 8));
        const hour = parseInt(dateParam.substring(9, 11));
        const minute = parseInt(dateParam.substring(11, 13));
        const second = parseInt(dateParam.substring(13, 15));
        
        const signedDate = new Date(year, month, day, hour, minute, second);
        const expirationTime = signedDate.getTime() + (parseInt(expiresParam) * 1000);
        
        return Date.now() > expirationTime;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking S3 URL expiration:', error);
    return true; // Assume expired if we can't parse it
  }
}

export function shouldRetryImageLoad(url: string, error: any): boolean {
  // Don't retry if it's an expired S3 URL
  if (isS3UrlExpired(url)) {
    devLog('S3 URL is expired, not retrying:', url);
    return false;
  }
  
  // Don't retry if it's a 403 (likely expired token)
  if (error?.status === 403) {
    devLog('403 error likely means expired token, not retrying');
    return false;
  }
  
  // Retry for other errors
  return true;
}

export function getImageFallback(campaignAddress: string): string {
  // Return a default image or generate a placeholder
  return `/logo.png`; // Use your default logo
}

export function logImageError(url: string, error: any) {
  if (isS3UrlExpired(url)) {
    console.warn(`[ImageUtils] S3 URL expired: ${url.substring(0, 100)}...`);
  } else {
    console.error(`[ImageUtils] Image load failed:`, error);
  }
}
