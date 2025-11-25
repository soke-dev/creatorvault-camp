import { NextRequest, NextResponse } from 'next/server';
import { migrateExistingImages } from '@/utils/migrationUtils';

export async function POST(request: NextRequest) {
  try {
    const result = await migrateExistingImages();
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed',
      result
    });
  } catch (error) {
    console.error('[API] Migration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
