import { NextRequest, NextResponse } from 'next/server';
import { pb } from '@/lib/pocketbase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      campaignAddress,
      creatorAddress,
      depositAmount,
      platforms, // ['twitter', 'telegram', 'discord', 'instagram', 'youtube']
      rewardDescription,
      activityPeriodStart,
      activityPeriodEnd,
      vestingSchedule,
      maxRecipients,
      campaignName
    } = body;

    // Validate required fields
    if (!campaignAddress || !creatorAddress || !depositAmount || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create bounty record in PocketBase
    const bountyRecord = await pb.collection('bounties').create({
      campaign_address: campaignAddress,
      creator_address: creatorAddress,
      deposit_amount: depositAmount,
      platforms: platforms, // Array of platform names
      reward_description: rewardDescription || `Promote ${campaignName} and earn rewards!`,
      activity_period_start: activityPeriodStart || new Date().toISOString(),
      activity_period_end: activityPeriodEnd,
      vesting_schedule: vestingSchedule || 'No vesting',
      max_recipients: maxRecipients || 100,
      campaign_name: campaignName,
      status: 'active',
      current_recipients: 0
    });

    return NextResponse.json({
      success: true,
      bounty: bountyRecord
    });
  } catch (error: any) {
    console.error('Error creating bounty:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create bounty' },
      { status: 500 }
    );
  }
}
