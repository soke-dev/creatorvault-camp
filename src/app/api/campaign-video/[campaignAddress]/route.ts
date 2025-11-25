import { NextRequest, NextResponse } from 'next/server';
import { campaignVideoService } from '@/lib/pocketbase';

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignAddress: string } }
) {
  try {
    const { campaignAddress } = params;
    
    if (!campaignAddress) {
      return NextResponse.json(
        { error: 'Campaign address is required' },
        { status: 400 }
      );
    }

    const videoRecord = await campaignVideoService.getByCampaignAddress(campaignAddress);
    
    if (!videoRecord) {
      return NextResponse.json(
        { error: 'Video not found for this campaign' },
        { status: 404 }
      );
    }

    return NextResponse.json(videoRecord);
  } catch (error) {
    console.error('Error fetching campaign video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign video' },
      { status: 500 }
    );
  }
}
