import { NextRequest, NextResponse } from 'next/server';

const BOUNTY_WALLET_ADDRESS = '0x5BCC254Baa2e7974598a77404Ac4Ca51fd401A0d';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      amount,
      campaignAddress,
      creatorAddress,
    } = body;

    // Validate required fields
    if (!amount || !campaignAddress || !creatorAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, campaignAddress, creatorAddress' },
        { status: 400 }
      );
    }

    // Validate amount
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid deposit amount' },
        { status: 400 }
      );
    }

    // Return success with deposit info
    // The actual ETH transfer will be handled by the frontend wallet
    return NextResponse.json({
      success: true,
      message: 'Deposit instruction created',
      depositAddress: BOUNTY_WALLET_ADDRESS,
      amount: depositAmount,
      campaignAddress,
      // In production, you would create a transaction here
      // For now, we're just tracking the deposit intent
    });
  } catch (error: any) {
    console.error('Error processing deposit:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process deposit' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch bounty wallet balance
export async function GET(req: NextRequest) {
  try {
    // In a real implementation, you would query the blockchain for the wallet balance
    // For now, return the address
    return NextResponse.json({
      success: true,
      address: BOUNTY_WALLET_ADDRESS,
      message: 'Bounty wallet address retrieved'
    });
  } catch (error: any) {
    console.error('Error fetching bounty wallet:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bounty wallet' },
      { status: 500 }
    );
  }
}
