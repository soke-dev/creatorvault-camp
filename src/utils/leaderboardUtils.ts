import { pb, LeaderboardEntry, CampaignSupporter } from '@/lib/pocketbase';

/**
 * Aggregates data from campaign_supporters collection to build leaderboard entries
 * Groups supporters by address, calculates total funded and campaign count
 */
export async function getLeaderboardDataFromSupporters(): Promise<LeaderboardEntry[]> {
  try {
    // Fetch all supporter records (removed strict access_granted filter to debug)
    const supporters = await pb.collection('campaign_supporters').getFullList<CampaignSupporter>({
      sort: '-amount_funded'
    });

    if (!supporters || supporters.length === 0) {
      console.warn('[Leaderboard] No supporters found in campaign_supporters collection');
      return [];
    }

    console.log(`[Leaderboard] Found ${supporters.length} supporter records`);

    // Aggregate data by supporter address
    const supporterMap = new Map<string, {
      total_funded: number;
      campaigns: Set<string>;
    }>();

    supporters.forEach((supporter) => {
      const existing = supporterMap.get(supporter.supporter_address);
      
      if (existing) {
        existing.total_funded += supporter.amount_funded;
        existing.campaigns.add(supporter.campaign_address);
      } else {
        supporterMap.set(supporter.supporter_address, {
          total_funded: supporter.amount_funded,
          campaigns: new Set([supporter.campaign_address])
        });
      }
    });

    // Convert to LeaderboardEntry array and sort by total_funded
    const leaderboardEntries: LeaderboardEntry[] = Array.from(supporterMap.entries())
      .map(([address, data], index) => ({
        supporter_address: address,
        total_funded: data.total_funded,
        campaign_count: data.campaigns.size,
        badge_level: calculateBadgeLevel(data.total_funded),
        tier: index + 1 // Sequential tier based on sorted position
      }))
      .sort((a, b) => b.total_funded - a.total_funded)
      .map((entry, index) => ({
        ...entry,
        tier: index + 1 // Update tier after sorting
      }));

    console.log(`[Leaderboard] Generated ${leaderboardEntries.length} leaderboard entries`);
    return leaderboardEntries;
  } catch (error) {
    console.error('Error aggregating leaderboard data:', error);
    return [];
  }
}

/**
 * Calculates badge level based on total amount funded
 */
function calculateBadgeLevel(totalFunded: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (totalFunded >= 10000) return 'platinum';
  if (totalFunded >= 5000) return 'gold';
  if (totalFunded >= 1000) return 'silver';
  return 'bronze';
}

/**
 * Get a specific supporter's rank information
 */
export async function getSupporterRankFromData(supporterAddress: string): Promise<LeaderboardEntry | null> {
  try {
    const leaderboard = await getLeaderboardDataFromSupporters();
    const supporter = leaderboard.find(
      entry => entry.supporter_address.toLowerCase() === supporterAddress.toLowerCase()
    );
    return supporter || null;
  } catch (error) {
    console.error('Error fetching supporter rank:', error);
    return null;
  }
}

/**
 * Get top N supporters from the campaign_supporters collection
 */
export async function getTopSupportersFromCollection(limit = 10): Promise<LeaderboardEntry[]> {
  try {
    const leaderboard = await getLeaderboardDataFromSupporters();
    return leaderboard.slice(0, limit);
  } catch (error) {
    console.error('Error fetching top supporters:', error);
    return [];
  }
}

/**
 * Get supporters stats for a specific campaign
 */
export async function getCampaignSupportersStats(campaignAddress: string) {
  try {
    const supporters = await pb.collection('campaign_supporters').getFullList<CampaignSupporter>({
      filter: `campaign_address = "${campaignAddress}" && access_granted = true`,
      sort: '-amount_funded'
    });

    if (!supporters || supporters.length === 0) {
      return {
        totalRaised: 0,
        uniqueSupporters: 0,
        topSupporters: [],
        averageFunding: 0
      };
    }

    const totalRaised = supporters.reduce((sum, s) => sum + s.amount_funded, 0);
    const averageFunding = totalRaised / supporters.length;
    const topSupporters = supporters.slice(0, 5).map((s, index) => ({
      rank: index + 1,
      address: s.supporter_address,
      amount: s.amount_funded,
      badge: calculateBadgeLevel(s.amount_funded)
    }));

    return {
      totalRaised,
      uniqueSupporters: supporters.length,
      topSupporters,
      averageFunding
    };
  } catch (error) {
    console.error('Error fetching campaign supporters stats:', error);
    return {
      totalRaised: 0,
      uniqueSupporters: 0,
      topSupporters: [],
      averageFunding: 0
    };
  }
}

/**
 * Get all supporters of a campaign with detailed info
 */
export async function getCampaignSupporters(campaignAddress: string) {
  try {
    const supporters = await pb.collection('campaign_supporters').getFullList<CampaignSupporter>({
      filter: `campaign_address = "${campaignAddress}"`,
      sort: '-amount_funded'
    });

    return supporters.map((s, index) => ({
      rank: index + 1,
      address: s.supporter_address,
      amount: s.amount_funded,
      accessGranted: s.access_granted,
      badge: calculateBadgeLevel(s.amount_funded),
      createdAt: s.created,
      updatedAt: s.updated
    }));
  } catch (error) {
    console.error('Error fetching campaign supporters:', error);
    return [];
  }
}

/**
 * Export leaderboard data as CSV
 */
export async function exportLeaderboardAsCSV(): Promise<string> {
  try {
    const leaderboard = await getLeaderboardDataFromSupporters();
    
    // Header
    let csv = 'Rank,Address,Total Funded,Campaign Count,Badge Level\n';
    
    // Data rows
    leaderboard.forEach((entry) => {
      csv += `${entry.tier},"${entry.supporter_address}",${entry.total_funded},${entry.campaign_count},"${entry.badge_level}"\n`;
    });

    return csv;
  } catch (error) {
    console.error('Error exporting leaderboard:', error);
    return '';
  }
}
