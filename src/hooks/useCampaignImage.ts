import { useState, useEffect, useCallback } from 'react';

interface CampaignImageData {
  image_url: string;
  campaign_address: string;
  creator_address: string;
}

interface UseCampaignImageReturn {
  campaignImage: string;
  isLoading: boolean;
  error: string | null;
}

export const useCampaignImage = (campaignAddress: string): UseCampaignImageReturn => {
  const [campaignImage, setCampaignImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaignImage = useCallback(async () => {
    if (!campaignAddress) {
      setError('Campaign address is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaign-image/${campaignAddress}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.image_url) {
          setCampaignImage(data.data.image_url);
        } else {
          setError('No image found for this campaign');
        }
      } else if (response.status === 404) {
        setError('No image found for this campaign');
      } else {
        setError('Failed to fetch campaign image');
      }
    } catch (err) {
      setError('Network error while fetching campaign image');
      console.error('Error fetching campaign image:', err);
    } finally {
      setIsLoading(false);
    }
  }, [campaignAddress]);

  useEffect(() => {
    if (campaignAddress) {
      fetchCampaignImage();
    }
  }, [fetchCampaignImage, campaignAddress]);

  return {
    campaignImage,
    isLoading,
    error
  };
};
