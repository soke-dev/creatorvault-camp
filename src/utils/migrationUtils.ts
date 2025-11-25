import { campaignImageService, pb } from '../lib/pocketbase';

/**
 * Migration utility to convert existing image URL records to file-based storage
 * This will download existing S3 images and store them as files in PocketBase
 */

export async function migrateExistingImages() {
  try {
    devLog('[Migration] Starting migration of existing image URLs to files...');
    
    // Get all existing campaign image records
    const existingRecords = await campaignImageService.getAll();
    devLog(`[Migration] Found ${existingRecords.length} existing records`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const record of existingRecords) {
      try {
        // Skip if already has a file or no URL to migrate
        if (record.image_file || !record.image_url) {
          devLog(`[Migration] Skipping record ${record.id} - already has file or no URL`);
          continue;
        }
        
        devLog(`[Migration] Migrating record ${record.id} with URL: ${record.image_url.substring(0, 50)}...`);
        
        // Download the image as a file
        const filename = `migrated_${record.campaign_address}_${Date.now()}.jpg`;
        const imageFile = await campaignImageService.downloadImageAsFile(record.image_url, filename);
        
        if (imageFile) {
          // Update the record with the file using FormData
          const formData = new FormData();
          formData.append('image_file', imageFile);
          
          // Use PocketBase client directly for file update
          await pb.collection('campaign_images').update(record.id!, formData);
          
          devLog(`[Migration] Successfully migrated record ${record.id}`);
          migratedCount++;
        } else {
          console.error(`[Migration] Failed to download file for record ${record.id}`);
          errorCount++;
        }
        
        // Add a small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`[Migration] Error migrating record ${record.id}:`, error);
        errorCount++;
      }
    }
    
    devLog(`[Migration] Migration complete. Migrated: ${migratedCount}, Errors: ${errorCount}`);
    return { migratedCount, errorCount };
    
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw error;
  }
}

// Helper function to run migration via API endpoint
export async function runMigrationApi() {
  try {
    const response = await fetch('/api/migrate-images', {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Migration failed: ${response.status}`);
    }
    
    const result = await response.json();
    devLog('[Migration] API migration result:', result);
    return result;
  } catch (error) {
    console.error('[Migration] API migration error:', error);
    throw error;
  }
}
