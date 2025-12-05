import { NextRequest, NextResponse } from 'next/server';
import { pb } from '@/lib/pocketbase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'active';
    const userAddress = searchParams.get('userAddress');

    let filter = `status = "${status}"`;
    
    // If user address is provided, filter bounties based on their connected platforms
    // This will be enhanced when we implement social connection checking
    
    // Fetch bounties from PocketBase
    const bounties = await pb.collection('bounties').getFullList({
      sort: '-created',
      filter: filter,
    });

    // For each bounty, fetch campaign image if available
    const bountiesWithImages = await Promise.all(
      bounties.map(async (bounty) => {
        try {
          const imageRecord = await pb.collection('campaign_images').getFirstListItem(
            `campaign_address = "${bounty.campaign_address}"`
          );
          
          let imageUrl = null;
          if (imageRecord) {
            // Prefer image_file over image_url
            if (imageRecord.image_file) {
              imageUrl = pb.files.getURL(imageRecord, imageRecord.image_file);
            } else if (imageRecord.image_url) {
              imageUrl = imageRecord.image_url;
            }
          }

          return {
            ...bounty,
            campaign_image: imageUrl
          };
        } catch (error) {
          // No image found, return bounty without image
          return {
            ...bounty,
            campaign_image: null
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      bounties: bountiesWithImages
    });
  } catch (error: any) {
    console.error('Error fetching bounties:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bounties' },
      { status: 500 }
    );
  }
}
