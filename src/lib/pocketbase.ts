import PocketBase from 'pocketbase';
import { devLog } from '@/utils/debugLog';

// Initialize PocketBase client
export const pb = new PocketBase('https://fairytale-web.pockethost.io');

// Types for campaign images
export interface CampaignImage {
  id?: string;
  collectionId?: string;
  campaign_address: string;
  image_url?: string; // Keep for backward compatibility
  image_file?: string; // New field for actual file storage
  creator_address: string;
  original_nft_id?: string;
  created?: string;
  updated?: string;
}

// Types for campaign audio
export interface CampaignAudio {
  id?: string;
  collectionId?: string;
  campaign_address: string;
  audio_url?: string; // Keep for backward compatibility
  audio_file?: string; // New field for actual file storage
  creator_address: string;
  original_nft_id?: string;
  audio_title?: string; // Title of the audio track
  audio_duration?: number; // Duration in seconds
  created?: string;
  updated?: string;
}

// Types for campaign videos
export interface CampaignVideo {
  id?: string;
  collectionId?: string;
  campaign_address: string;
  video_url?: string; // Keep for backward compatibility
  video_file?: string; // New field for actual file storage
  creator_address: string;
  original_nft_id?: string;
  video_title?: string; // Title of the video
  video_duration?: number; // Duration in seconds
  video_thumbnail?: string; // Thumbnail image file
  created?: string;
  updated?: string;
}

// Types for campaign NFTs - store minted NFTs in database
export interface CampaignNFT {
  id?: string;
  collectionId?: string;
  campaign_address: string;
  supporter_address: string;
  tier_id: number;
  nft_token_id?: string;
  nft_contract_address?: string;
  nft_metadata?: string; // JSON string of metadata
  transaction_hash?: string;
  mint_status: 'pending' | 'minted' | 'failed';
  created?: string;
  updated?: string;
}

// Types for campaign supporters - track who can access audio
export interface CampaignSupporter {
  id?: string;
  collectionId?: string;
  campaign_address: string;
  supporter_address: string;
  amount_funded: number;
  access_granted: boolean;
  created?: string;
  updated?: string;
}

// Types for campaign contact forms - separate collection for contact info
export interface CampaignContact {
  id?: string;
  collectionId?: string;
  campaign_address: string;
  supporter_address: string;
  name: string;
  email: string;
  address?: string;
  phone?: string;
  x_username?: string;
  telegram_username?: string;
  additional_notes?: string;
  created?: string;
  updated?: string;
}

// Types for campaign comments
export interface CampaignComment {
  id?: string;
  collectionId?: string;
  campaign_address: string;
  commenter_address: string;
  commenter_name?: string;
  content: string;
  reply_to_id?: string; // For nested comments/replies
  likes: number;
  is_creator: boolean; // Flag if comment is from creator
  created?: string;
  updated?: string;
}

// Types for leaderboard entries (pre-aggregated for performance)
export interface LeaderboardEntry {
  id?: string;
  collectionId?: string;
  supporter_address: string;
  total_funded: number;
  campaign_count: number;
  badge_level: 'bronze' | 'silver' | 'gold' | 'platinum'; // Based on funding amount
  tier: number; // Global rank tier
  last_updated?: string;
}

// Campaign image operations
export const campaignImageService = {
  // Download image from URL and return as File object for collection upload
  async downloadImageAsFile(imageUrl: string, filename: string): Promise<File | null> {
    try {
      // Validate URL first
      if (!imageUrl || !imageUrl.startsWith('http')) {
        return null;
      }

      // For Camp Origin URLs that might have CORS issues, we need to handle them differently
      const isCampOriginUrl = imageUrl.includes('camp-origin.s3.us-east-2.amazonaws.com');
      
      let response: Response;
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds
      
      try {
        if (isCampOriginUrl) {
          // For Camp Origin URLs, try multiple strategies
          
          // Strategy 1: Try simple fetch first (sometimes works server-side)
          try {
            response = await fetch(imageUrl, { 
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CreatorVault/1.0)',
                'Accept': 'image/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
              }
            });
            
            if (!response.ok) {
              throw new Error(`Simple fetch failed: ${response.status}`);
            }
          } catch (simpleError: any) {
            
            // Strategy 2: Try with no-cors mode
            try {
              response = await fetch(imageUrl, { 
                signal: controller.signal,
                mode: 'no-cors',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; CreatorVault/1.0)',
                }
              });
              
            } catch (noCorsError: any) {
              
              // Strategy 3: Try using our proxy API if we're client-side
              if (typeof window !== 'undefined') {
                const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
                response = await fetch(proxyUrl, { 
                  signal: controller.signal,
                  headers: {
                    'Accept': 'image/*,*/*;q=0.8',
                  }
                });
              } else {
                // Server-side: give up on this URL
                throw new Error('All Camp Origin strategies failed server-side');
              }
            }
          }
        } else {
          // For non-Camp Origin URLs, use standard fetch
          response = await fetch(imageUrl, { 
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; CreatorVault/1.0)',
              'Accept': 'image/*,*/*;q=0.8',
              'Cache-Control': 'no-cache'
            }
          });
        }
        
        clearTimeout(timeoutId);
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // For Camp Origin URLs, if all fetch methods fail, try one more time with minimal config
        if (isCampOriginUrl && fetchError.name !== 'AbortError') {
          try {
            response = await fetch(imageUrl);
          } catch (minimalError: any) {
            return null;
          }
        } else {
          return null;
        }
      }
      
      // Check if we got a valid response
      if (!response.ok && response.type !== 'opaque') {
        return null;
      }
      
      // Get the blob
      const blob = await response.blob();
      
      // Validate blob size
      if (blob.size === 0) {
        return null;
      }
      
      // For no-cors responses, we might not get the correct MIME type
      let mimeType = blob.type;
      let extension = 'jpg'; // default
      
      if (mimeType && mimeType !== 'application/octet-stream') {
        // We have a proper MIME type
        if (mimeType.includes('png')) extension = 'png';
        else if (mimeType.includes('gif')) extension = 'gif';
        else if (mimeType.includes('webp')) extension = 'webp';
        else if (mimeType.includes('svg')) extension = 'svg';
      } else {
        // Fallback: try to determine from URL
        const urlMatch = imageUrl.match(/\.(png|jpg|jpeg|gif|webp|svg)/i);
        if (urlMatch) {
          extension = urlMatch[1].toLowerCase();
          mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
        } else {
          // Default to JPEG if we can't determine
          mimeType = 'image/jpeg';
          extension = 'jpg';
        }
      }
      
      const finalFilename = `${filename}.${extension}`;
      const file = new File([blob], finalFilename, { type: mimeType });
      
      return file;
      
    } catch (error: any) {
      return null;
    }
  },

  // Create a new campaign image record with file upload
  async createWithImageFile(data: Omit<CampaignImage, 'id' | 'created' | 'updated'>, imageUrl?: string): Promise<CampaignImage> {
    try {
      // Validate required fields
      if (!data.campaign_address) {
        throw new Error('Campaign address is required');
      }
      if (!data.creator_address) {
        throw new Error('Creator address is required');
      }
      
      // Test PocketBase connection first
      try {
        await pb.health.check();
      } catch (healthError) {
        throw new Error('PocketBase connection failed');
      }
      
      // Prepare the form data for creating the record
      const formData = new FormData();
      formData.append('campaign_address', data.campaign_address);
      formData.append('creator_address', data.creator_address);
      
      if (data.original_nft_id) {
        formData.append('original_nft_id', data.original_nft_id);
      }
      
      // If we have an image URL, try to download and attach it as a file
      if (imageUrl) {
        formData.append('image_url', imageUrl); // Always save the original URL for reference
        
        const filename = `campaign_${data.campaign_address.slice(-8)}_${Date.now()}`;
        const imageFile = await this.downloadImageAsFile(imageUrl, filename);
        
        if (imageFile) {
          formData.append('image_file', imageFile);
        }
      }
      
      // Create the record with the file upload (or just the URL if file download failed)
      const record = await pb.collection('campaign_images').create(formData);
      
      return record as unknown as CampaignImage;
    } catch (error: any) {
      
      // Enhanced error logging
      if (error.response) {
        // Error response available
      }
      if (error.status) {
        // Status code available
      }
      
      // Try fallback: create record with just URL (no file)
      if (imageUrl && error.message !== 'Campaign address is required' && error.message !== 'Creator address is required') {
        try {
          const fallbackData = {
            campaign_address: data.campaign_address,
            image_url: imageUrl,
            creator_address: data.creator_address,
            original_nft_id: data.original_nft_id || ''
          };
          
          const fallbackRecord = await pb.collection('campaign_images').create(fallbackData);
          return fallbackRecord as unknown as CampaignImage;
        } catch (fallbackError) {
          // Fallback creation also failed
        }
      }
      
      throw error;
    }
  },

  // Get file URL from PocketBase with better error handling
  getFileUrl(record: CampaignImage, thumbSize: string = '400x240'): string | null {
    if (!record.image_file || !record.id) {
      return null;
    }
    
    try {
      // PocketBase file URL format: /api/files/COLLECTION_ID/RECORD_ID/FILENAME
      const baseUrl = pb.baseUrl || 'https://fairytale-web.pockethost.io';
      const collectionId = record.collectionId || 'campaign_images';
      
      // Build URL with optional thumbnail parameter
      let url = `${baseUrl}/api/files/${collectionId}/${record.id}/${record.image_file}`;
      
      // Add thumbnail parameter if specified
      if (thumbSize && thumbSize !== 'original') {
        url += `?thumb=${thumbSize}`;
      }
      
      return url;
    } catch (error) {
      return null;
    }
  },

  // Get original file URL without thumbnail
  getOriginalFileUrl(record: CampaignImage): string | null {
    return this.getFileUrl(record, 'original');
  },
  // Create a new campaign image record
  async create(data: Omit<CampaignImage, 'id' | 'created' | 'updated'>) {
    try {
      const record = await pb.collection('campaign_images').create(data);
      return record as unknown as CampaignImage;
    } catch (error) {
      console.error('Error creating campaign image:', error);
      throw error;
    }
  },

  // Get campaign image by campaign address with caching and timeout
  async getByCampaignAddress(campaignAddress: string) {
    try {
      // Add timeout to the request (increased from 3s to 8s)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 8000)
      );
      
      const requestPromise = pb.collection('campaign_images').getFirstListItem(`campaign_address="${campaignAddress}"`);
      
      const record = await Promise.race([requestPromise, timeoutPromise]) as unknown as CampaignImage;
      
      // If we have a file stored in PocketBase, prefer that over external URLs
      if (record.image_file) {
        const fileUrl = this.getFileUrl(record);
        if (fileUrl) {
          record.image_url = fileUrl; // Override with local file URL
        }
      }
      
      return record;
    } catch (error: any) {
      if (error.status === 404) {
        return null; // No image found for this campaign
      }
      if (error.status === 429) {
        return null; // Return null instead of throwing to prevent UI breaks
      }
      if (error.message === 'Request timeout') {
        return null;
      }
      return null; // Return null instead of throwing to prevent UI breaks
    }
  },

  // Get all campaign images
  async getAll() {
    try {
      const records = await pb.collection('campaign_images').getFullList({
        sort: '-created'
      });
      return records as unknown as CampaignImage[];
    } catch (error) {
      console.error('Error fetching all campaign images:', error);
      throw error;
    }
  },

  // Get all campaign images by creator
  async getByCreator(creatorAddress: string) {
    try {
      const records = await pb.collection('campaign_images').getFullList({
        filter: `creator_address="${creatorAddress}"`,
        sort: '-created'
      });
      return records as unknown as CampaignImage[];
    } catch (error) {
      console.error('Error fetching creator campaign images:', error);
      throw error;
    }
  },

  // Update campaign image
  async update(id: string, data: Partial<CampaignImage>) {
    try {
      const record = await pb.collection('campaign_images').update(id, data);
      return record as unknown as CampaignImage;
    } catch (error) {
      console.error('Error updating campaign image:', error);
      throw error;
    }
  },

  // Delete campaign image
  async delete(id: string) {
    try {
      await pb.collection('campaign_images').delete(id);
    } catch (error) {
      console.error('Error deleting campaign image:', error);
      throw error;
    }
  }
};

// Campaign video operations
export const campaignVideoService = {
  // Download video from URL and return as File object for collection upload
  async downloadVideoAsFile(videoUrl: string, filename: string): Promise<File | null> {
    try {
      // Add timeout to prevent hanging on broken URLs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for video files
      
      // Download the video
      const response = await fetch(videoUrl, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Create a File object from the blob
      const file = new File([blob], filename, { 
        type: blob.type || 'video/mp4' // Default to mp4 if type is unknown
      });
      
      return file;
    } catch (error) {
      console.error('[PocketBase] Error downloading video from URL:', error);
      return null;
    }
  },

  // Create a new campaign video record with file upload
  async createWithVideoFile(data: Omit<CampaignVideo, 'id' | 'created' | 'updated'>, videoUrl?: string, thumbnailUrl?: string): Promise<CampaignVideo> {
    try {
      // Prepare the form data for creating the record
      const formData = new FormData();
      formData.append('campaign_address', data.campaign_address);
      formData.append('creator_address', data.creator_address);
      
      if (data.original_nft_id) {
        formData.append('original_nft_id', data.original_nft_id);
      }
      
      if (data.video_title) {
        formData.append('video_title', data.video_title);
      }
      
      if (data.video_duration) {
        formData.append('video_duration', data.video_duration.toString());
      }
      
      // If we have a video URL, download and attach it as a file
      if (videoUrl) {
        formData.append('video_url', videoUrl); // Keep original URL for reference
        
        const filename = `campaign_video_${data.campaign_address}_${Date.now()}.mp4`;
        const videoFile = await this.downloadVideoAsFile(videoUrl, filename);
        
        if (videoFile) {
          formData.append('video_file', videoFile);
        } else {
          console.warn(`[PocketBase] Failed to download video from URL: ${videoUrl}`);
        }
      }
      
      // If we have a thumbnail URL, download and attach it as well
      if (thumbnailUrl) {
        const thumbnailFilename = `campaign_video_thumb_${data.campaign_address}_${Date.now()}.jpg`;
        const thumbnailFile = await campaignImageService.downloadImageAsFile(thumbnailUrl, thumbnailFilename);
        
        if (thumbnailFile) {
          formData.append('video_thumbnail', thumbnailFile);
        }
      }
      
      // Create the record with the file upload
      const record = await pb.collection('campaign_videos').create(formData);
      
      return record as unknown as CampaignVideo;
    } catch (error) {
      console.error('Error creating campaign video with file:', error);
      throw error;
    }
  },

  // Get video file URL from PocketBase
  getFileUrl(record: CampaignVideo): string | null {
    if (!record.video_file || !record.id) {
      return null;
    }
    
    // PocketBase file URL format: /api/files/COLLECTION_ID/RECORD_ID/FILENAME
    return `${pb.baseUrl}/api/files/${record.collectionId || 'campaign_videos'}/${record.id}/${record.video_file}`;
  },

  // Get video thumbnail URL from PocketBase
  getThumbnailUrl(record: CampaignVideo): string | null {
    if (!record.video_thumbnail || !record.id) {
      return null;
    }
    
    return `${pb.baseUrl}/api/files/${record.collectionId || 'campaign_videos'}/${record.id}/${record.video_thumbnail}`;
  },

  // Get campaign video by campaign address
  async getByCampaignAddress(campaignAddress: string) {
    try {
      // Add timeout to the request
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 8000)
      );
      
      const requestPromise = pb.collection('campaign_videos').getFirstListItem(`campaign_address="${campaignAddress}"`);
      
      const record = await Promise.race([requestPromise, timeoutPromise]) as unknown as CampaignVideo;
      
      // If we have a file stored in PocketBase, prefer that over external URLs
      if (record.video_file) {
        const fileUrl = this.getFileUrl(record);
        if (fileUrl) {
          record.video_url = fileUrl; // Override with local file URL
        }
      }
      
      return record;
    } catch (error: any) {
      if (error.status === 404) {
        return null; // No video found for this campaign
      }
      if (error.status === 429) {
        console.warn(`[PocketBase] Rate limited for campaign: ${campaignAddress}. Returning null to prevent cascade failures.`);
        return null; // Return null instead of throwing to prevent UI breaks
      }
      if (error.message === 'Request timeout') {
        console.warn(`[PocketBase] Request timed out for campaign: ${campaignAddress}`);
        return null;
      }
      console.error(`[PocketBase] Error fetching campaign video for ${campaignAddress}:`, error);
      return null; // Return null instead of throwing to prevent UI breaks
    }
  },

  // Delete campaign video
  async delete(id: string) {
    try {
      await pb.collection('campaign_videos').delete(id);
    } catch (error) {
      console.error('Error deleting campaign video:', error);
      throw error;
    }
  }
};

// Campaign NFT operations
export const campaignNFTService = {
  // Create a new NFT record
  async create(data: Omit<CampaignNFT, 'id' | 'created' | 'updated'>) {
    try {
      const record = await pb.collection('campaign_nfts').create(data);
      return record as unknown as CampaignNFT;
    } catch (error) {
      console.error('Error creating campaign NFT:', error);
      throw error;
    }
  },

  // Update NFT record with mint results
  async updateMintResult(id: string, data: Partial<CampaignNFT>) {
    try {
      const record = await pb.collection('campaign_nfts').update(id, data);
      return record as unknown as CampaignNFT;
    } catch (error) {
      console.error('Error updating campaign NFT:', error);
      throw error;
    }
  },

  // Get NFT by supporter and campaign
  async getBySupporterAndCampaign(supporterAddress: string, campaignAddress: string) {
    try {
      const record = await pb.collection('campaign_nfts').getFirstListItem(
        `supporter_address="${supporterAddress}" && campaign_address="${campaignAddress}"`
      );
      return record as unknown as CampaignNFT;
    } catch (error: any) {
      if (error.status === 404) {
        return null; // No NFT found
      }
      console.error('Error fetching campaign NFT:', error);
      throw error;
    }
  },

  // Get all NFTs for a campaign
  async getByCampaign(campaignAddress: string) {
    try {
      const records = await pb.collection('campaign_nfts').getFullList({
        filter: `campaign_address="${campaignAddress}"`,
        sort: '-created'
      });
      return records as unknown as CampaignNFT[];
    } catch (error) {
      console.error('Error fetching campaign NFTs:', error);
      throw error;
    }
  },

  // Get all NFTs for a supporter
  async getBySupporter(supporterAddress: string) {
    try {
      const records = await pb.collection('campaign_nfts').getFullList({
        filter: `supporter_address="${supporterAddress}"`,
        sort: '-created'
      });
      return records as unknown as CampaignNFT[];
    } catch (error) {
      console.error('Error fetching supporter NFTs:', error);
      throw error;
    }
  }
};

// Campaign audio operations
export const campaignAudioService = {
  // Download audio from URL and return as File object for collection upload
  async downloadAudioAsFile(audioUrl: string, filename: string): Promise<File | null> {
    try {
      // Add timeout to prevent hanging on broken URLs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for audio files
      
      // Download the audio
      const response = await fetch(audioUrl, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Create a File object from the blob
      const file = new File([blob], filename, { 
        type: blob.type || 'audio/mpeg' // Default to mp3 if type is unknown
      });
      
      return file;
    } catch (error) {
      console.error('[PocketBase] Error downloading audio from URL:', error);
      return null;
    }
  },

  // Create a new campaign audio record with file upload
  async createWithAudioFile(data: Omit<CampaignAudio, 'id' | 'created' | 'updated'>, audioUrl?: string): Promise<CampaignAudio> {
    try {
      devLog(`[PocketBase] Creating campaign audio record with file upload`);
      
      // Prepare the form data for creating the record
      const formData = new FormData();
      formData.append('campaign_address', data.campaign_address);
      formData.append('creator_address', data.creator_address);
      
      if (data.original_nft_id) {
        formData.append('original_nft_id', data.original_nft_id);
      }
      
      if (data.audio_title) {
        formData.append('audio_title', data.audio_title);
      }
      
      if (data.audio_duration) {
        formData.append('audio_duration', data.audio_duration.toString());
      }
      
      // If we have an audio URL, download and attach it as a file
      if (audioUrl) {
        formData.append('audio_url', audioUrl); // Keep original URL for reference
        
        const filename = `campaign_audio_${data.campaign_address}_${Date.now()}.mp3`;
        const audioFile = await this.downloadAudioAsFile(audioUrl, filename);
        
        if (audioFile) {
          formData.append('audio_file', audioFile);
          devLog(`[PocketBase] Attached audio file: ${filename}, size: ${audioFile.size} bytes`);
        } else {
          console.warn(`[PocketBase] Failed to download audio from URL: ${audioUrl}`);
        }
      }
      
      // Create the record with the file upload
      const record = await pb.collection('campaign_audio').create(formData);
      devLog(`[PocketBase] Created audio record with file:`, record);
      
      return record as unknown as CampaignAudio;
    } catch (error) {
      console.error('Error creating campaign audio with file:', error);
      throw error;
    }
  },

  // Get audio file URL from PocketBase
  getFileUrl(record: CampaignAudio): string | null {
    if (!record.audio_file || !record.id) {
      return null;
    }
    
    // PocketBase file URL format: /api/files/COLLECTION_ID/RECORD_ID/FILENAME
    return `${pb.baseUrl}/api/files/${record.collectionId || 'campaign_audio'}/${record.id}/${record.audio_file}`;
  },

  // Get campaign audio by campaign address
  async getByCampaignAddress(campaignAddress: string) {
    try {
      devLog(`[PocketBase] Fetching audio for campaign: ${campaignAddress}`);
      
      // Add timeout to the request
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 8000)
      );
      
      const requestPromise = pb.collection('campaign_audio').getFirstListItem(`campaign_address="${campaignAddress}"`);
      
      const record = await Promise.race([requestPromise, timeoutPromise]) as unknown as CampaignAudio;
      devLog(`[PocketBase] Found audio record:`, record);
      
      // If we have a file stored in PocketBase, prefer that over external URLs
      if (record.audio_file) {
        const fileUrl = this.getFileUrl(record);
        if (fileUrl) {
          devLog(`[PocketBase] Using PocketBase audio file URL: ${fileUrl}`);
          record.audio_url = fileUrl; // Override with local file URL
        }
      }
      
      return record;
    } catch (error: any) {
      if (error.status === 404) {
        devLog(`[PocketBase] No audio found for campaign: ${campaignAddress}`);
        return null; // No audio found for this campaign
      }
      if (error.status === 429) {
        console.warn(`[PocketBase] Rate limited for campaign: ${campaignAddress}. Returning null to prevent cascade failures.`);
        return null; // Return null instead of throwing to prevent UI breaks
      }
      if (error.message === 'Request timeout') {
        console.warn(`[PocketBase] Request timed out for campaign: ${campaignAddress}`);
        return null;
      }
      console.error(`[PocketBase] Error fetching campaign audio for ${campaignAddress}:`, error);
      return null; // Return null instead of throwing to prevent UI breaks
    }
  },

  // Delete campaign audio
  async delete(id: string) {
    try {
      await pb.collection('campaign_audio').delete(id);
    } catch (error) {
      console.error('Error deleting campaign audio:', error);
      throw error;
    }
  }
};

// Campaign supporter operations
export const campaignSupporterService = {
  // Create a new supporter record
  async create(data: Omit<CampaignSupporter, 'id' | 'created' | 'updated'>) {
    try {
      const record = await pb.collection('campaign_supporters').create(data);
      return record as unknown as CampaignSupporter;
    } catch (error) {
      console.error('Error creating campaign supporter:', error);
      throw error;
    }
  },

  // Check if a user has access to campaign audio
  async hasAudioAccess(campaignAddress: string, supporterAddress: string): Promise<boolean> {
    try {
      const record = await pb.collection('campaign_supporters').getFirstListItem(
        `campaign_address="${campaignAddress}" && supporter_address="${supporterAddress}" && access_granted=true`
      );
      return !!record;
    } catch (error: any) {
      if (error.status === 404) {
        return false; // No supporter record found
      }
      console.error('Error checking audio access:', error);
      return false;
    }
  },

  // Grant audio access to a supporter
  async grantAudioAccess(campaignAddress: string, supporterAddress: string, amountFunded: number) {
    try {
      // Check if record already exists
      const existingRecord = await pb.collection('campaign_supporters').getFirstListItem(
        `campaign_address="${campaignAddress}" && supporter_address="${supporterAddress}"`
      ).catch(() => null);

      if (existingRecord) {
        // Update existing record
        return await pb.collection('campaign_supporters').update(existingRecord.id, {
          amount_funded: (existingRecord.amount_funded || 0) + amountFunded,
          access_granted: true
        });
      } else {
        // Create new record
        return await this.create({
          campaign_address: campaignAddress,
          supporter_address: supporterAddress,
          amount_funded: amountFunded,
          access_granted: true
        });
      }
    } catch (error) {
      console.error('Error granting audio access:', error);
      throw error;
    }
  },

  // Get all supporters for a campaign
  async getByCampaign(campaignAddress: string) {
    try {
      const records = await pb.collection('campaign_supporters').getFullList({
        filter: `campaign_address="${campaignAddress}"`,
        sort: '-created'
      });
      return records as unknown as CampaignSupporter[];
    } catch (error) {
      console.error('Error fetching campaign supporters:', error);
      throw error;
    }
  },

  // Get all campaigns a supporter has funded
  async getBySupporter(supporterAddress: string) {
    try {
      const records = await pb.collection('campaign_supporters').getFullList({
        filter: `supporter_address="${supporterAddress}"`,
        sort: '-created'
      });
      return records as unknown as CampaignSupporter[];
    } catch (error) {
      console.error('Error fetching supporter campaigns:', error);
      throw error;
    }
  }
};

// Campaign contact operations
export const campaignContactService = {
  // Create a new contact form submission
  async create(data: Omit<CampaignContact, 'id' | 'created' | 'updated'>) {
    try {
      const record = await pb.collection('campaign_contacts').create(data);
      return record as unknown as CampaignContact;
    } catch (error) {
      console.error('Error creating campaign contact:', error);
      throw error;
    }
  },

  // Check if a supporter has submitted contact info
  async hasSubmittedContact(campaignAddress: string, supporterAddress: string): Promise<boolean> {
    try {
      const record = await pb.collection('campaign_contacts').getFirstListItem(
        `campaign_address="${campaignAddress}" && supporter_address="${supporterAddress}"`
      );
      return !!record;
    } catch (error: any) {
      if (error.status === 404) {
        return false; // No contact record found
      }
      console.error('Error checking contact submission:', error);
      return false;
    }
  },

  // Get contact info for a specific supporter and campaign
  async getContactInfo(campaignAddress: string, supporterAddress: string) {
    try {
      const record = await pb.collection('campaign_contacts').getFirstListItem(
        `campaign_address="${campaignAddress}" && supporter_address="${supporterAddress}"`
      );
      return record as unknown as CampaignContact;
    } catch (error: any) {
      if (error.status === 404) {
        return null; // No contact record found
      }
      console.error('Error fetching contact info:', error);
      throw error;
    }
  },

  // Get all contacts for a campaign (for creator dashboard)
  async getByCampaign(campaignAddress: string) {
    try {
      const records = await pb.collection('campaign_contacts').getFullList({
        filter: `campaign_address="${campaignAddress}"`,
        sort: '-created'
      });
      return records as unknown as CampaignContact[];
    } catch (error) {
      console.error('Error fetching campaign contacts:', error);
      throw error;
    }
  },

  // Update contact info
  async update(id: string, data: Partial<CampaignContact>) {
    try {
      const record = await pb.collection('campaign_contacts').update(id, data);
      return record as unknown as CampaignContact;
    } catch (error) {
      console.error('Error updating campaign contact:', error);
      throw error;
    }
  }
};

// Recent Activities Service - for cross-device notifications and activity feeds
export interface RecentActivity {
  id?: string;
  collectionId?: string;
  campaign_address: string;
  supporter_address: string;
  creator_address: string;
  activity_type: 'funding' | 'contact_submission' | 'nft_mint' | 'campaign_creation' | 'fund_claim';
  amount?: number;
  tier_title?: string;
  campaign_name?: string;
  message?: string;
  is_read: boolean;
  created?: string;
  updated?: string;
}

export const recentActivitiesService = {
  // Create a new activity record
  async create(data: Omit<RecentActivity, 'id' | 'created' | 'updated'>) {
    try {
      const record = await pb.collection('recent_activities').create({
        ...data,
        is_read: data.is_read ?? false
      });
      devLog('Activity created:', record);
      return record as unknown as RecentActivity;
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  },

  // Get activities for a creator (for dashboard notifications)
  async getByCreator(creatorAddress: string, limit = 50) {
    try {
      const records = await pb.collection('recent_activities').getList(1, limit, {
        filter: `creator_address="${creatorAddress}"`,
        sort: '-created'
      });
      return records.items as unknown as RecentActivity[];
    } catch (error) {
      console.error('Error fetching activities for creator:', error);
      return [];
    }
  },

  // Get unread activities for a creator
  async getUnreadByCreator(creatorAddress: string) {
    try {
      const records = await pb.collection('recent_activities').getFullList({
        filter: `creator_address="${creatorAddress}" && is_read=false`,
        sort: '-created'
      });
      return records as unknown as RecentActivity[];
    } catch (error) {
      console.error('Error fetching unread activities:', error);
      return [];
    }
  },

  // Mark an activity as read
  async markAsRead(id: string) {
    try {
      const record = await pb.collection('recent_activities').update(id, {
        is_read: true
      });
      return record as unknown as RecentActivity;
    } catch (error) {
      console.error('Error marking activity as read:', error);
      throw error;
    }
  },

  // Mark all activities as read for a creator
  async markAllAsRead(creatorAddress: string) {
    try {
      // Get all unread activities
      const unreadActivities = await this.getUnreadByCreator(creatorAddress);
      
      // Mark each as read
      const promises = unreadActivities.map(activity => 
        this.markAsRead(activity.id!)
      );
      
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Error marking all activities as read:', error);
      throw error;
    }
  },

  // Get activities for a specific campaign
  async getByCampaign(campaignAddress: string, limit = 50) {
    try {
      const records = await pb.collection('recent_activities').getList(1, limit, {
        filter: `campaign_address="${campaignAddress}"`,
        sort: '-created'
      });
      return records.items as unknown as RecentActivity[];
    } catch (error) {
      console.error('Error fetching activities for campaign:', error);
      return [];
    }
  },

  // Delete an activity
  async delete(id: string) {
    try {
      await pb.collection('recent_activities').delete(id);
      return true;
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  }
};

// Campaign Funding Service - for tracking individual funding transactions across devices
export interface CampaignFunding {
  id?: string;
  collectionId?: string;
  campaign_address: string;
  supporter_address: string;
  creator_address: string;
  amount: number;
  tier_id?: number;
  tier_title?: string;
  transaction_hash?: string;
  block_number?: number;
  campaign_name?: string;
  created?: string;
  updated?: string;
}

export const campaignFundingService = {
  // Create a new funding record
  async create(data: Omit<CampaignFunding, 'id' | 'created' | 'updated'>) {
    try {
      const record = await pb.collection('campaign_funding').create(data);
      return record as unknown as CampaignFunding;
    } catch (error) {
      console.error('Error creating funding record:', error);
      throw error;
    }
  },

  // Get all funding records for a campaign (for creator dashboard)
  async getByCampaign(campaignAddress: string) {
    try {
      const records = await pb.collection('campaign_funding').getFullList({
        filter: `campaign_address="${campaignAddress}"`,
        sort: '-created'
      });
      return records as unknown as CampaignFunding[];
    } catch (error) {
      console.error('Error fetching campaign funding:', error);
      return [];
    }
  },

  // Get all funding records by a supporter (for supporter dashboard)
  async getBySupporter(supporterAddress: string) {
    try {
      const records = await pb.collection('campaign_funding').getFullList({
        filter: `supporter_address="${supporterAddress}"`,
        sort: '-created'
      });
      return records as unknown as CampaignFunding[];
    } catch (error) {
      console.error('Error fetching supporter funding:', error);
      return [];
    }
  },

  // Get funding stats for a campaign
  async getCampaignStats(campaignAddress: string) {
    try {
      const records = await pb.collection('campaign_funding').getFullList({
        filter: `campaign_address="${campaignAddress}"`
      });
      
      const totalAmount = records.reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
      const uniqueSupporters = new Set(records.map((record: any) => record.supporter_address)).size;
      
      return {
        totalAmount,
        uniqueSupporters,
        totalTransactions: records.length
      };
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
      return {
        totalAmount: 0,
        uniqueSupporters: 0,
        totalTransactions: 0
      };
    }
  },

  // Check if a specific funding transaction exists
  async exists(campaignAddress: string, supporterAddress: string, transactionHash: string) {
    try {
      const record = await pb.collection('campaign_funding').getFirstListItem(
        `campaign_address="${campaignAddress}" && supporter_address="${supporterAddress}" && transaction_hash="${transactionHash}"`
      );
      return !!record;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      console.error('Error checking funding existence:', error);
      return false;
    }
  }
};

// Community Support Service for global support feed
export const communitySupportService = {
  // Create a new community support record
  async create(data: {
    user_address: string;
    user_name?: string;
    support_type: 'campaign_funding' | 'tier_purchase' | 'campaign_creation' | 'campaign_share';
    campaign_address?: string;
    campaign_name?: string;
    amount?: string;
    tier_name?: string;
    message?: string;
  }) {
    try {
      const record = await pb.collection('community_support').create({
        ...data,
        created: new Date().toISOString()
      });
      return record;
    } catch (error) {
      console.error('Error creating community support record:', error);
      throw error;
    }
  },

  // Get recent community support activities (global feed)
  async getRecent(limit = 10) {
    try {
      const records = await pb.collection('community_support').getList(1, limit, {
        sort: '-created'
      });
      return records.items;
    } catch (error) {
      console.error('Error fetching community support:', error);
      return [];
    }
  },

  // Get support activities for a specific campaign
  async getByCampaign(campaignAddress: string, limit = 20) {
    try {
      const records = await pb.collection('community_support').getList(1, limit, {
        filter: `campaign_address = "${campaignAddress}"`,
        sort: '-created'
      });
      return records.items;
    } catch (error) {
      console.error('Error fetching campaign support:', error);
      return [];
    }
  },

  // Get support activities by a specific user
  async getByUser(userAddress: string, limit = 20) {
    try {
      const records = await pb.collection('community_support').getList(1, limit, {
        filter: `user_address = "${userAddress}"`,
        sort: '-created'
      });
      return records.items;
    } catch (error) {
      console.error('Error fetching user support:', error);
      return [];
    }
  }
};

// Campaign comments operations
export const campaignCommentsService = {
  // Create a new comment
  async create(data: Omit<CampaignComment, 'id' | 'created' | 'updated' | 'likes'>) {
    try {
      const record = await pb.collection('campaign_feedback').create({
        ...data,
        likes: 0
      });
      return record as unknown as CampaignComment;
    } catch (error) {
      console.error('Error creating campaign comment:', error);
      throw error;
    }
  },

  // Get comments for a campaign
  async getByCampaign(campaignAddress: string, limit = 50) {
    try {
      const records = await pb.collection('campaign_feedback').getList(1, limit, {
        filter: `campaign_address = "${campaignAddress}" && reply_to_id = ""`,
        sort: '-created'
      });
      return records.items as unknown as CampaignComment[];
    } catch (error) {
      console.error('Error fetching campaign comments:', error);
      return [];
    }
  },

  // Get replies to a specific comment
  async getReplies(commentId: string) {
    try {
      const records = await pb.collection('campaign_feedback').getFullList({
        filter: `reply_to_id = "${commentId}"`,
        sort: 'created'
      });
      return records as unknown as CampaignComment[];
    } catch (error) {
      console.error('Error fetching comment replies:', error);
      return [];
    }
  },

  // Update comment (for likes)
  async update(id: string, data: Partial<CampaignComment>) {
    try {
      const record = await pb.collection('campaign_feedback').update(id, data);
      return record as unknown as CampaignComment;
    } catch (error) {
      console.error('Error updating campaign comment:', error);
      throw error;
    }
  },

  // Delete comment
  async delete(id: string) {
    try {
      await pb.collection('campaign_feedback').delete(id);
    } catch (error) {
      console.error('Error deleting campaign comment:', error);
      throw error;
    }
  }
};

// Leaderboard operations
export const leaderboardService = {
  // Get top supporters globally
  async getTopSupporters(limit = 10) {
    try {
      const records = await pb.collection('leaderboard_entries').getList(1, limit, {
        sort: '-total_funded'
      });
      return records.items as unknown as LeaderboardEntry[];
    } catch (error) {
      console.error('Error fetching top supporters:', error);
      return [];
    }
  },

  // Get supporter rank by address
  async getSupporterRank(supporterAddress: string) {
    try {
      const record = await pb.collection('leaderboard_entries').getFirstListItem(
        `supporter_address = "${supporterAddress}"`
      );
      return record as unknown as LeaderboardEntry;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      console.error('Error fetching supporter rank:', error);
      throw error;
    }
  },

  // Update or create leaderboard entry (called when supporter funds a campaign)
  async updateSupporter(supporterAddress: string, campaignAddress: string, amount: number) {
    try {
      // Get existing entry or create new one
      let entry = await this.getSupporterRank(supporterAddress);
      
      if (entry) {
        // Update existing entry
        const newTotal = entry.total_funded + amount;
        const newBadge = this.calculateBadge(newTotal);
        
        const updated = await pb.collection('leaderboard_entries').update(entry.id!, {
          total_funded: newTotal,
          campaign_count: entry.campaign_count + 1,
          badge_level: newBadge,
          last_updated: new Date().toISOString()
        });
        return updated as unknown as LeaderboardEntry;
      } else {
        // Create new entry
        const newEntry = await pb.collection('leaderboard_entries').create({
          supporter_address: supporterAddress,
          total_funded: amount,
          campaign_count: 1,
          badge_level: this.calculateBadge(amount),
          tier: 0,
          last_updated: new Date().toISOString()
        });
        return newEntry as unknown as LeaderboardEntry;
      }
    } catch (error) {
      console.error('Error updating supporter leaderboard:', error);
      throw error;
    }
  },

  // Calculate badge level based on total funded
  calculateBadge(totalFunded: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (totalFunded >= 10000) return 'platinum';
    if (totalFunded >= 5000) return 'gold';
    if (totalFunded >= 1000) return 'silver';
    return 'bronze';
  }
};