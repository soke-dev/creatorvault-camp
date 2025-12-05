'use client';
import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { useActiveAccount, useSendTransaction } from 'thirdweb/react';
import { prepareTransaction, toWei } from 'thirdweb';
import { client } from '@/app/client';
import { chain } from '@/app/constants/chains';

const BOUNTY_WALLET_ADDRESS = '0x318787Ab7315c8d736A539a6C1bd8456f8266D47';

interface PromoteCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignAddress: string;
  campaignName: string;
  creatorAddress: string;
}

const platformIcons = {
  twitter: { icon: FaXTwitter, label: 'X (Twitter)', color: 'text-black dark:text-white' },
  tiktok: { icon: FaYoutube, label: 'TikTok', color: 'text-black dark:text-white' }, // Using FaYoutube as placeholder for TikTok
  youtube: { icon: FaYoutube, label: 'YouTube', color: 'text-red-600' },
};

export default function PromoteCampaignModal({
  isOpen,
  onClose,
  campaignAddress,
  campaignName,
  creatorAddress,
}: PromoteCampaignModalProps) {
  const { theme } = useTheme();
  const account = useActiveAccount();
  const { mutate: sendTransaction } = useSendTransaction();
  
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [rewardDescription, setRewardDescription] = useState('');
  const [activityPeriodEnd, setActivityPeriodEnd] = useState('');
  const [maxRecipients, setMaxRecipients] = useState('100');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSubmit = async () => {
    if (!depositAmount || selectedPlatforms.length === 0) {
      alert('Please fill in deposit amount and select at least one platform');
      return;
    }

    if (!account) {
      alert('Please connect your wallet first');
      return;
    }

    setIsSubmitting(true);
    setIsDepositing(true);
    
    try {
      // First, send CAMP to the bounty wallet
      const transaction = prepareTransaction({
        to: BOUNTY_WALLET_ADDRESS,
        value: toWei(depositAmount),
        chain: chain,
        client: client,
      });

      await new Promise((resolve, reject) => {
        sendTransaction(transaction, {
          onSuccess: (result) => {
            console.log('CAMP deposit successful:', result);
            resolve(result);
          },
          onError: (error) => {
            console.error('CAMP deposit failed:', error);
            reject(error);
          },
        });
      });

      setIsDepositing(false);

      // Then create the bounty record
      const response = await fetch('/api/bounties/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignAddress,
          creatorAddress,
          depositAmount: parseFloat(depositAmount),
          platforms: selectedPlatforms,
          rewardDescription,
          activityPeriodStart: new Date().toISOString(),
          activityPeriodEnd: activityPeriodEnd ? new Date(activityPeriodEnd).toISOString() : null,
          vestingSchedule: 'No vesting',
          maxRecipients: parseInt(maxRecipients),
          campaignName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onClose();
          // Reset form
          setDepositAmount('');
          setSelectedPlatforms([]);
          setRewardDescription('');
          setActivityPeriodEnd('');
          setMaxRecipients('100');
        }, 3000);
      } else {
        alert('Failed to create bounty: ' + data.error);
      }
    } catch (error: any) {
      console.error('Error creating bounty:', error);
      alert('Failed to create bounty: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
      setIsDepositing(false);
    }
  };

  return (
    <>
      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full p-8 border-2 border-green-500 animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Success Icon */}
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              {/* Success Message */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Bounty Created Successfully!
                </h3>
                <div className="space-y-2 text-gray-600 dark:text-gray-300">
                  <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                    {depositAmount} CAMP Deposited
                  </p>
                  <p className="text-sm">
                    Creators can now promote your campaign and earn rewards!
                  </p>
                </div>
              </div>

              {/* Platform Badges */}
              <div className="flex gap-2 flex-wrap justify-center pt-2">
                {selectedPlatforms.map((platform) => (
                  <span
                    key={platform}
                    className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-full"
                  >
                    {platformIcons[platform as keyof typeof platformIcons].label}
                  </span>
                ))}
              </div>

              {/* Auto-close indicator */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-blue-600 animate-[width_3s_linear]" style={{ animation: 'progressBar 3s linear forwards' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-t-3xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Promote Campaign</h2>
              <p className="text-purple-100 text-sm mt-1">{campaignName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Deposit Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Bounty Deposit Amount (CAMP) *
            </label>
            <input
              type="number"
              step="0.001"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.1"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This amount will be distributed to creators who promote your campaign
            </p>
          </div>

          {/* Select Platforms */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Select Promotion Platforms *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(platformIcons).map(([key, { icon: Icon, label, color }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePlatform(key)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    selectedPlatforms.includes(key)
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                  }`}
                >
                  <Icon className={`text-xl ${color}`} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
                  {selectedPlatforms.includes(key) && (
                    <svg className="w-5 h-5 text-purple-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Reward Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Bounty Description
            </label>
            <textarea
              value={rewardDescription}
              onChange={(e) => setRewardDescription(e.target.value)}
              placeholder="Describe your bounty instructions and how creators will be rewarded..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Activity Period End */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Campaign End Date
            </label>
            <input
              type="date"
              value={activityPeriodEnd}
              onChange={(e) => setActivityPeriodEnd(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Max Recipients */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Maximum Recipients
            </label>
            <input
              type="number"
              value={maxRecipients}
              onChange={(e) => setMaxRecipients(e.target.value)}
              placeholder="100"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-b-3xl border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !depositAmount || selectedPlatforms.length === 0}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isDepositing ? 'Depositing CAMP...' : isSubmitting ? 'Creating...' : 'Create Bounty'}
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
