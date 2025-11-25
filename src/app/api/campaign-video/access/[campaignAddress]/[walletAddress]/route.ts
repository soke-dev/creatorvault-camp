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

    const hasAccess = await campaignSupporterService.hasAudioAccess(campaignAddress, walletAddress);
    
    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error('Error checking video access:', error);
    return NextResponse.json(
      { error: 'Failed to check video access' },
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
    const { amountFunded } = await request.json();
    
    if (!campaignAddress || !walletAddress) {
      return NextResponse.json(
        { error: 'Campaign address and wallet address are required' },
        { status: 400 }
      );
    }

    if (!amountFunded || amountFunded <= 0) {
      return NextResponse.json(
        { error: 'Valid funding amount is required' },
        { status: 400 }
      );
    }

    await campaignSupporterService.grantAudioAccess(campaignAddress, walletAddress, amountFunded);
    
    return NextResponse.json({ success: true, message: 'Video access granted successfully' });
  } catch (error) {
    console.error('Error granting video access:', error);
    return NextResponse.json(
      { error: 'Failed to grant video access' },
      { status: 500 }
    );
  }
}
