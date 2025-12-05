'use client';
import { useState, useEffect } from 'react';
import { useTheme } from "@/contexts/ThemeContext";
import { useActiveAccount } from 'thirdweb/react';
import Link from 'next/link';
import { FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { SiTiktok } from 'react-icons/si';
import BountyDetailsModal from '@/components/BountyDetailsModal';
import CreateBountyModal from '@/components/CreateBountyModal';

interface BountyCard {
  id: string;
  campaign_address: string;
  campaign_name: string;
  creator_address: string;
  deposit_amount: number;
  platforms: string[];
  reward_description: string;
  activity_period_start: string;
  activity_period_end: string;
  vesting_schedule: string;
  max_recipients: number;
  current_recipients: number;
  status: string;
  campaign_image?: string;
  created: string;
}

export default function BountyPage() {
  const { theme } = useTheme();
  const account = useActiveAccount();
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentView, setCurrentView] = useState('active');
  const [bounties, setBounties] = useState<BountyCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBounty, setSelectedBounty] = useState<BountyCard | null>(null);
  const [stats, setStats] = useState({ activeBounties: 0, totalRewards: 0, finishedBounties: 0 });
  const [sortBy, setSortBy] = useState<'default' | 'high-to-low' | 'low-to-high'>('default');
  const [showCreateBounty, setShowCreateBounty] = useState(false);
  
  const filters = ['All', 'Twitter', 'TikTok', 'YouTube'];

  useEffect(() => {
    const loadBounties = async () => {
      setIsLoading(true);
      try {
        const status = currentView === 'active' ? 'active' : currentView === 'finished' ? 'completed' : 'active';
        const response = await fetch(`/api/bounties/list?status=${status}`);
        const data = await response.json();
        
        if (data.success) {
          setBounties(data.bounties);
        }
      } catch (error) {
        console.error('Error fetching bounties:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBounties();
  }, [currentView]);

  // Load all stats separately
  useEffect(() => {
    const loadStats = async () => {
      try {
        // Get active bounties
        const activeResponse = await fetch('/api/bounties/list?status=active');
        const activeData = await activeResponse.json();
        
        // Get finished bounties
        const finishedResponse = await fetch('/api/bounties/list?status=completed');
        const finishedData = await finishedResponse.json();
        
        console.log('Active data:', activeData);
        console.log('Finished data:', finishedData);
        
        if (activeData.success && finishedData.success) {
          const activeBounties = activeData.bounties?.length || 0;
          const finishedBounties = finishedData.bounties?.length || 0;
          const totalRewards = (activeData.bounties || []).reduce((sum: number, b: BountyCard) => sum + (b.deposit_amount || 0), 0);
          
          console.log('Setting stats:', { activeBounties, totalRewards, finishedBounties });
          setStats({ activeBounties, totalRewards, finishedBounties });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    
    loadStats();
  }, [currentView]); // Re-fetch stats when view changes

  const filteredBounties = bounties
    .filter(bounty => {
      if (activeFilter === 'All') return true;
      return bounty.platforms.some(p => p.toLowerCase() === activeFilter.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'high-to-low') {
        return b.deposit_amount - a.deposit_amount;
      } else if (sortBy === 'low-to-high') {
        return a.deposit_amount - b.deposit_amount;
      }
      return 0; // default order
    });

  const platformColors: Record<string, string> = {
    twitter: 'from-blue-400 to-blue-600',
    telegram: 'from-blue-500 to-cyan-500',
    discord: 'from-indigo-500 to-purple-500',
    instagram: 'from-pink-500 to-rose-500',
    youtube: 'from-red-500 to-red-600',
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 dark:from-purple-950 dark:via-blue-950 dark:to-indigo-950">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-80 h-80 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -right-10 w-96 h-96 bg-gradient-to-tl from-blue-500 to-cyan-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
                Create & Earn
              </h1>
              <p className="text-lg text-gray-200">
                Earn rewards by contributing to exciting projects
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowCreateBounty(true)}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Bounty
              </button>
              <div className="hidden sm:block">
                <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{stats.activeBounties}</p>
                    <p className="text-xs text-gray-300">Active</p>
                  </div>
                  <div className="w-px h-10 bg-white/30"></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{stats.totalRewards.toFixed(0)} CAMP</p>
                    <p className="text-xs text-gray-300">Total Rewards</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-3 flex-wrap">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-6 py-2 rounded-xl font-medium text-sm transition-all duration-300 ${
                  activeFilter === filter
                    ? 'bg-white text-purple-900 shadow-lg scale-105'
                    : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/20'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('active')}
              className={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                currentView === 'active'
                  ? 'text-purple-700 dark:text-purple-400 border-b-2 border-purple-700 dark:border-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Active <span className="ml-2 bg-purple-700 text-white text-xs px-2 py-1 rounded-full">{stats.activeBounties}</span>
            </button>
            <button
              onClick={() => setCurrentView('finished')}
              className={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                currentView === 'finished'
                  ? 'text-purple-700 dark:text-purple-400 border-b-2 border-purple-700 dark:border-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Finished <span className="ml-2 text-xs">{stats.finishedBounties}</span>
            </button>
          </div>
          
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'default' | 'high-to-low' | 'low-to-high')}
              className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium text-sm transition-all duration-300 hover:border-purple-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none cursor-pointer"
            >
              <option value="default">Default</option>
              <option value="high-to-low">Reward: High to Low</option>
              <option value="low-to-high">Reward: Low to High</option>
            </select>
          </div>
        </div>

        {/* Bounty Cards Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600"></div>
          </div>
        ) : filteredBounties.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-600 dark:text-gray-400">No bounties found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Create a campaign and promote it to get started!</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBounties.map((bounty, index) => {
            const gradients = [
              'from-purple-500 to-blue-500',
              'from-blue-500 to-cyan-500',
              'from-pink-500 to-purple-500',
              'from-orange-500 to-red-500',
              'from-green-500 to-emerald-500',
              'from-yellow-500 to-orange-500',
              'from-indigo-500 to-purple-500',
              'from-rose-500 to-pink-500'
            ];
            const gradient = gradients[index % gradients.length];
            
            return (
            <div
              key={bounty.id}
              onClick={() => setSelectedBounty(bounty)}
              className="group bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-200 dark:border-gray-700 hover:scale-[1.02] hover:border-purple-400 dark:hover:border-purple-500 relative cursor-pointer"
            >
              {/* Animated background glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
              
              {/* Card Header */}
              <div className="relative p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {bounty.campaign_image ? (
                      <img
                        src={bounty.campaign_image}
                        alt={bounty.campaign_name}
                        className="w-10 h-10 rounded-xl object-cover shadow-lg group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {bounty.campaign_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                        {bounty.campaign_name}
                      </h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {bounty.creator_address.slice(0, 6)}...{bounty.creator_address.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/campaign/${bounty.campaign_address}`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-1.5"
                  >
                    View
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Reward Pool */}
              <div className={`relative px-4 py-4 bg-gradient-to-br ${gradient}`}>
                <div className="absolute inset-0 bg-black/30 dark:bg-black/50"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl">💰</span>
                    <p className="text-xs uppercase tracking-wider text-white/90 font-semibold">
                      REWARD POOL
                    </p>
                  </div>
                  <p className="text-3xl font-black text-white mb-2 leading-tight">
                    {bounty.deposit_amount.toFixed(3)} CAMP
                  </p>
                  <p className="text-xs text-white/80 line-clamp-2 leading-relaxed">
                    Help us reach more supporters! Post about our campaign on your social media, tag us, and earn your share of the reward pool.
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center gap-2">
                    <span className="text-base">👥</span> Participants
                  </span>
                  <span className="text-gray-900 dark:text-white font-bold">
                    {bounty.current_recipients || 0}/{bounty.max_recipients}
                  </span>
                </div>
                <div className="flex justify-between items-start text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center gap-2">
                    <span className="text-base">📅</span> Period
                  </span>
                  <span className="text-gray-900 dark:text-white font-semibold text-right text-xs">
                    {formatDate(bounty.activity_period_start)} - {formatDate(bounty.activity_period_end)}
                  </span>
                </div>
              </div>

              {/* Footer with Platforms */}
              <div className="px-4 pb-4">
                <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Required Platforms</span>
                    <div className="flex items-center gap-2">
                      {bounty.platforms.map((platform) => {
                        const lowerPlatform = platform.toLowerCase();
                        return (
                          <div key={platform} className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm transition-transform hover:scale-110 ${
                            lowerPlatform === 'twitter' ? 'bg-black dark:bg-white' :
                            lowerPlatform === 'tiktok' ? 'bg-gradient-to-br from-cyan-400 via-pink-500 to-red-500' :
                            lowerPlatform === 'youtube' ? 'bg-red-600' : 'bg-gray-500'
                          }`}>
                            {lowerPlatform === 'twitter' && <FaXTwitter className="w-3.5 h-3.5 text-white dark:text-black" />}
                            {lowerPlatform === 'tiktok' && <SiTiktok className="w-3.5 h-3.5 text-white" />}
                            {lowerPlatform === 'youtube' && <FaYoutube className="w-3.5 h-3.5 text-white" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Bounty Detail Modal */}
      {selectedBounty && (
        <BountyDetailsModal
          isOpen={!!selectedBounty}
          onClose={() => setSelectedBounty(null)}
          bounty={selectedBounty}
        />
      )}

      {/* Create Bounty Modal */}
      <CreateBountyModal
        isOpen={showCreateBounty}
        onClose={() => setShowCreateBounty(false)}
      />
    </main>
  );
}
