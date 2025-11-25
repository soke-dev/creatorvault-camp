import { NextRequest, NextResponse } from 'next/server';
import { campaignSupporterService } from '@/lib/pocketbase';

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignAddress: string; walletAddress: string } }
) {
  try {
    const { campaignAddress, walletAddress } = params;
    
    if (!campaignAddress || !walletAddress) {
      return NextResponse.json(
        { error: 'Campaign address and wallet address are required' },
        { status: 400 }
      );
    }

    devLog(`[API] Checking audio access for campaign: ${campaignAddress}, wallet: ${walletAddress}`);
    
    // Check if user has access to campaign audio
    const hasAccess = await campaignSupporterService.hasAudioAccess(campaignAddress, walletAddress);
    
    return NextResponse.json({
      success: true,
      hasAccess
    });

  } catch (error: any) {
    console.error(`[API] Error checking audio access:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check audio access',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignAddress: string; walletAddress: string } }
) {
  try {
    const { campaignAddress, walletAddress } = params;
    const body = await request.json();
    const { amountFunded } = body;
    
    if (!campaignAddress || !walletAddress || !amountFunded) {
      return NextResponse.json(
        { error: 'Campaign address, wallet address, and amount funded are required' },
        { status: 400 }
      );
    }

    devLog(`[API] Granting audio access for campaign: ${campaignAddress}, wallet: ${walletAddress}, amount: ${amountFunded}`);
    
    // Grant audio access to the supporter
    const supporterRecord = await campaignSupporterService.grantAudioAccess(
      campaignAddress, 
      walletAddress, 
      amountFunded
    );
    
    return NextResponse.json({
      success: true,
      supporter: supporterRecord
    });

  } catch (error: any) {
    console.error(`[API] Error granting audio access:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to grant audio access',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
