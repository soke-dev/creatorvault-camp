import { NextRequest, NextResponse } from 'next/server';
import { campaignAudioService } from '@/lib/pocketbase';
import { devLog } from '@/utils/debugLog';

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

    devLog(`[API] Fetching audio for campaign: ${campaignAddress}`);
    
    // Fetch audio from PocketBase
    const audioRecord = await campaignAudioService.getByCampaignAddress(campaignAddress);
    
    if (!audioRecord) {
      return NextResponse.json(
        { error: 'No audio found for this campaign' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      audio: audioRecord
    });

  } catch (error: any) {
    console.error(`[API] Error fetching campaign audio:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch campaign audio',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
