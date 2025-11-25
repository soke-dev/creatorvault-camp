'use client';

import { useEffect, useState } from 'react';
import { LeaderboardEntry } from '@/lib/pocketbase';
import { getTopSupportersFromCollection } from '@/utils/leaderboardUtils';
import { FaTrophy } from 'react-icons/fa';

export const Leaderboard: React.FC<{ limit?: number }> = ({ limit = 10 }) => {
  const [topSupporters, setTopSupporters] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        const supporters = await getTopSupportersFromCollection(limit);
        setTopSupporters(supporters);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [limit]);

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'platinum':
        return '💎';
      case 'gold':
        return '🥇';
      case 'silver':
        return '🥈';
      case 'bronze':
        return '🥉';
      default:
        return '⭐';
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
    );
  }

  if (topSupporters.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🏆</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Supporters</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No supporters yet</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🏆</span>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Supporters</h3>
      </div>

      <div className="space-y-1.5">
        {topSupporters.slice(0, 3).map((supporter, index) => (
          <div
            key={supporter.id}
            className={`relative overflow-hidden rounded-lg px-3 py-2 flex items-center justify-between text-xs font-medium
              ${index === 0 ? 'bg-gradient-to-r from-yellow-600 to-yellow-700' : ''}
              ${index === 1 ? 'bg-gradient-to-r from-gray-600 to-gray-700' : ''}
              ${index === 2 ? 'bg-gradient-to-r from-amber-700 to-amber-800' : ''}
            `}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-gray-100 font-bold flex-shrink-0">{index + 1}.</span>
              <span className="text-gray-100 truncate">
                {supporter.supporter_address.slice(0, 6)}...{supporter.supporter_address.slice(-3)}
              </span>
              <span className="text-xs flex-shrink-0">{getBadgeIcon(supporter.badge_level)}</span>
            </div>
            <span className="text-gray-100 whitespace-nowrap flex-shrink-0 ml-2">
              ${(supporter.total_funded / 1e6).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
