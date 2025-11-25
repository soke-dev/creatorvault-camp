export const getImageUrl = (url: string, fallbackUrl?: string): string => {
  if (!url) return fallbackUrl || '/logo.png';
  
  // Check if it's a relative URL and make it absolute
  if (url.startsWith('/')) {
    return url;
  }
  
  // For external URLs, add error handling
  try {
    new URL(url);
    return url;
  } catch {
    return fallbackUrl || '/logo.png';
  }
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
