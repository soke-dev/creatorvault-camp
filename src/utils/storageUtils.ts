/**
 * Utility functions for safe localStorage operations
 */

/**
 * Safely stores funding data in localStorage
 * @param campaignAddress - The campaign contract address
 * @param userAddress - The user's wallet address  
 * @param tierName - Name of the funded tier
 * @param amount - Funding amount
 * @returns boolean indicating if storage was successful
 */
export function storeFundingData(
  campaignAddress: string,
  userAddress: string,
  tierName: string,
  amount: string
): boolean {
  try {
    // Store that user funded this campaign
    const fundingKey = `funded_${campaignAddress}_${userAddress}`;
    localStorage.setItem(fundingKey, 'true');
    
    // Store detailed funding information
    const detailsKey = `funding_details_${campaignAddress}_${userAddress}`;
    const fundingDetails = {
      tierName,
      amount,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(detailsKey, JSON.stringify(fundingDetails));
    
    return true;
  } catch (error) {
    console.error('Failed to store funding data in localStorage:', error);
    return false;
  }
}

/**
 * Retrieves funding data from localStorage
 * @param campaignAddress - The campaign contract address
 * @param userAddress - The user's wallet address
 * @returns funding details or null if not found
 */
export function getFundingData(campaignAddress: string, userAddress: string) {
  try {
    const detailsKey = `funding_details_${campaignAddress}_${userAddress}`;
    const storedData = localStorage.getItem(detailsKey);
    return storedData ? JSON.parse(storedData) : null;
  } catch (error) {
    console.error('Failed to retrieve funding data from localStorage:', error);
    return null;
  }
}