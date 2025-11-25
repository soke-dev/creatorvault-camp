import { NextRequest, NextResponse } from 'next/server';
import { campaignImageService } from '@/lib/pocketbase';
import { devLog } from '@/utils/debugLog';

// Simple in-memory cache to reduce PocketBase calls
const cache = new Map<string, { data: any; timestamp: number; }>();
const CACHE_DURATION = 1 * 60 * 1000; // 1 minute cache (reduced from 5 minutes for fresher URLs)

// Rate limiting to prevent overwhelming PocketBase
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW = 1000; // 1 second
const MAX_REQUESTS_PER_WINDOW = 2;

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Run cleanup every 5 minutes

function isRateLimited(campaignAddress: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(campaignAddress) || 0;
  
  if (now - lastRequest < RATE_LIMIT_WINDOW) {
    return true;
  }
  
  rateLimitMap.set(campaignAddress, now);
  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignAddress: string } }
) {
  try {
    const campaignAddress = params.campaignAddress;
    
    devLog(`[API] Fetching image for campaign: ${campaignAddress}`);
    
    if (!campaignAddress) {
      devLog('[API] Error: Campaign address is missing');
      return NextResponse.json(
        { error: 'Campaign address is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = cache.get(campaignAddress);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      devLog(`[API] Returning cached result for campaign: ${campaignAddress}`);
      return NextResponse.json(cached.data);
    }

    // Check rate limiting
    if (isRateLimited(campaignAddress)) {
      devLog(`[API] Rate limited for campaign: ${campaignAddress}`);
      return NextResponse.json(
        { error: 'Rate limited. Please try again in a moment.', campaignAddress },
        { status: 429 }
      );
    }

    const imageRecord = await campaignImageService.getByCampaignAddress(campaignAddress);
    
    if (!imageRecord) {
      devLog(`[API] No image found for campaign: ${campaignAddress}`);
      const notFoundResponse = {
        error: 'No image found for this campaign', 
        campaignAddress,
        fallback: true
      };
      
      // Cache the not found result briefly to prevent spam
      cache.set(campaignAddress, {
        data: notFoundResponse,
        timestamp: Date.now()
      });
      
      return NextResponse.json(notFoundResponse, { status: 404 });
    }

    devLog(`[API] Image found for campaign: ${campaignAddress}`);
    
    // Determine the best image URL to use
    let imageUrl = imageRecord.image_url;
    
    // If we have a file stored in PocketBase, prefer that over external URLs
    if (imageRecord.image_file) {
      const fileUrl = campaignImageService.getFileUrl(imageRecord);
      if (fileUrl) {
        devLog(`[API] Using PocketBase file URL: ${fileUrl}`);
        imageUrl = fileUrl;
      }
    }
    
    // For AWS S3 URLs, check if they might be expired and suggest immediate proxy use
    let suggestProxy = false;
    if (imageUrl && imageUrl.includes('amazonaws.com')) {
      devLog(`[API] AWS S3 URL detected - suggesting proxy to avoid expiration/CORS issues`);
      suggestProxy = true;
    }
    
    const successResponse = {
      success: true, 
      data: {
        image_url: imageUrl,
        campaign_address: imageRecord.campaign_address,
        creator_address: imageRecord.creator_address,
        has_file: !!imageRecord.image_file,
        suggest_proxy: suggestProxy, // Frontend can use this to decide whether to proxy immediately
        file_url: imageRecord.image_file ? 
          campaignImageService.getFileUrl(imageRecord) 
          : null
      }
    };

    // Cache the successful result
    cache.set(campaignAddress, {
      data: successResponse,
      timestamp: Date.now()
    });
    
    return NextResponse.json(
      successResponse,
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400', // 5 minutes cache
        }
      }
    );
  } catch (error) {
    console.error(`[API] Error fetching campaign image for ${params?.campaignAddress}:`, error);
    
    // Provide more detailed error information
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        campaignAddress: params?.campaignAddress,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
