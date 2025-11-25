import { NextRequest, NextResponse } from 'next/server';
import { campaignImageService } from '@/lib/pocketbase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const campaignAddress = formData.get('campaignAddress') as string;
    const creatorAddress = formData.get('creatorAddress') as string;
    const imageUrl = formData.get('imageUrl') as string;
    const imageFile = formData.get('imageFile') as File;

    if (!campaignAddress || !creatorAddress) {
      return NextResponse.json(
        { error: 'Campaign address and creator address are required' },
        { status: 400 }
      );
    }

    devLog(`[API] Processing image upload for campaign: ${campaignAddress}`);

    let result;

    if (imageUrl) {
      // Download from URL and store as file (primary method for new campaigns)
      devLog(`[API] Processing URL download and storage: ${imageUrl}`);
      result = await campaignImageService.createWithImageFile({
        campaign_address: campaignAddress,
        creator_address: creatorAddress
      }, imageUrl);
    } else {
      return NextResponse.json(
        { error: 'Image URL is required for new campaign creation' },
        { status: 400 }
      );
    }

    devLog(`[API] Successfully stored image for campaign: ${campaignAddress}`);

    return NextResponse.json({
      success: true,
      data: {
        campaign_address: result.campaign_address,
        file_url: campaignImageService.getFileUrl(result),
        has_file: !!result.image_file,
        record_id: result.id
      }
    });

  } catch (error) {
    console.error('[API] Error uploading campaign image:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Handle CORS for browser uploads
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
