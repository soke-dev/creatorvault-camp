'use client';
import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { SiTiktok } from 'react-icons/si';
import { useActiveAccount } from 'thirdweb/react';
import BountySubmissionModal from './BountySubmissionModal';

interface BountyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bounty: {
    id: string;
    campaign_address: string;
    campaign_name: string;
    creator_address: string;
    deposit_amount: number;
    platforms: string[];
    reward_description: string;
    activity_period_start: string;
    activity_period_end: string;
    max_recipients: number;
    current_recipients: number;
    status: string;
    campaign_image?: string;
  };
}

export default function BountyDetailsModal({ isOpen, onClose, bounty }: BountyDetailsModalProps) {
  const { theme } = useTheme();
  const account = useActiveAccount();
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlatformIcon = (platform: string) => {
    const lowerPlatform = platform.toLowerCase();
    if (lowerPlatform === 'twitter') return <FaXTwitter className="w-5 h-5" />;
    if (lowerPlatform === 'tiktok') return <SiTiktok className="w-5 h-5" />;
    if (lowerPlatform === 'youtube') return <FaYoutube className="w-5 h-5" />;
    return null;
  };

  const getPlatformColor = (platform: string) => {
    const lowerPlatform = platform.toLowerCase();
    if (lowerPlatform === 'twitter') return 'bg-black dark:bg-white text-white dark:text-black';
    if (lowerPlatform === 'tiktok') return 'bg-gradient-to-br from-cyan-400 via-pink-500 to-red-500 text-white';
    if (lowerPlatform === 'youtube') return 'bg-red-600 text-white';
    return 'bg-gray-500 text-white';
  };

  const rewardPerCreator = bounty.max_recipients > 0 
    ? (bounty.deposit_amount / bounty.max_recipients).toFixed(4)
    : bounty.deposit_amount.toFixed(4);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-300">
          
          {/* Header with Campaign Image */}
          <div className="relative h-32 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-t-2xl overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-80 h-80 bg-pink-500 rounded-full blur-3xl"></div>
            </div>
            
            {bounty.campaign_image && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm">
                <img 
                  src={bounty.campaign_image} 
                  alt={bounty.campaign_name}
                  className="w-full h-full object-cover opacity-60"
                />
              </div>
            )}
            
            <div className="absolute top-4 right-4">
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-300 hover:rotate-90"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {bounty.campaign_image ? (
                    <img
                      src={bounty.campaign_image}
                      alt={bounty.campaign_name}
                      className="w-14 h-14 rounded-xl border-2 border-white dark:border-gray-800 shadow-xl object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-xl border-2 border-white dark:border-gray-800 shadow-xl flex items-center justify-center">
                      <span className="text-xl font-black text-purple-600">{bounty.campaign_name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-black text-white mb-0.5 drop-shadow-lg">{bounty.campaign_name}</h2>
                    <p className="text-xs text-white/90 font-mono">
                      {bounty.creator_address.slice(0, 8)}...{bounty.creator_address.slice(-6)}
                    </p>
                  </div>
                </div>
                <a
                  href={`/campaign/${bounty.campaign_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-white font-semibold text-xs transition-all duration-300 hover:scale-105 border border-white/30 flex items-center gap-1.5"
                >
                  View Campaign
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            
            {/* Reward Pool Section */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-purple-700 dark:text-purple-400 font-bold mb-1">
                    💰 Total Reward Pool
                  </p>
                  <p className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400">
                    {bounty.deposit_amount} CAMP
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-0.5">
                    Per Creator
                  </p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    ~{rewardPerCreator}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">CAMP</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-purple-200 dark:border-purple-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {bounty.reward_description || `Promote ${bounty.campaign_name} on your social media and earn CAMP rewards!`}
                </p>
              </div>
            </div>

            {/* Platforms Required */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span>📱</span> Required Platforms
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {bounty.platforms.map((platform) => (
                  <div
                    key={platform}
                    className={`${getPlatformColor(platform)} rounded-lg p-2.5 flex items-center gap-2 shadow-md hover:scale-105 transition-transform duration-300`}
                  >
                    {getPlatformIcon(platform)}
                    <span className="font-semibold text-sm capitalize">{platform}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">
                You must have at least one of these platforms connected to your wallet via Origin SDK to participate.
              </p>
            </div>

            {/* Campaign Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📅</span>
                  <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 font-bold">
                    Activity Period
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatDate(bounty.activity_period_start)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">to</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatDate(bounty.activity_period_end)}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">👥</span>
                  <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 font-bold">
                    Participants
                  </p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-gray-900 dark:text-white">
                    {bounty.current_recipients || 0}
                  </p>
                  <p className="text-lg text-gray-500 dark:text-gray-500 font-bold">
                    / {bounty.max_recipients}
                  </p>
                </div>
                <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${((bounty.current_recipients || 0) / bounty.max_recipients) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-full font-bold text-sm ${
                bounty.status === 'active' 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
              }`}>
                {bounty.status === 'active' ? '✅ Active' : '⏸️ Inactive'}
              </div>
              {(bounty.current_recipients || 0) >= bounty.max_recipients && (
                <div className="px-4 py-2 rounded-full font-bold text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                  🔒 Spots Filled
                </div>
              )}
            </div>

            {/* Requirements */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 rounded-r-xl p-4">
              <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                How to Participate
              </h4>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Connect your wallet and verify social accounts via Origin SDK</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Create content promoting the campaign on required platforms</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Submit your promotion links for verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Receive CAMP rewards once approved by campaign owner</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Action */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 rounded-b-2xl">
            <button
              onClick={() => {
                if (!account) {
                  alert('Please connect your wallet first');
                  return;
                }
                if ((bounty.current_recipients || 0) >= bounty.max_recipients) {
                  alert('Sorry, all spots have been filled for this bounty');
                  return;
                }
                if (bounty.status !== 'active') {
                  alert('This bounty is not currently active');
                  return;
                }
                setShowSubmissionModal(true);
              }}
              disabled={!account || (bounty.current_recipients || 0) >= bounty.max_recipients || bounty.status !== 'active'}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              {!account ? 'Connect Wallet to Participate' : 
               (bounty.current_recipients || 0) >= bounty.max_recipients ? 'All Spots Filled' :
               bounty.status !== 'active' ? 'Bounty Inactive' :
               'Submit Your Promotion'}
            </button>
          </div>
        </div>
      </div>

      {/* Submission Modal */}
      {showSubmissionModal && (
        <BountySubmissionModal
          isOpen={showSubmissionModal}
          onClose={() => setShowSubmissionModal(false)}
          bounty={bounty}
        />
      )}
    </>
  );
}
