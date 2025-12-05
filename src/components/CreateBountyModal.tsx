'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useActiveAccount } from 'thirdweb/react';
import { useSocials, CampModal } from "@campnetwork/origin/react";
import { FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { SiTiktok } from 'react-icons/si';

interface CreateBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Socials = {
  twitter?: boolean;
  twitterUsername?: string;
  discord?: boolean;
  spotify?: boolean;
  tiktok?: boolean;
  youtube?: boolean;
};

export default function CreateBountyModal({ isOpen, onClose }: CreateBountyModalProps) {
  const { theme } = useTheme();
  const account = useActiveAccount();
  const { data: originSocials = {}, isLoading: socialsLoading } = useSocials() as { data: Socials; isLoading: boolean };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    bountyName: '',
    platforms: [] as string[],
    rewardAmount: '',
    maxRecipients: '',
    activityPeriodStart: '',
    activityPeriodEnd: '',
    vestingSchedule: '',
    description: ''
  });

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const handlePlatformToggle = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account?.address) {
      alert('Please connect your wallet');
      return;
    }

    if (!originSocials?.twitter) {
      alert('Please connect your Twitter account via Origin to create a bounty');
      return;
    }

    if (!imageFile) {
      alert('Please upload a bounty image');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload image first
      const imageFormData = new FormData();
      imageFormData.append('file', imageFile);
      imageFormData.append('bountyName', formData.bountyName);
      
      const uploadResponse = await fetch('/api/bounties/upload-image', {
        method: 'POST',
        body: imageFormData
      });
      
      const uploadData = await uploadResponse.json();
      
      if (!uploadData.success) {
        alert('Failed to upload image: ' + uploadData.error);
        return;
      }

      // Create bounty with image URL
      const response = await fetch('/api/bounties/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          bountyImage: uploadData.imageUrl,
          campaignAddress: account.address, // Use wallet address as campaign identifier
          creatorAddress: account.address,
          depositAmount: parseFloat(formData.rewardAmount),
          maxRecipients: parseInt(formData.maxRecipients)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Bounty created successfully!');
        onClose();
        window.location.reload();
      } else {
        alert('Failed to create bounty: ' + data.error);
      }
    } catch (error: any) {
      console.error('Error creating bounty:', error);
      alert('Failed to create bounty: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Create New Bounty</h2>
              <p className="text-sm text-white/80 mt-1">Incentivize creators to promote your campaign</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Origin SDK Modal */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-xl border border-purple-200 dark:border-purple-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-purple-900 dark:text-purple-300">Social Account Required</span>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-400 mb-3">
              Connect your Twitter account via Origin to create bounties
            </p>
            <CampModal />
            {!socialsLoading && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                {originSocials?.twitter ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-700 dark:text-green-400 font-medium">Twitter Connected ✓</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-red-700 dark:text-red-400 font-medium">Twitter Not Connected</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Bounty Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Bounty Name *
            </label>
            <input
              type="text"
              required
              value={formData.bountyName}
              onChange={(e) => setFormData({ ...formData, bountyName: e.target.value })}
              placeholder="e.g., Promote Our NFT Collection"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
            />
          </div>

          {/* Bounty Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Bounty Image *
            </label>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <div className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-green-500 transition-all text-center">
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {imageFile ? imageFile.name : 'Click to upload image'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  required
                />
              </label>
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="w-24 h-24 rounded-lg object-cover border-2 border-green-500" />
              )}
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Required Platforms *
            </label>
            <div className="flex gap-3">
              {[
                { name: 'Twitter', icon: <FaXTwitter className="w-5 h-5" />, color: 'bg-black dark:bg-white text-white dark:text-black' },
                { name: 'TikTok', icon: <SiTiktok className="w-5 h-5" />, color: 'bg-gradient-to-br from-cyan-400 via-pink-500 to-red-500 text-white' },
                { name: 'YouTube', icon: <FaYoutube className="w-5 h-5" />, color: 'bg-red-600 text-white' }
              ].map(platform => (
                <button
                  key={platform.name}
                  type="button"
                  onClick={() => handlePlatformToggle(platform.name)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all duration-300 ${
                    formData.platforms.includes(platform.name)
                      ? `${platform.color} border-transparent scale-105 shadow-lg`
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {platform.icon}
                    <span className={`font-semibold text-sm ${formData.platforms.includes(platform.name) ? '' : 'text-gray-700 dark:text-gray-300'}`}>
                      {platform.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Reward Amount & Max Recipients */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Total Reward (CAMP) *
              </label>
              <input
                type="number"
                step="0.001"
                required
                value={formData.rewardAmount}
                onChange={(e) => setFormData({ ...formData, rewardAmount: e.target.value })}
                placeholder="100"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Max Recipients *
              </label>
              <input
                type="number"
                required
                value={formData.maxRecipients}
                onChange={(e) => setFormData({ ...formData, maxRecipients: e.target.value })}
                placeholder="10"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Activity Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.activityPeriodStart}
                onChange={(e) => setFormData({ ...formData, activityPeriodStart: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                End Date *
              </label>
              <input
                type="date"
                required
                value={formData.activityPeriodEnd}
                onChange={(e) => setFormData({ ...formData, activityPeriodEnd: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Vesting Schedule */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Vesting Schedule *
            </label>
            <input
              type="text"
              required
              value={formData.vestingSchedule}
              onChange={(e) => setFormData({ ...formData, vestingSchedule: e.target.value })}
              placeholder="e.g., Immediate, 30 days, etc."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what creators need to do..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formData.platforms.length === 0}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                'Create Bounty'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
