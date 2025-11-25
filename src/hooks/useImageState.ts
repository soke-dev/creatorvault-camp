import { useState, useEffect, useCallback } from 'react';
import { isValidImageUrl, getProxiedImageUrl, testImageUrl } from '../utils/imageValidation';

interface UseImageStateReturn {
  imageUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
  isUsingProxy: boolean;
  retry: () => void;
}

interface UseImageStateOptions {
  fallbackToProxy?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export function useImageState(
  initialUrl: string | null,
  options: UseImageStateOptions = {}
): UseImageStateReturn {
  const {
    fallbackToProxy = true,
    maxRetries = 1,
    retryDelay = 3000
  } = options;

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isUsingProxy, setIsUsingProxy] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  const testAndSetImage = useCallback(async (url: string, useProxy: boolean = false) => {
    if (!isValidImageUrl(url)) {
      console.warn(`[useImageState] Invalid image URL: ${url}`);
      return false;
    }

    const testUrl = useProxy ? getProxiedImageUrl(url) : url;
    const isAccessible = await testImageUrl(testUrl);

    if (isAccessible) {
      setImageUrl(testUrl);
      setIsUsingProxy(useProxy);
      setHasError(false);
      return true;
    }

    return false;
  }, []);

  const loadImage = useCallback(async (url: string, retry: number = 0) => {
    setIsLoading(true);
    setHasError(false);

    // First try direct access
    const directSuccess = await testAndSetImage(url, false);
    
    if (directSuccess) {
      setIsLoading(false);
      return;
    }

    // If direct access fails and proxy is enabled, try proxy
    if (fallbackToProxy) {
      devLog(`[useImageState] Direct access failed, trying proxy for: ${url}`);
      const proxySuccess = await testAndSetImage(url, true);
      
      if (proxySuccess) {
        setIsLoading(false);
        return;
      }
    }

    // If both fail and we can retry
    if (retry < maxRetries) {
      devLog(`[useImageState] Retrying in ${retryDelay}ms... (attempt ${retry + 2})`);
      setTimeout(() => {
        loadImage(url, retry + 1);
      }, retryDelay);
      return;
    }

    // All attempts failed
    console.error(`[useImageState] All attempts failed for: ${url}`);
    setHasError(true);
    setIsLoading(false);
  }, [testAndSetImage, fallbackToProxy, maxRetries, retryDelay]);

  const retry = useCallback(() => {
    if (initialUrl) {
      setRetryCount(prev => prev + 1);
      loadImage(initialUrl);
    }
  }, [initialUrl, loadImage]);

  useEffect(() => {
    if (initialUrl) {
      loadImage(initialUrl);
    } else {
      setImageUrl(null);
      setIsLoading(false);
      setHasError(false);
      setIsUsingProxy(false);
    }
  }, [initialUrl, loadImage, retryCount]);

  return {
    imageUrl,
    isLoading,
    hasError,
    isUsingProxy,
    retry
  };
}
