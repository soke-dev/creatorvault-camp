'use client';
import React, { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { recentActivitiesService, RecentActivity } from '@/lib/pocketbase';

interface NotificationCenterProps {
  creatorAddress?: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'funding':
      return (
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
        </div>
      );
    case 'contact_submission':
      return (
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        </div>
      );
    case 'nft_mint':
      return (
        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </div>
      );
    case 'campaign_creation':
      return (
        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
        </div>
      );
    case 'fund_claim':
      return (
        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
      );
  }
};

const getActivityMessage = (activity: RecentActivity) => {
  switch (activity.activity_type) {
    case 'funding':
      return `New supporter funded ${activity.tier_title || 'a tier'} with $${activity.amount?.toFixed(2) || '0'} USDT`;
    case 'contact_submission':
      return `Supporter submitted contact information for ${activity.campaign_name || 'your campaign'}`;
    case 'nft_mint':
      return `NFT receipt minted for supporter in ${activity.campaign_name || 'your campaign'}`;
    case 'campaign_creation':
      return `New campaign "${activity.campaign_name}" was created`;
    case 'fund_claim':
      return `Funds claimed from ${activity.campaign_name || 'campaign'}`;
    default:
      return activity.message || 'New activity';
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ creatorAddress }) => {
  const account = useActiveAccount();
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const targetAddress = creatorAddress || account?.address;

  useEffect(() => {
    const loadData = async () => {
      if (!targetAddress) return;
      
      setIsLoading(true);
      try {
        const [recentActivities, unreadActivities] = await Promise.all([
          recentActivitiesService.getByCreator(targetAddress, 20),
          recentActivitiesService.getUnreadByCreator(targetAddress)
        ]);
        
        setActivities(recentActivities);
        setUnreadCount(unreadActivities.length);
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [targetAddress]);

  const loadActivities = async () => {
    if (!targetAddress) return;
    
    setIsLoading(true);
    try {
      const recentActivities = await recentActivitiesService.getByCreator(targetAddress, 20);
      setActivities(recentActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!targetAddress) return;
    
    try {
      const unreadActivities = await recentActivitiesService.getUnreadByCreator(targetAddress);
      setUnreadCount(unreadActivities.length);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!targetAddress) return;
    
    try {
      await recentActivitiesService.markAllAsRead(targetAddress);
      setUnreadCount(0);
      // Update activities to mark them as read in the UI
      setActivities(prev => prev.map(activity => ({ ...activity, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  };

  if (!targetAddress) return null;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:text-purple-600 transition-colors duration-200"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5-10v-2a3 3 0 00-6 0v2L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Activities List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading activities...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5-10v-2a3 3 0 00-6 0v2L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-gray-500">No recent activity</p>
                <p className="text-gray-400 text-sm">Activities will appear here when supporters interact with your campaigns</p>
              </div>
            ) : (
              <div className="p-2">
                {activities.map((activity, index) => (
                  <div
                    key={activity.id || index}
                    className={`p-3 rounded-lg mb-2 transition-colors ${
                      !activity.is_read ? 'bg-purple-50 border border-purple-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {getActivityIcon(activity.activity_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 font-medium">
                          {getActivityMessage(activity)}
                        </p>
                        <div className="flex items-center mt-1 space-x-2">
                          <span className="text-xs text-gray-500">
                            {activity.supporter_address.slice(0, 6)}...{activity.supporter_address.slice(-4)}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(activity.created || '')}
                          </span>
                        </div>
                        {activity.campaign_name && (
                          <div className="mt-1">
                            <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                              {activity.campaign_name}
                            </span>
                          </div>
                        )}
                      </div>
                      {!activity.is_read && (
                        <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {activities.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={markAllAsRead}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
