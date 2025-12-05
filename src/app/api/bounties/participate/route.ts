import { NextRequest, NextResponse } from 'next/server';
import { pb } from '@/lib/pocketbase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      bountyId,
      creatorAddress,
      platforms, // User's connected platforms
      promotionLinks // Links to their promotional content
    } = body;

    // Validate required fields
    if (!bountyId || !creatorAddress || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch the bounty
    const bounty = await pb.collection('bounties').getOne(bountyId);

    // Check if bounty is still active
    if (bounty.status !== 'active') {
      return NextResponse.json(
        { error: 'Bounty is not active' },
        { status: 400 }
      );
    }

    // Check if user has required platforms
    const requiredPlatforms = bounty.platforms || [];
    const hasRequiredPlatform = requiredPlatforms.some((platform: string) => 
      platforms.includes(platform)
    );

    if (!hasRequiredPlatform) {
      return NextResponse.json(
        { error: 'You need to connect at least one required platform' },
        { status: 400 }
      );
    }

    // Check if user already participated
    const existingParticipation = await pb.collection('bounty_participations').getFullList({
      filter: `bounty_id = "${bountyId}" && creator_address = "${creatorAddress}"`
    });

    if (existingParticipation.length > 0) {
      return NextResponse.json(
        { error: 'You have already participated in this bounty' },
        { status: 400 }
      );
    }

    // Create participation record
    const participation = await pb.collection('bounty_participations').create({
      bounty_id: bountyId,
      creator_address: creatorAddress,
      platforms: platforms,
      promotion_links: promotionLinks || [],
      status: 'pending', // pending, approved, rejected
      created: new Date().toISOString()
    });

    // Update bounty recipient count
    await pb.collection('bounties').update(bountyId, {
      current_recipients: (bounty.current_recipients || 0) + 1
    });

    return NextResponse.json({
      success: true,
      participation: participation
    });
  } catch (error: any) {
    console.error('Error participating in bounty:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to participate in bounty' },
      { status: 500 }
    );
  }
}
