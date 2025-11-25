/**
 * Image validation and URL utilities
 */

// List of supported image formats
const SUPPORTED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

/**
 * Validate if URL appears to be an image URL
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Check if it's a valid URL
    if (!parsedUrl.protocol.startsWith('http')) {
      return false;
    }
    
    // Check file extension
    const pathname = parsedUrl.pathname.toLowerCase();
    const hasImageExtension = SUPPORTED_IMAGE_FORMATS.some(format => 
      pathname.endsWith(`.${format}`)
    );
    
    // Allow URLs without extensions if they're from known image services
    const isImageService = 
      pathname.includes('/api/files/') || // PocketBase files
      parsedUrl.hostname.includes('amazonaws.com') || // AWS S3
      parsedUrl.hostname.includes('cloudfront.net') || // CloudFront
      parsedUrl.hostname.includes('imgur.com') ||
      parsedUrl.hostname.includes('unsplash.com') ||
      parsedUrl.hostname.includes('pexels.com');
    
    return hasImageExtension || isImageService;
  } catch {
    return false;
  }
}

/**
 * Get proxied image URL to bypass CORS issues
 */
export function getProxiedImageUrl(originalUrl: string): string {
  // Don't proxy local URLs or data URLs
  if (originalUrl.startsWith('/') || originalUrl.startsWith('data:')) {
    return originalUrl;
  }
  
  // Don't proxy URLs that are already from our domain
  try {
    const url = new URL(originalUrl);
    if (url.hostname === window.location.hostname) {
      return originalUrl;
    }
  } catch {
    return originalUrl;
  }
  
  // Return proxied URL
  return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
}

/**
 * Test if an image URL is accessible
 */
export async function testImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => {
      resolve(false);
    }, 5000); // 5 second timeout
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    
    img.src = url;
  });
}

/**
 * Get image dimensions without loading the full image
 */
export async function getImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => {
      resolve(null);
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
    
    img.src = url;
  });
}

/**
 * Generate fallback image URL (placeholder)
 */
export function getFallbackImageUrl(campaignName: string = 'Campaign'): string {
  const encodedName = encodeURIComponent(campaignName);
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#grad)"/>
      <circle cx="200" cy="120" r="40" fill="white" opacity="0.2"/>
      <text x="200" y="180" font-family="Arial, sans-serif" font-size="14" fill="white" text-anchor="middle" opacity="0.8">${encodedName}</text>
      <text x="200" y="200" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle" opacity="0.6">Creative Project</text>
    </svg>
  `)}`;
}
