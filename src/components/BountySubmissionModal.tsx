'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { SiTiktok } from 'react-icons/si';
import { useActiveAccount } from 'thirdweb/react';
import { useSocials, useAuth, CampModal, LinkButton } from "@campnetwork/origin/react";

interface BountySubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bounty: {
    id: string;
    campaign_address: string;
    campaign_name: string;
    platforms: string[];
    deposit_amount: number;
    max_recipients: number;
  };
}

interface SocialAccount {
  platform: string;
  username: string;
  verified: boolean;
}

type Socials = {
  twitter?: boolean;
  twitterUsername?: string;
  twitterHandle?: string;
  discord?: boolean;
  discordUsername?: string;
  spotify?: boolean;
  spotifyId?: string;
  tiktok?: boolean;
  tiktokUsername?: string;
  youtube?: boolean;
  youtubeUsername?: string;
};

export default function BountySubmissionModal({ isOpen, onClose, bounty }: BountySubmissionModalProps) {
  const { theme } = useTheme();
  const account = useActiveAccount();
  const { data: originSocials = {}, isLoading: socialsLoading } = useSocials() as { data: Socials; isLoading: boolean };
  const auth = useAuth();
  const [connectedSocials, setConnectedSocials] = useState<SocialAccount[]>([]);
  const [promotionLinks, setPromotionLinks] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [alreadyParticipated, setAlreadyParticipated] = useState(false);
  const [isCheckingParticipation, setIsCheckingParticipation] = useState(false);

  useEffect(() => {
    if (isOpen && account && !socialsLoading) {
      checkConnectedSocials();
      checkParticipation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, account, originSocials, socialsLoading]);

  const checkConnectedSocials = () => {
    try {
      // Origin SDK only provides boolean flags, no usernames
      const socialAccounts: SocialAccount[] = [];
      
      // Check Twitter
      if (originSocials?.twitter) {
        socialAccounts.push({
          platform: 'twitter',
          username: '✓ Verified',
          verified: true
        });
      }
      
      // Check TikTok
      if (originSocials?.tiktok) {
        socialAccounts.push({
          platform: 'tiktok',
          username: '✓ Verified',
          verified: true
        });
      }
      
      // Check YouTube
      if (originSocials?.youtube) {
        socialAccounts.push({
          platform: 'youtube',
          username: '✓ Verified',
          verified: true
        });
      }
      
      setConnectedSocials(socialAccounts);
    } catch (error) {
      console.error('Error checking connected socials:', error);
      setConnectedSocials([]);
    }
  };

  const checkParticipation = async () => {
    if (!account?.address || !bounty.id) return;
    
    setIsCheckingParticipation(true);
    try {
      const response = await fetch(`https://fairytale-web.pockethost.io/api/collections/bounty_participations/records?filter=(bounty_id="${bounty.id}" && wallet_address="${account.address}")`);
      const data = await response.json();
      setAlreadyParticipated(data.items && data.items.length > 0);
    } catch (error) {
      console.error('Error checking participation:', error);
      setAlreadyParticipated(false);
    } finally {
      setIsCheckingParticipation(false);
    }
  };

  const handleSubmit = async () => {
    // Validate that required platforms have links
    const missingLinks = bounty.platforms.filter(platform => {
      const hasConnected = connectedSocials.some(
        social => social.platform.toLowerCase() === platform.toLowerCase() && social.verified
      );
      return hasConnected && !promotionLinks[platform.toLowerCase()];
    });

    if (missingLinks.length > 0) {
      alert(`Please provide promotion links for: ${missingLinks.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/bounties/participate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bountyId: bounty.id,
          creatorAddress: account?.address,
          platforms: connectedSocials
            .filter(social => social.verified)
            .map(social => social.platform),
          promotionLinks: promotionLinks,
          socialAccounts: connectedSocials,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowSuccess(true);
        setAlreadyParticipated(true); // Update participation status
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else {
        alert(data.error || 'Submission failed');
      }
    } catch (error: any) {
      console.error('Error submitting participation:', error);
      alert('Failed to submit: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const getPlatformIcon = (platform: string) => {
    const lowerPlatform = platform.toLowerCase();
    if (lowerPlatform === 'twitter') return <FaXTwitter className="w-5 h-5" />;
    if (lowerPlatform === 'tiktok') return <SiTiktok className="w-5 h-5" />;
    if (lowerPlatform === 'youtube') return <FaYoutube className="w-5 h-5" />;
    return null;
  };

  const getPlatformColor = (platform: string) => {
    const lowerPlatform = platform.toLowerCase();
    if (lowerPlatform === 'twitter') return 'from-black to-gray-800';
    if (lowerPlatform === 'tiktok') return 'from-cyan-400 via-pink-500 to-red-500';
    if (lowerPlatform === 'youtube') return 'from-red-600 to-red-700';
    return 'from-gray-500 to-gray-600';
  };

  const hasRequiredPlatform = bounty.platforms.some(platform =>
    connectedSocials.some(
      social => social.platform.toLowerCase() === platform.toLowerCase() && social.verified
    )
  );

  const rewardAmount = bounty.max_recipients > 0 
    ? (bounty.deposit_amount / bounty.max_recipients).toFixed(4)
    : bounty.deposit_amount.toFixed(4);

  return (
    <>
      {/* Success Popup Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full p-8 border-2 border-green-500 animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-bounce">
                <FaCheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Submission Received! 🎉
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Your promotion is under review
                </p>
                <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                  Potential Reward: ~{rewardAmount} CAMP
                </p>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-blue-600 animate-progressBar" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-300">
          
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-t-2xl z-10">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-white mb-0.5">Submit Your Promotion</h2>
                <p className="text-purple-100 text-xs">{bounty.campaign_name}</p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-all hover:rotate-90 duration-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            
            {/* Already Participated Message */}
            {isCheckingParticipation ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-600"></div>
                <p className="ml-4 text-gray-600 dark:text-gray-400">Checking participation status...</p>
              </div>
            ) : alreadyParticipated ? (
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-8 text-center">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-4">
                      <FaCheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Already Submitted! 🎉
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You have already participated in this bounty. Your submission is being reviewed.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    The campaign owner will review all submissions and distribute rewards to the most engaging promotions.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:scale-105 transition-all duration-300 shadow-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Origin SDK Modal */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                  <CampModal />
                </div>

                {/* Social Account Verification */}
                <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span>🔐</span> Connected Social Accounts
              </h3>
              
              {socialsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-600"></div>
                  <p className="ml-4 text-gray-600 dark:text-gray-400">Verifying your connected accounts...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bounty.platforms.map((platform) => {
                    const connected = connectedSocials.find(
                      social => social.platform.toLowerCase() === platform.toLowerCase() && social.verified
                    );
                    
                    return (
                      <div
                        key={platform}
                        className={`rounded-xl p-4 border-2 transition-all duration-300 ${
                          connected
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                            : 'border-red-500 bg-red-50 dark:bg-red-950/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 bg-gradient-to-br ${getPlatformColor(platform)} rounded-lg flex items-center justify-center text-white shadow-lg`}>
                              {getPlatformIcon(platform)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white capitalize">{platform}</p>
                              {connected ? (
                                <p className="text-sm text-green-700 dark:text-green-400 font-mono">{connected.username}</p>
                              ) : (
                                <p className="text-sm text-red-700 dark:text-red-400">Not connected</p>
                              )}
                            </div>
                          </div>
                          {connected ? (
                            <FaCheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                          ) : (
                            <FaExclamationTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!socialsLoading && !hasRequiredPlatform && (
                <div className="mt-4 bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-yellow-500 rounded-r-xl p-4">
                  <div className="flex items-start gap-3">
                    <FaExclamationTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <p className="font-bold text-yellow-900 dark:text-yellow-300 mb-1">Action Required</p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        You need to connect at least one required platform via Origin SDK (see above) to participate in this bounty.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Promotion Links */}
            {hasRequiredPlatform && !socialsLoading && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span>🔗</span> Promotion Links
                </h3>
                <div className="space-y-4">
                  {bounty.platforms.map((platform) => {
                    const connected = connectedSocials.find(
                      social => social.platform.toLowerCase() === platform.toLowerCase() && social.verified
                    );
                    
                    if (!connected) return null;
                    
                    return (
                      <div key={platform}>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 capitalize flex items-center gap-2">
                          {getPlatformIcon(platform)}
                          {platform} Post URL *
                        </label>
                        <input
                          type="url"
                          value={promotionLinks[platform.toLowerCase()] || ''}
                          onChange={(e) => setPromotionLinks({
                            ...promotionLinks,
                            [platform.toLowerCase()]: e.target.value
                          })}
                          placeholder={`https://${platform.toLowerCase()}.com/...`}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Paste the link to your post promoting this campaign
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Guidelines */}
            {hasRequiredPlatform && !socialsLoading && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 rounded-r-xl p-4">
                <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Submission Guidelines
                </h4>
                <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Post must be public and visible to your followers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Include relevant campaign information and hashtags</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Keep your post live until campaign ends</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Campaign owner will review and approve submissions</span>
                  </li>
                </ul>
              </div>
            )}
              </>
            )}
          </div>

          {/* Footer - Only show if not already participated */}
          {!alreadyParticipated && !isCheckingParticipation && (
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-b-2xl border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !hasRequiredPlatform || socialsLoading}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Submit Promotion
                  </>
                )}
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </>
  );
}
