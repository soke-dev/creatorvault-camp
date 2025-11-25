'use client';
import { client } from "@/app/client";
import { CROWDFUNDING_FACTORY, CAMPAIGN_NFT_CONTRACT } from "@/app/constants/contracts";
import { MyCampaignCard } from "@/components/MyCampaignCard";
import { useState, useEffect } from "react";
import { getContract, prepareContractCall, sendTransaction, readContract } from "thirdweb";
import { chain } from "@/app/constants/chains";
import { CampModal, LinkButton, useSocials, useAuth } from "@campnetwork/origin/react";
import { deployPublishedContract } from "thirdweb/deploys";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { campaignImageService, CampaignImage, pb, campaignAudioService, campaignVideoService, campaignNFTService, campaignContactService, campaignFundingService, campaignSupporterService, recentActivitiesService } from "@/lib/pocketbase";
import { FaDiscord, FaSpotify } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { TwitterAPI, SpotifyAPI, } from "@campnetwork/origin";
import { useToast } from "@/components/Toast";
import Image from 'next/image';

// Add a type for socials
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
};

export default function DashboardPage() {
    const account = useActiveAccount();
    const { showSuccess, showError } = useToast();
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    
    // State for tracking wallet changes
    const [previousWalletAddress, setPreviousWalletAddress] = useState<string | undefined>(undefined);
    const [isWalletChanging, setIsWalletChanging] = useState<boolean>(false);
    
    // State for campaign management features
    const [selectedCampaignForContacts, setSelectedCampaignForContacts] = useState<string>('');
    const [selectedCampaignForDonors, setSelectedCampaignForDonors] = useState<string>('');
    const [contactSubmissions, setContactSubmissions] = useState<any[]>([]);
    const [campaignDonors, setCampaignDonors] = useState<any[]>([]);
    const [loadingContacts, setLoadingContacts] = useState<boolean>(false);
    const [loadingDonors, setLoadingDonors] = useState<boolean>(false);

    // Fetch linked social accounts with type safety
    const { data: socials = {}, isLoading: socialsLoading } = useSocials() as { data: Socials; isLoading: boolean };

    const contract = getContract({
        client: client,
        chain: chain,
        address: CROWDFUNDING_FACTORY,
    });

    // Get Campaigns
    const { data: myCampaigns, isLoading: isLoadingMyCampaigns, refetch } = useReadContract({
        contract: contract,
        method: "function getUserCampaigns(address _user) view returns ((address campaignAddress, address owner, string name, uint256 creationTime)[])",
        params: [account?.address as string]
    });

    const [twitterProfile, setTwitterProfile] = useState<{ userHandle?: string } | null>(null);
    const [spotifyProfile, setSpotifyProfile] = useState<{ id?: string; displayName?: string } | null>(null);
    const [tiktokProfile, setTiktokProfile] = useState<{ id?: string; nickname?: string } | null>(null);

    // Effect to detect wallet changes and clear social state
    useEffect(() => {
        const currentWalletAddress = account?.address;
        
        if (previousWalletAddress && currentWalletAddress && previousWalletAddress !== currentWalletAddress) {
            // Set wallet changing flag
            setIsWalletChanging(true);
            
            // Clear all social profile state
            setTwitterProfile(null);
            setSpotifyProfile(null);
            setTiktokProfile(null);
            
            // Show notification to user
            showSuccess(
                "Wallet Changed", 
                "Social verification has been reset for the new wallet. Please refresh if needed."
            );
            
            // Reset the flag after a short delay
            setTimeout(() => {
                setIsWalletChanging(false);
            }, 1000);
        }
        
        // Update the previous wallet address
        setPreviousWalletAddress(currentWalletAddress);
    }, [account?.address, previousWalletAddress, showSuccess]);

    // Manual refresh function for social verification
    const refreshSocialVerification = () => {
        setTwitterProfile(null);
        setSpotifyProfile(null);
        setTiktokProfile(null);
        setIsRefreshing(true);
        
        // Force a brief refresh state
        setTimeout(() => {
            setIsRefreshing(false);
        }, 1000);
        
        showSuccess("Refreshed", "Social verification data has been refreshed.");
    };

    useEffect(() => {
      const fetchTwitterProfile = async () => {
        // Skip fetching if we're in the middle of a wallet change or refresh
        if (isWalletChanging || isRefreshing) return;
        
        // Only fetch if we have valid socials for the current wallet
        if (socials?.twitter && account?.address && account?.address === previousWalletAddress) {
          const apiKey = process.env.NEXT_PUBLIC_CAMP_ORIGIN_API_KEY;
          if (!apiKey) {
            console.error('Camp Origin API key not found in environment variables');
            return;
          }
          const twitter = new TwitterAPI({ apiKey });
          // Fetch by wallet address
          const res = await twitter.fetchUserByWalletAddress(account.address, 1, 1) as { data?: { twitterUser?: { userHandle?: string } } };
          if (res?.data?.twitterUser?.userHandle) {
            setTwitterProfile(res.data.twitterUser);
          }
        }
      };
      fetchTwitterProfile();
    }, [socials?.twitter, account?.address, previousWalletAddress, isWalletChanging, isRefreshing]);

    useEffect(() => {
      const fetchSpotifyProfile = async () => {
        // Skip fetching if we're in the middle of a wallet change or refresh
        if (isWalletChanging || isRefreshing) return;
        
        // Only fetch if we have valid socials for the current wallet
        if (socials?.spotify && account?.address && account?.address === previousWalletAddress) {
          const apiKey = process.env.NEXT_PUBLIC_CAMP_ORIGIN_API_KEY;
          if (!apiKey) {
            console.error('Camp Origin API key not found in environment variables');
            return;
          }
          const spotify = new SpotifyAPI({ apiKey });
          const res = await spotify.fetchUserByWalletAddress(account.address) as { data?: { id?: string; displayName?: string } };
          if (res?.data) {
            setSpotifyProfile(res.data);
          }
        }
      };
      fetchSpotifyProfile();
    }, [socials?.spotify, account?.address, previousWalletAddress, isWalletChanging, isRefreshing]);

    // Function to fetch contact submissions for a specific campaign
    const fetchContactSubmissions = async (campaignAddress: string) => {
        if (!campaignAddress) return;
        
        setLoadingContacts(true);
        try {
            const contacts = await campaignContactService.getByCampaign(campaignAddress);
            setContactSubmissions(contacts);
        } catch (error) {
            console.error('Error fetching contact submissions:', error);
            setContactSubmissions([]);
        } finally {
            setLoadingContacts(false);
        }
    };

    // Function to fetch supporter data from PocketBase database
    const fetchCampaignDonors = async (campaignAddress: string) => {
        if (!campaignAddress) return;
        
        setLoadingDonors(true);
        try {
            // Fetch supporter data from PocketBase campaign_supporters collection
            const supporterRecords = await campaignSupporterService.getByCampaign(campaignAddress);

            // Calculate total funded from supporter records
            const totalFundedAmount = supporterRecords.reduce((sum, supporter) => {
                return sum + (supporter.amount_funded || 0);
            }, 0);

            // Transform supporter records into donor data format
            const donorData = supporterRecords.map((supporter: any) => ({
                walletAddress: supporter.supporter_address,
                amount: `$${supporter.amount_funded}`,
                fundedAt: supporter.created,
                transactionHash: supporter.transaction_hash || null,
                blockNumber: supporter.block_number || null,
                hasNFT: supporter.access_granted || false,
                tierName: 'Supporter', // Generic since campaign_supporters doesn't have tier details
                source: 'database'
            }));

            // Sort by most recent first
            donorData.sort((a, b) => new Date(b.fundedAt).getTime() - new Date(a.fundedAt).getTime());

            setCampaignDonors(donorData);
        } catch (error) {
            console.error('Error fetching campaign supporters:', error);
            setCampaignDonors([]);
        } finally {
            setLoadingDonors(false);
        }
    };

    // Effect to fetch contact submissions when campaign selection changes
    useEffect(() => {
        if (selectedCampaignForContacts) {
            fetchContactSubmissions(selectedCampaignForContacts);
        }
    }, [selectedCampaignForContacts]);

    // Effect to fetch donor data when campaign selection changes
    useEffect(() => {
        if (selectedCampaignForDonors) {
            fetchCampaignDonors(selectedCampaignForDonors);
        }
    }, [selectedCampaignForDonors]);

    
    return (
        <div className="min-h-screen bg-white dark:bg-gray-950">
            <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 pt-6 sm:pt-8 lg:pt-10 pb-12 sm:pb-16 lg:pb-20">
                {/* Social Verification Section */}
                <CampModal />
                <div className="mb-6 sm:mb-8">
                    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-[#e94560]" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Social Verification
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
                            <LinkButton social="twitter" />
                            <LinkButton social="discord" />
                            <LinkButton social="spotify" />
                            <LinkButton social="tiktok" />
                        </div>
                        <div className="bg-gradient-to-r from-[#e94560]/5 to-[#ff8c42]/5 dark:from-[#e94560]/10 dark:to-[#ff8c42]/10 rounded-lg p-3 sm:p-4 border border-[#e94560]/20 dark:border-[#e94560]/30">
                            {socialsLoading ? (
                                <div className="flex items-center justify-center py-3">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#e94560] border-t-transparent"></div>
                                    <span className="ml-3 text-gray-600 dark:text-gray-300 text-sm">Checking linked socials...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex items-center space-x-2">
                                        <FaXTwitter className="text-[#e94560] w-4 h-4" />
                                        <span className="text-sm font-medium dark:text-gray-200">
                                            Twitter: {socials?.twitter ? "✅ Linked" : "❌ Not linked"}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <FaDiscord className="text-indigo-500 dark:text-indigo-400 w-4 h-4" />
                                        <span className="text-sm font-medium dark:text-gray-200">
                                            Discord: {socials?.discord ? "✅ Linked" : "❌ Not linked"}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <FaSpotify className="text-green-600 dark:text-green-400 w-4 h-4" />
                                        <span className="text-sm font-medium dark:text-gray-200">
                                            Spotify: {socials?.spotify ? "✅ Linked" : "❌ Not linked"}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium dark:text-gray-200">
                                            TikTok: {socials?.tiktok ? "✅ Linked" : "❌ Not linked"}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dashboard Header */}
                <div className="flex flex-col gap-5 mb-8 sm:mb-10">
                    <div className="w-full">
                        <CampaignStatistics myCampaigns={myCampaigns} />
                    </div>
                    <div className="flex flex-col gap-3">
                        <button
                            className="w-full px-6 py-3.5 bg-gradient-to-r from-[#e94560] via-[#f45a06] to-[#ff8c42] text-white font-semibold text-base rounded-lg shadow-md hover:shadow-lg hover:scale-[1.01] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            onClick={() => setIsModalOpen(true)}
                            disabled={!socials?.twitter && !socials?.discord && !socials?.spotify}
                            title={
                                !socials?.twitter && !socials?.discord && !socials?.spotify
                                    ? "Link at least one social account to create your project"
                                    : ""
                            }
                        >
                            <svg className="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Create New Campaign
                        </button>
                        
                        {(!socials?.twitter && !socials?.discord && !socials?.spotify) && (
                            <div className="p-3 sm:p-4 bg-gradient-to-r from-[#e94560]/5 to-[#f45a06]/5 dark:from-[#e94560]/10 dark:to-[#f45a06]/10 border border-[#e94560]/20 dark:border-[#e94560]/30 rounded-lg">
                                <p className="text-sm text-[#e94560] dark:text-[#ff8c42] font-medium">
                                    💡 Connect to Camp Origin & Link at least one social account to create projects
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Campaign NFT Collection Section */}
                <CampaignNFTCollection />

                {/* My Campaigns Section */}
                <div className="mb-10 sm:mb-12">
                    <div className="flex items-center justify-between mb-5 sm:mb-6">
                        <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-50">My Campaigns</h2>
                        {isRefreshing && (
                            <div className="flex items-center space-x-2 text-xs sm:text-sm text-[#e94560] dark:text-[#ff8c42]">
                                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-[#e94560] border-t-transparent dark:border-[#ff8c42] dark:border-t-transparent"></div>
                                <span className="hidden sm:inline">Updating campaigns...</span>
                                <span className="sm:hidden">Updating...</span>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {!isLoadingMyCampaigns ? (
                            myCampaigns && myCampaigns.length > 0 ? (
                                myCampaigns.slice().reverse().map((campaign, index) => (
                                    <MyCampaignCard
                                        key={index}
                                        contractAddress={campaign.campaignAddress}
                                    />
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12 sm:py-16">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    <p className="text-lg sm:text-xl text-gray-800 dark:text-gray-200 font-semibold">No campaigns yet</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Create your first creative project to get started</p>
                                </div>
                            )
                        ) : (
                            <div className="col-span-full text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#e94560] border-t-transparent dark:border-[#ff8c42] dark:border-t-transparent mx-auto"></div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Loading campaigns...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Campaign Donors Section */}
                <CampaignDonorsSection campaigns={myCampaigns ? [...myCampaigns] : undefined} />

                {/* Supporter Contact Information Section */}
                <SupporterContactsSection campaigns={myCampaigns ? [...myCampaigns] : undefined} />

                {isModalOpen && (
                    <CreateCampaignModal
                        setIsModalOpen={setIsModalOpen}
                        refetch={refetch}
                        isRefreshing={isRefreshing}
                        setIsRefreshing={setIsRefreshing}
                        showSuccess={showSuccess}
                        showError={showError}
                    />
                )}
            </div>
        </div>
    );
}

type CreateCampaignModalProps = {
    setIsModalOpen: (value: boolean) => void;
    refetch: () => void;
    isRefreshing: boolean;
    setIsRefreshing: (value: boolean) => void;
    showSuccess: (title: string, message?: string) => void;
    showError: (title: string, message?: string) => void;
};

const CreateCampaignModal = ({ setIsModalOpen, refetch, isRefreshing, setIsRefreshing, showSuccess, showError }: CreateCampaignModalProps) => {
    const account = useActiveAccount();
    const auth = useAuth();
    const [isDeployingContract, setIsDeployingContract] = useState<boolean>(false);
    const [campaignName, setCampaignName] = useState<string>("");
    const [campaignDescription, setCampaignDescription] = useState<string>("");
    const [campaignGoal, setCampaignGoal] = useState<number>(1);
    const [campaignDeadline, setCampaignDeadline] = useState<number>(1);
    const [campaignCategory, setCampaignCategory] = useState<string>("");
    
    // Image selection states
    const [selectedImage, setSelectedImage] = useState<string>("");
    const [userImages, setUserImages] = useState<any[]>([]);
    const [isLoadingImages, setIsLoadingImages] = useState<boolean>(false);
    const [showImageSelector, setShowImageSelector] = useState<boolean>(false);
    
    // Audio selection states (for music category campaigns)
    const [selectedAudio, setSelectedAudio] = useState<string>("");
    const [selectedAudioTitle, setSelectedAudioTitle] = useState<string>("");
    const [userAudios, setUserAudios] = useState<any[]>([]);
    const [isLoadingAudios, setIsLoadingAudios] = useState<boolean>(false);
    const [showAudioSelector, setShowAudioSelector] = useState<boolean>(false);
    
    // Video selection states (for film/video category campaigns)
    const [selectedVideo, setSelectedVideo] = useState<string>("");
    const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>("");
    const [selectedVideoThumbnail, setSelectedVideoThumbnail] = useState<string>("");
    const [userVideos, setUserVideos] = useState<any[]>([]);
    const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);
    const [showVideoSelector, setShowVideoSelector] = useState<boolean>(false);
    
    const { data: userSocials = {}, isLoading: userSocialsLoading } = useSocials() as { data: Socials; isLoading: boolean };
    const [twitterProfile, setTwitterProfile] = useState<{ userHandle?: string } | null>(null);

    // Effect to clear modal's social state when account changes
    useEffect(() => {
        // Clear twitter profile when account changes to prevent stale data
        setTwitterProfile(null);
    }, [account?.address]);

    useEffect(() => {
        const fetchTwitterProfile = async () => {
            if (userSocials?.twitter && account?.address) {
                const apiKey = process.env.NEXT_PUBLIC_CAMP_ORIGIN_API_KEY;
                if (!apiKey) {
                    console.error('Camp Origin API key not found in environment variables');
                    return;
                }
                const twitter = new TwitterAPI({ apiKey });
                const res = await twitter.fetchUserByWalletAddress(account.address, 1, 1) as { data?: { twitterUser?: { userHandle?: string } } };
                if (res?.data?.twitterUser?.userHandle) {
                    setTwitterProfile(res.data.twitterUser);
                }
            }
        };
        fetchTwitterProfile();
    }, [userSocials?.twitter, account?.address]);

    const fetchUserImages = async () => {
        if (!auth?.isAuthenticated) {
            console.log("User not authenticated with Camp Origin");
            return;
        }
        
        setIsLoadingImages(true);
        try {
            // Use the Origin SDK to fetch user's uploads
            if (!auth.origin) {
                console.log("Origin SDK not available");
                setUserImages([]);
                setShowImageSelector(true);
                setIsLoadingImages(false);
                return;
            }
            const uploads = await auth.origin.getOriginUploads();
            console.log("User's Origin uploads:", uploads);
            
            if (uploads && uploads.length > 0) {
                // Transform the uploads data to match our expected format, filter for images only
                const transformedImages = uploads.map((upload: any) => ({
                    id: upload.tokenId?.toString() || upload.id,
                    name: upload.metadata?.name || upload.filename || `NFT #${upload.tokenId}`,
                    url: upload.url || upload.metadata?.image || upload.previewUrl,
                    tokenId: upload.tokenId?.toString(),
                    metadata: upload.metadata,
                    type: upload.metadata?.mimeType || upload.type || 'image'
                })).filter((item: any) => {
                    // Only include items with valid URLs and are images
                    return item.url && (
                        item.type.startsWith('image/') || 
                        item.url.includes('.jpg') || 
                        item.url.includes('.jpeg') || 
                        item.url.includes('.png') || 
                        item.url.includes('.gif') || 
                        item.url.includes('.webp')
                    );
                });
                
                setUserImages(transformedImages);
                setShowImageSelector(true);
            } else {
                console.log("No image uploads found");
                setUserImages([]);
                setShowImageSelector(true);
            }
        } catch (error) {
            console.error('Error fetching user images:', error);
            setUserImages([]);
            setShowImageSelector(true);
        } finally {
            setIsLoadingImages(false);
        }
    };

    const fetchUserAudios = async () => {
        if (!auth?.isAuthenticated) {
            console.log("User not authenticated with Camp Origin");
            return;
        }
        
        setIsLoadingAudios(true);
        try {
            // Use the Origin SDK to fetch user's uploads
            if (!auth.origin) {
                console.log("Origin SDK not available");
                setUserAudios([]);
                setShowAudioSelector(true);
                setIsLoadingAudios(false);
                return;
            }
            const uploads = await auth.origin.getOriginUploads();
            console.log("User's Origin uploads for audio:", uploads);
            
            if (uploads && uploads.length > 0) {
                // Transform the uploads data to match our expected format, filter for audio only
                const transformedAudios = uploads.map((upload: any) => ({
                    id: upload.tokenId?.toString() || upload.id,
                    name: upload.metadata?.name || upload.filename || `Audio #${upload.tokenId}`,
                    url: upload.url || upload.metadata?.audio || upload.previewUrl,
                    tokenId: upload.tokenId?.toString(),
                    metadata: upload.metadata,
                    type: upload.metadata?.mimeType || upload.type || 'audio',
                    duration: upload.metadata?.duration || upload.duration
                })).filter((item: any) => {
                    // Only include items with valid URLs and are audio files
                    return item.url && (
                        item.type.startsWith('audio/') || 
                        item.url.includes('.mp3') || 
                        item.url.includes('.wav') || 
                        item.url.includes('.ogg') || 
                        item.url.includes('.m4a') || 
                        item.url.includes('.flac')
                    );
                });
                
                setUserAudios(transformedAudios);
                setShowAudioSelector(true);
            } else {
                console.log("No audio uploads found");
                setUserAudios([]);
                setShowAudioSelector(true);
            }
        } catch (error) {
            console.error('Error fetching user audios:', error);
            setUserAudios([]);
            setShowAudioSelector(true);
        } finally {
            setIsLoadingAudios(false);
        }
    };

    const fetchUserVideos = async () => {
        if (!auth?.isAuthenticated) {
            console.log("User not authenticated with Camp Origin");
            return;
        }
        
        setIsLoadingVideos(true);
        try {
            // Use the Origin SDK to fetch user's uploads
            if (!auth.origin) {
                console.log("Origin SDK not available");
                setUserVideos([]);
                setShowVideoSelector(true);
                setIsLoadingVideos(false);
                return;
            }
            const uploads = await auth.origin.getOriginUploads();
            console.log("User's Origin uploads for video:", uploads);
            
            if (uploads && uploads.length > 0) {
                // Transform the uploads data to match our expected format, filter for video only
                const transformedVideos = uploads.map((upload: any) => ({
                    id: upload.tokenId?.toString() || upload.id,
                    name: upload.metadata?.name || upload.filename || `Video #${upload.tokenId}`,
                    url: upload.url || upload.metadata?.video || upload.previewUrl,
                    tokenId: upload.tokenId?.toString(),
                    metadata: upload.metadata,
                    type: upload.metadata?.mimeType || upload.type || 'video',
                    duration: upload.metadata?.duration || upload.duration,
                    thumbnail: upload.metadata?.thumbnail || upload.thumbnailUrl
                })).filter((item: any) => {
                    // Only include items with valid URLs and are video files
                    return item.url && (
                        item.type.startsWith('video/') || 
                        item.url.includes('.mp4') || 
                        item.url.includes('.avi') || 
                        item.url.includes('.mov') || 
                        item.url.includes('.wmv') || 
                        item.url.includes('.flv') ||
                        item.url.includes('.webm') ||
                        item.url.includes('.mkv')
                    );
                });
                
                setUserVideos(transformedVideos);
                setShowVideoSelector(true);
            } else {
                console.log("No video uploads found");
                setUserVideos([]);
                setShowVideoSelector(true);
            }
        } catch (error) {
            console.error('Error fetching user videos:', error);
            setUserVideos([]);
            setShowVideoSelector(true);
        } finally {
            setIsLoadingVideos(false);
        }
    };

    const handleDeployContract = async () => {
        setIsDeployingContract(true);
        try {
            console.log("=== CAMPAIGN CREATION DEBUG ===");
            console.log("Creating campaign...");
            console.log("Selected image:", selectedImage);
            console.log("Selected image length:", selectedImage?.length);
            console.log("Selected image type:", typeof selectedImage);
            console.log("Account address:", account?.address);
            console.log("User images array:", userImages);
            console.log("=== END DEBUG INFO ===");
            
            // Only include Twitter handle if user has verified Twitter connection AND we fetched the profile
            const descriptionWithTwitter = (userSocials?.twitter && twitterProfile?.userHandle) 
                ? `${campaignDescription}\n\n🐦 Verified Creator: @${twitterProfile.userHandle}`
                : campaignDescription;
            
            // Add category to description
            let fullDescription = `📂 Category: ${campaignCategory}\n\n${descriptionWithTwitter}`;
            
                console.log("=== STARTING CONTRACT DEPLOYMENT ===");
                console.log("Deployment parameters:", {
                    contractId: "Crowdfunding",
                    contractParams: [campaignName, fullDescription, campaignGoal, campaignDeadline],
                    publisher: "0x5BCC254Baa2e7974598a77404Ac4Ca51fd401A0d",
                    version: "1.0.9",
                    chain: chain.id,
                    account: account?.address
                });
                
                let contractAddress;
                try {
                    console.log("Attempting contract deployment...");
                    
                    // Deploy the contract using Thirdweb's deployPublishedContract
                    const deployedContract = await deployPublishedContract({
                        client: client,
                        chain: chain,
                        account: account!,
                        contractId: "Crowdfunding",
                        contractParams: [
                            campaignName,
                            fullDescription,
                            campaignGoal,
                            campaignDeadline
                        ],
                        publisher: "0x5BCC254Baa2e7974598a77404Ac4Ca51fd401A0d",
                        version: "1.0.9",
                    });
                    
                    console.log("Deployed contract:", deployedContract);
                    console.log("Deployed contract type:", typeof deployedContract);
                    
                    // Handle both string and object return types
                    if (typeof deployedContract === 'string') {
                        contractAddress = deployedContract;
                    } else if (deployedContract && typeof deployedContract === 'object') {
                        // Try to get address from contract object
                        contractAddress = (deployedContract as any).address || deployedContract;
                    } else {
                        contractAddress = deployedContract;
                    }
                    
                    console.log("Contract address extracted:", contractAddress);
                    
                    console.log("Final extracted contractAddress:", contractAddress);
                    console.log("=== CONTRACT DEPLOYMENT SUCCESSFUL ===");
                } catch (deployError: any) {
                    console.error("=== CONTRACT DEPLOYMENT FAILED ===");
                    console.error("Deployment error:", deployError);
                    console.error("Error details:", JSON.stringify(deployError, null, 2));
                    throw new Error(`Contract deployment failed: ${deployError.message || deployError}`);
                }

                console.log("Campaign deployed at:", contractAddress);
                console.log("Contract address type:", typeof contractAddress);
                
                // Use the contract address directly
                let contractAddressString: string;
                
                if (typeof contractAddress === 'string' && contractAddress.length > 0) {
                    contractAddressString = contractAddress;
                    console.log("Using extracted contract address:", contractAddressString);
                } else {
                    // Since the contract deployment is successful but we can't extract the address,
                    // let's try to get it from the campaign factory after deployment
                    console.warn("Could not extract contract address from deployment result");
                    console.log("Trying to get the latest campaign address from factory...");
                    
                    try {
                        // Wait a moment for the transaction to be mined
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // Get the latest campaign from the factory
                        const factoryContract = getContract({
                            client: client,
                            chain: chain,
                            address: CROWDFUNDING_FACTORY,
                        });
                        
                        const userCampaigns = await readContract({
                            contract: factoryContract,
                            method: "function getUserCampaigns(address _user) view returns ((address campaignAddress, address owner, string name, uint256 creationTime)[])",
                            params: [account?.address as string],
                        });
                        
                        console.log("User campaigns from factory:", userCampaigns);
                        
                        if (userCampaigns && userCampaigns.length > 0) {
                            // Get the most recent campaign (last in array)
                            const latestCampaign = userCampaigns[userCampaigns.length - 1];
                            contractAddressString = latestCampaign.campaignAddress;
                            console.log("Got latest campaign address from factory:", contractAddressString);
                        } else {
                            throw new Error("No campaigns found in factory");
                        }
                    } catch (factoryError) {
                        console.error("Failed to get address from factory:", factoryError);
                        
                        // As last resort, use dummy address as fallback
                        console.log("Using dummy address as fallback for image storage...");
                        contractAddressString = "0x" + Date.now().toString(16) + Math.random().toString(16).substring(2, 18);
                        console.log("Dummy contract address:", contractAddressString);
                    }
                }
                
                console.log("Contract address string:", contractAddressString);
                console.log("Contract address string type:", typeof contractAddressString);
                
                // Validate the contract address
                if (!contractAddressString || contractAddressString === 'undefined') {
                    console.error("ERROR: Contract address is undefined or invalid!");
                    throw new Error("Invalid contract address received from deployment");
                }

                // Store campaign image in PocketBase if one was selected
            if (selectedImage && account?.address) {
                try {
                    console.log("=== STORING IMAGE IN POCKETBASE ===");
                    console.log("Storing campaign image in PocketBase...");
                    console.log("Image URL to store:", selectedImage);
                    console.log("Campaign address:", contractAddressString);
                    console.log("Creator address:", account.address);
                    
                    // Validate all required fields before creating record
                    if (!contractAddressString) {
                        throw new Error("Contract address is required but is undefined");
                    }
                    if (!selectedImage) {
                        throw new Error("Image URL is required but is undefined");
                    }
                    if (!account?.address) {
                        throw new Error("Creator address is required but is undefined");
                    }
                    
                    const originalNFTId = userImages.find(img => img.url === selectedImage)?.tokenId;
                    console.log("Original NFT ID:", originalNFTId);
                    
                    // Create the record data
                    const recordData = {
                        campaign_address: contractAddressString,
                        image_url: selectedImage,
                        creator_address: account.address,
                        original_nft_id: originalNFTId || ""
                    };
                    
                    console.log("Record data to create:", recordData);
                    console.log("Record data types:", {
                        campaign_address: typeof recordData.campaign_address,
                        image_url: typeof recordData.image_url,
                        creator_address: typeof recordData.creator_address,
                        original_nft_id: typeof recordData.original_nft_id
                    });
                    
                    const imageRecord = await campaignImageService.createWithImageFile(recordData, selectedImage);
                    console.log("Campaign image stored in PocketBase:", imageRecord);
                    console.log("=== IMAGE STORAGE SUCCESSFUL ===");
                } catch (error) {
                    console.error("=== IMAGE STORAGE FAILED ===");
                    console.error("Failed to store campaign image:", error);
                    console.error("Error details:", error);
                    
                    // Try to get more specific error info
                    if (error instanceof Error) {
                        console.error("Error message:", error.message);
                        console.error("Error stack:", error.stack);
                    }
                    
                    // If it's a PocketBase error, try to get the response details
                    if ((error as any).response) {
                        console.error("Response status:", (error as any).status);
                        console.error("Response data:", (error as any).response);
                    }
                    
                    // Don't fail the entire campaign creation if image storage fails
                }
            } else {
                console.log("=== IMAGE STORAGE SKIPPED ===");
                console.log("No image selected or account not available");
                console.log("selectedImage:", selectedImage);
                console.log("selectedImage truthy?", !!selectedImage);
                console.log("account:", account?.address);
                console.log("account truthy?", !!account?.address);
            }
            
            // Store campaign audio in PocketBase if one was selected (for music category)
            if (selectedAudio && account?.address && campaignCategory === 'music') {
                try {
                    console.log("=== STORING AUDIO IN POCKETBASE ===");
                    console.log("Storing campaign audio in PocketBase...");
                    console.log("Audio URL to store:", selectedAudio);
                    console.log("Audio title:", selectedAudioTitle);
                    console.log("Campaign address:", contractAddressString);
                    console.log("Creator address:", account.address);
                    
                    // Validate all required fields before creating record
                    if (!contractAddressString) {
                        throw new Error("Contract address is required but is undefined");
                    }
                    if (!selectedAudio) {
                        throw new Error("Audio URL is required but is undefined");
                    }
                    if (!account?.address) {
                        throw new Error("Creator address is required but is undefined");
                    }
                    
                    const originalAudioNFTId = userAudios.find(audio => audio.url === selectedAudio)?.tokenId;
                    console.log("Original Audio NFT ID:", originalAudioNFTId);
                    
                    // Create the record data
                    const audioRecordData = {
                        campaign_address: contractAddressString,
                        audio_url: selectedAudio,
                        creator_address: account.address,
                        original_nft_id: originalAudioNFTId || "",
                        audio_title: selectedAudioTitle || "Campaign Audio",
                        audio_duration: userAudios.find(audio => audio.url === selectedAudio)?.duration || 0
                    };
                    
                    console.log("Audio record data to create:", audioRecordData);
                    
                    const audioRecord = await campaignAudioService.createWithAudioFile(audioRecordData, selectedAudio);
                    console.log("Campaign audio stored in PocketBase:", audioRecord);
                    console.log("=== AUDIO STORAGE SUCCESSFUL ===");
                } catch (error) {
                    console.error("=== AUDIO STORAGE FAILED ===");
                    console.error("Failed to store campaign audio:", error);
                    console.error("Error details:", error);
                    
                    // Try to get more specific error info
                    if (error instanceof Error) {
                        console.error("Error message:", error.message);
                        console.error("Error stack:", error.stack);
                    }
                    
                    // If it's a PocketBase error, try to get the response details
                    if ((error as any).response) {
                        console.error("Response status:", (error as any).status);
                        console.error("Response data:", (error as any).response);
                    }
                    
                    // Don't fail the entire campaign creation if audio storage fails
                }
            } else {
                console.log("=== AUDIO STORAGE SKIPPED ===");
                console.log("No audio selected or not music category");
                console.log("selectedAudio:", selectedAudio);
                console.log("campaignCategory:", campaignCategory);
            }
            
            // Store campaign video in PocketBase if one was selected (for film/video category)
            if (selectedVideo && account?.address && (campaignCategory === 'film' || campaignCategory === 'video')) {
                try {
                    console.log("=== STORING VIDEO IN POCKETBASE ===");
                    console.log("Storing campaign video in PocketBase...");
                    console.log("Video URL to store:", selectedVideo);
                    console.log("Video title:", selectedVideoTitle);
                    console.log("Video thumbnail:", selectedVideoThumbnail);
                    console.log("Campaign address:", contractAddressString);
                    console.log("Creator address:", account.address);
                    
                    // Validate all required fields before creating record
                    if (!contractAddressString) {
                        throw new Error("Contract address is required but is undefined");
                    }
                    if (!selectedVideo) {
                        throw new Error("Video URL is required but is undefined");
                    }
                    if (!account?.address) {
                        throw new Error("Creator address is required but is undefined");
                    }
                    
                    const originalVideoNFTId = userVideos.find(video => video.url === selectedVideo)?.tokenId;
                    console.log("Original Video NFT ID:", originalVideoNFTId);
                    
                    // Create the record data
                    const videoRecordData = {
                        campaign_address: contractAddressString,
                        video_url: selectedVideo,
                        creator_address: account.address,
                        original_nft_id: originalVideoNFTId || "",
                        video_title: selectedVideoTitle || "Campaign Video",
                        video_duration: userVideos.find(video => video.url === selectedVideo)?.duration || 0
                    };
                    
                    console.log("Video record data to create:", videoRecordData);
                    
                    const videoRecord = await campaignVideoService.createWithVideoFile(videoRecordData, selectedVideo, selectedVideoThumbnail);
                    console.log("Campaign video stored in PocketBase:", videoRecord);
                    console.log("=== VIDEO STORAGE SUCCESSFUL ===");
                } catch (error) {
                    console.error("=== VIDEO STORAGE FAILED ===");
                    console.error("Failed to store campaign video:", error);
                    console.error("Error details:", error);
                    
                    // Try to get more specific error info
                    if (error instanceof Error) {
                        console.error("Error message:", error.message);
                        console.error("Error stack:", error.stack);
                    }
                    
                    // If it's a PocketBase error, try to get the response details
                    if ((error as any).response) {
                        console.error("Response status:", (error as any).status);
                        console.error("Response data:", (error as any).response);
                    }
                    
                    // Don't fail the entire campaign creation if video storage fails
                }
            } else {
                console.log("=== VIDEO STORAGE SKIPPED ===");
                console.log("No video selected or not film/video category");
                console.log("selectedVideo:", selectedVideo);
                console.log("campaignCategory:", campaignCategory);
            }
            
            showSuccess(
                "🎉 Campaign Created Successfully!",
                "Your campaign has been deployed and will appear in your dashboard shortly. The page will refresh automatically to show your new campaign."
            );

            // Create activity record for campaign creation
            try {
                await recentActivitiesService.create({
                    campaign_address: contractAddressString,
                    supporter_address: account?.address as string,
                    creator_address: account?.address as string,
                    activity_type: 'campaign_creation',
                    campaign_name: campaignName,
                    message: `New campaign "${campaignName}" was created`,
                    is_read: false
                });
            } catch (error) {
                console.error('Failed to create campaign creation activity record:', error);
            }
        } catch (error) {
            console.error(error);
            showError("Campaign Creation Failed", "Failed to create campaign. Please try again.");
        } finally {
            setIsDeployingContract(false);
            setIsModalOpen(false);
            
            // Add a small delay to ensure blockchain state is updated before refetching
            setIsRefreshing(true);
            setTimeout(() => {
                refetch();
                console.log("Dashboard refreshed - new campaign should now appear");
                setIsRefreshing(false);
            }, 2000);
        }
    };

    const handleCampaignGoal = (value: number) => {
        setCampaignGoal(Math.max(value, 1));
    };

    const handleCampaignLengthChange = (value: number) => {
        setCampaignDeadline(Math.max(value, 1));
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-700 via-purple-600 to-purple-500 text-white p-6 rounded-t-2xl">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <span className="text-2xl">🚀</span>
                                Create New Campaign
                            </h2>
                            <p className="text-purple-100 text-sm mt-1">Launch your creative project and reach your goals</p>
                        </div>
                        <button
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                            onClick={() => setIsModalOpen(false)}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Social Status Card */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Connected Socials
                        </h3>
                        {userSocialsLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                                <span className="text-gray-600 dark:text-gray-300 text-sm">Checking connections...</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-3">
                                    {userSocials?.twitter && (
                                        <div className="flex items-center gap-2 px-3 py-1 bg-black text-white rounded-full text-sm">
                                            <FaXTwitter className="w-3 h-3" />
                                            <span>Twitter</span>
                                        </div>
                                    )}
                                    {userSocials?.discord && (
                                        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white rounded-full text-sm">
                                            <FaDiscord className="w-3 h-3" />
                                            <span>Discord</span>
                                        </div>
                                    )}
                                    {userSocials?.spotify && (
                                        <div className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-full text-sm">
                                            <FaSpotify className="w-3 h-3" />
                                            <span>Spotify</span>
                                        </div>
                                    )}
                                    {!userSocials?.twitter && !userSocials?.discord && !userSocials?.spotify && (
                                        <span className="text-gray-500 dark:text-gray-400 text-sm italic">No socials connected</span>
                                    )}
                                </div>
                                {twitterProfile?.userHandle && (
                                    <div className="bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-700 rounded-lg p-3">
                                        <p className="text-sm text-green-800 dark:text-green-200 font-medium flex items-center gap-2">
                                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            Verified Creator: @{twitterProfile.userHandle}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Main Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Campaign Name <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    placeholder="My Amazing Project"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <select 
                                    value={campaignCategory}
                                    onChange={(e) => setCampaignCategory(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    required
                                >
                                    <option value="">Choose your project type</option>
                                    <option value="music">🎵 Music</option>
                                    <option value="book">📚 Book/Literature</option>
                                    <option value="art">🎨 Art/Visual</option>
                                    <option value="film">🎬 Film/Video</option>
                                    <option value="game">🎮 Gaming</option>
                                    <option value="tech">💻 Technology</option>
                                    <option value="charity">❤️ Charity/Community</option>
                                    <option value="education">🎓 Education</option>
                                    <option value="fashion">👗 Fashion</option>
                                    <option value="food">🍕 Food/Beverage</option>
                                    <option value="health">🏥 Health/Wellness</option>
                                    <option value="other">🌟 Other/General Support</option>
                                </select>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Funding Goal <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">$</span>
                                    <input 
                                        type="number"
                                        value={campaignGoal}
                                        onChange={(e) => handleCampaignGoal(Number(e.target.value))}
                                        placeholder="1000"
                                        className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    />
                                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">USDT</span>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Campaign Duration <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        value={campaignDeadline}
                                        onChange={(e) => handleCampaignLengthChange(Number(e.target.value))}
                                        placeholder="30"
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    />
                                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">days</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Project Description <span className="text-red-500">*</span>
                        </label>
                        <textarea 
                            value={campaignDescription}
                            onChange={(e) => setCampaignDescription(e.target.value)}
                            placeholder="Tell potential supporters about your project, what makes it special, and how their funding will help..."
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{campaignDescription.length} characters</p>
                    </div>

                    {/* Media Selection Section */}
                    <div className="space-y-4">
                        {/* Image Selection - Always shown and Required */}
                        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        Campaign Image
                                        <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">Required</span>
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">Cover image to attract supporters</p>
                                </div>
                            </div>
                            
                            {selectedImage ? (
                                <div className="flex items-center gap-4 p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                                    <Image 
                                        src={selectedImage} 
                                        alt="Selected campaign image" 
                                        width={60}
                                        height={60}
                                        className="w-15 h-15 object-cover rounded-lg"
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Image selected</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-300">Campaign cover image</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedImage("")}
                                        className="px-3 py-1 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-600 hover:border-red-300 dark:hover:border-red-500 rounded-md transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={fetchUserImages}
                                    disabled={isLoadingImages || !auth?.isAuthenticated}
                                    className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-400 dark:hover:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="text-center">
                                        {isLoadingImages ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                                                <span className="text-sm text-gray-600 dark:text-gray-300">Loading images...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                </svg>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Select from Camp Origin</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Choose from your NFT collection</p>
                                            </>
                                        )}
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* Audio Selection - Music Category Only */}
                        {campaignCategory === 'music' && (
                            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                            Exclusive Audio Track
                                            <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">Required</span>
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">🔒 Only supporters can access this audio</p>
                                    </div>
                                </div>
                                
                                {selectedAudio ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4 p-3 bg-white dark:bg-gray-700 border border-purple-200 dark:border-purple-600 rounded-lg">
                                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                                                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{selectedAudioTitle}</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-300">Exclusive audio content</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedAudio("");
                                                    setSelectedAudioTitle("");
                                                }}
                                                className="px-3 py-1 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-600 hover:border-red-300 dark:hover:border-red-500 rounded-md transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        <audio 
                                            controls 
                                            className="w-full h-10 rounded-lg"
                                            src={selectedAudio}
                                        >
                                            Your browser does not support the audio element.
                                        </audio>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={fetchUserAudios}
                                        disabled={isLoadingAudios || !auth?.isAuthenticated}
                                        className="w-full p-3 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg hover:border-purple-400 dark:hover:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="text-center">
                                            {isLoadingAudios ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                                                    <span className="text-sm text-gray-600 dark:text-gray-300">Loading audio files...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <svg className="w-8 h-8 text-purple-400 dark:text-purple-500 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                                                    </svg>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Select Audio Track</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Choose from your music NFTs</p>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Video Selection - Film/Video Category Only */}
                        {(campaignCategory === 'film' || campaignCategory === 'video') && (
                            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                            Exclusive Video Content
                                            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">Required</span>
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">🔒 Only supporters can watch this video</p>
                                    </div>
                                </div>
                                
                                {selectedVideo ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4 p-3 bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-600 rounded-lg">
                                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{selectedVideoTitle}</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-300">Exclusive video content</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedVideo("");
                                                    setSelectedVideoTitle("");
                                                    setSelectedVideoThumbnail("");
                                                }}
                                                className="px-3 py-1 text-xs text-red-600 hover:text-red-800 border border-red-200 hover:border-red-300 rounded-md transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        <video 
                                            controls 
                                            className="w-full max-h-48 rounded-lg"
                                            src={selectedVideo}
                                            poster={selectedVideoThumbnail}
                                        >
                                            Your browser does not support the video element.
                                        </video>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={fetchUserVideos}
                                        disabled={isLoadingVideos || !auth?.isAuthenticated}
                                        className="w-full p-3 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="text-center">
                                            {isLoadingVideos ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                                    <span className="text-sm text-gray-600 dark:text-gray-300">Loading video files...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <svg className="w-8 h-8 text-blue-400 dark:text-blue-500 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                                                    </svg>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Select Video Content</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Choose from your video NFTs</p>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Create Button and Validation */}
                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        {/* Validation Messages */}
                        {(!campaignCategory || !campaignName || !campaignDescription || !selectedImage) && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3">
                                <p className="text-sm text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Please fill in all required fields
                                </p>
                                <div className="text-xs text-red-600 dark:text-red-400 mt-1 ml-6">
                                    {!selectedImage && <p>• Campaign image is required</p>}
                                    {!campaignName && <p>• Campaign name is required</p>}
                                    {!campaignCategory && <p>• Category is required</p>}
                                    {!campaignDescription && <p>• Description is required</p>}
                                </div>
                            </div>
                        )}
                        
                        {(campaignCategory === 'music' && (!selectedAudio || !selectedAudioTitle.trim())) && (
                            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
                                <p className="text-sm text-purple-700 dark:text-purple-300 font-medium flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                                    </svg>
                                    🎵 Music campaigns require audio and title
                                </p>
                                <div className="text-xs text-purple-600 dark:text-purple-400 mt-1 ml-6">
                                    {!selectedAudio && <p>• Audio track selection is required</p>}
                                    {!selectedAudioTitle.trim() && <p>• Audio title is required</p>}
                                </div>
                            </div>
                        )}
                        
                        {((campaignCategory === 'film' || campaignCategory === 'video') && (!selectedVideo || !selectedVideoTitle.trim())) && (
                            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                                    </svg>
                                    🎬 Video campaigns require video and title
                                </p>
                                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 ml-6">
                                    {!selectedVideo && <p>• Video selection is required</p>}
                                    {!selectedVideoTitle.trim() && <p>• Video title is required</p>}
                                </div>
                            </div>
                        )}

                        {/* Create Button */}
                        <button
                            className="w-full py-4 bg-gradient-to-r from-purple-700 via-purple-600 to-purple-500 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:from-purple-600 hover:to-purple-400 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                            onClick={handleDeployContract}
                            disabled={
                                isDeployingContract || 
                                !campaignCategory || 
                                !campaignName || 
                                !campaignDescription || 
                                !selectedImage ||
                                (campaignCategory === 'music' && (!selectedAudio || !selectedAudioTitle.trim())) || 
                                ((campaignCategory === 'film' || campaignCategory === 'video') && (!selectedVideo || !selectedVideoTitle.trim()))
                            }
                        >
                            {isDeployingContract ? (
                                <>
                                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                    <span>Creating Campaign...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <span>Launch Campaign</span>
                                </>
                            )}
                        </button>
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            By creating a campaign, you agree to our terms of service and community guidelines.
                        </p>
                    </div>
                </div>
            </div>

            {/* Image Selector Modal */}
            {showImageSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Campaign Image from Your Camp Origin NFTs</h3>
                            <button 
                                onClick={() => setShowImageSelector(false)}
                                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                                ✕
                            </button>
                        </div>
                        
                        {userImages.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {userImages.map((image, index) => (
                                    <div 
                                        key={image.id || index}
                                        onClick={() => {
                                            console.log("=== IMAGE SELECTION DEBUG ===");
                                            console.log("Selecting image:", image.url);
                                            console.log("Image object:", image);
                                            console.log("Previous selectedImage:", selectedImage);
                                            setSelectedImage(image.url);
                                            console.log("Image selected, closing selector...");
                                            setShowImageSelector(false);
                                            console.log("=== END IMAGE SELECTION ===");
                                        }}
                                        className="cursor-pointer border rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors hover:border-purple-600 dark:hover:border-purple-500"
                                    >
                                        <Image 
                                            src={image.url} 
                                            alt={image.name || `NFT ${index + 1}`}
                                            width={200}
                                            height={150}
                                            className="w-full h-32 object-cover rounded-md"
                                        />
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 truncate">
                                            {image.name || `NFT ${index + 1}`}
                                        </p>
                                        {image.tokenId && (
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                Token ID: {image.tokenId}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-500 dark:text-gray-400">No NFTs found in your Camp Origin collection</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                                    Make sure you&apos;ve minted some NFTs through Camp Origin first
                                </p>
                                
                                {/* Test image option for debugging */}
                                <div className="mt-4 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">For testing purposes:</p>
                                    <button
                                        onClick={() => {
                                            setSelectedImage("https://via.placeholder.com/400x300/6366f1/ffffff?text=Test+Campaign+Image");
                                            setShowImageSelector(false);
                                        }}
                                        className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                                    >
                                        Use Test Image
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

                        {/* Audio Selector Modal */}
                        {showAudioSelector && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold">🎵 Select Audio from Your Camp Origin Collection</h3>
                                        <button 
                                            onClick={() => setShowAudioSelector(false)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    
                                    {/* Custom Audio Title Input */}
                                    <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Audio Track Title <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={selectedAudioTitle}
                                                onChange={(e) => setSelectedAudioTitle(e.target.value)}
                                                placeholder="Enter the title for your audio track"
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                                                required
                                            />
                                            <button
                                                onClick={() => setSelectedAudioTitle("")}
                                                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                                                title="Clear title"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            This title will be displayed to your supporters.
                                        </p>
                                    </div>
                                    
                                    {userAudios.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {userAudios.map((audio, index) => (
                                                <div 
                                                    key={audio.id || index}
                                                    onClick={() => {
                                                        console.log("=== AUDIO SELECTION DEBUG ===");
                                                        console.log("Selecting audio:", audio.url);
                                                        console.log("Audio object:", audio);
                                                        setSelectedAudio(audio.url);
                                                        // Use custom title if provided, otherwise use the original file name
                                                        if (!selectedAudioTitle.trim()) {
                                                            setSelectedAudioTitle(audio.name || `Audio ${index + 1}`);
                                                        }
                                                        console.log("Audio selected, closing selector...");
                                                        setShowAudioSelector(false);
                                                        console.log("=== END AUDIO SELECTION ===");
                                                    }}
                                                    className="cursor-pointer border rounded-lg p-4 hover:bg-purple-50 transition-colors hover:border-purple-600"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                                            <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-800 truncate">
                                                                {audio.name || `Audio ${index + 1}`}
                                                            </p>
                                                            {audio.duration && (
                                                                <p className="text-xs text-gray-500">
                                                                    Duration: {Math.floor(audio.duration / 60)}:{(audio.duration % 60).toString().padStart(2, '0')}
                                                                </p>
                                                            )}
                                                            {audio.tokenId && (
                                                                <p className="text-xs text-gray-400">
                                                                    Token ID: {audio.tokenId}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <audio 
                                                        controls 
                                                        className="mt-2 w-full h-8"
                                                        src={audio.url}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        Your browser does not support the audio element.
                                                    </audio>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                                                </svg>
                                            </div>
                                            <p className="text-gray-500">No audio files found in your Camp Origin collection</p>
                                            <p className="text-sm text-gray-400 mt-2">
                                                Make sure you&apos;ve uploaded some audio NFTs through Camp Origin first
                                            </p>
                                            
                                            {/* Test audio option for debugging */}
                                            <div className="mt-4 p-4 border border-dashed border-gray-300 rounded-lg">
                                                <p className="text-sm text-gray-600 mb-3">For testing purposes:</p>
                                                <button
                                                    onClick={() => {
                                                        setSelectedAudio("https://www.soundjay.com/misc/sounds/bell-ringing-05.wav");
                                                        // Use custom title if provided, otherwise use default
                                                        if (!selectedAudioTitle.trim()) {
                                                            setSelectedAudioTitle("Test Audio Track");
                                                        }
                                                        setShowAudioSelector(false);
                                                    }}
                                                    className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                                                >
                                                    Use Test Audio
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Video Selector Modal */}
                        {showVideoSelector && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold">🎬 Select Video from Your Camp Origin Collection</h3>
                                        <button 
                                            onClick={() => setShowVideoSelector(false)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    
                                    {/* Custom Video Title Input */}
                                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Video Title <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={selectedVideoTitle}
                                                onChange={(e) => setSelectedVideoTitle(e.target.value)}
                                                placeholder="Enter the title for your video"
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                                                required
                                            />
                                            <button
                                                onClick={() => setSelectedVideoTitle("")}
                                                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                                                title="Clear title"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            This title will be displayed to your supporters.
                                        </p>
                                    </div>
                                    
                                    {userVideos.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {userVideos.map((video, index) => (
                                                <div 
                                                    key={video.id || index}
                                                    onClick={() => {
                                                        console.log("=== VIDEO SELECTION DEBUG ===");
                                                        console.log("Selecting video:", video.url);
                                                        console.log("Video object:", video);
                                                        setSelectedVideo(video.url);
                                                        // Use custom title if provided, otherwise use the original file name
                                                        if (!selectedVideoTitle.trim()) {
                                                            setSelectedVideoTitle(video.name || `Video ${index + 1}`);
                                                        }
                                                        setSelectedVideoThumbnail(video.thumbnail || "");
                                                        console.log("Video selected, closing selector...");
                                                        setShowVideoSelector(false);
                                                        console.log("=== END VIDEO SELECTION ===");
                                                    }}
                                                    className="cursor-pointer border rounded-lg p-4 hover:bg-blue-50 transition-colors hover:border-blue-600"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                                            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-800 truncate">
                                                                {video.name || `Video ${index + 1}`}
                                                            </p>
                                                            {video.duration && (
                                                                <p className="text-xs text-gray-500">
                                                                    Duration: {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                                                                </p>
                                                            )}
                                                            {video.tokenId && (
                                                                <p className="text-xs text-gray-400">
                                                                    Token ID: {video.tokenId}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <video 
                                                        controls 
                                                        className="mt-2 w-full max-h-32"
                                                        src={video.url}
                                                        poster={video.thumbnail}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        Your browser does not support the video element.
                                                    </video>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                                                </svg>
                                            </div>
                                            <p className="text-gray-500">No video files found in your Camp Origin collection</p>
                                            <p className="text-sm text-gray-400 mt-2">
                                                Make sure you&apos;ve uploaded some video NFTs through Camp Origin first
                                            </p>
                                            
                                            {/* Test video option for debugging */}
                                            <div className="mt-4 p-4 border border-dashed border-gray-300 rounded-lg">
                                                <p className="text-sm text-gray-600 mb-3">For testing purposes:</p>
                                                <button
                                                    onClick={() => {
                                                        setSelectedVideo("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
                                                        // Use custom title if provided, otherwise use default
                                                        if (!selectedVideoTitle.trim()) {
                                                            setSelectedVideoTitle("Test Video");
                                                        }
                                                        setSelectedVideoThumbnail("");
                                                        setShowVideoSelector(false);
                                                    }}
                                                    className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                                                >
                                                    Use Test Video
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
        </div>
    );
}

// Component to display user's minted campaign NFTs and funding receipts
const CampaignNFTCollection = () => {
    const account = useActiveAccount();
    const [mintedNFTs, setMintedNFTs] = useState<{ campaignAddress: string; imageUrl: string; campaignName?: string; type?: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const loadNFTs = async () => {
            if (!account?.address || !isMounted) return;
            
            setIsLoading(true);
            const nfts: { campaignAddress: string; imageUrl: string; campaignName?: string; type?: string }[] = [];
            
            try {
                // First, try to load NFTs from PocketBase (online storage)
                const dbNFTs = await campaignNFTService.getBySupporter(account.address);
                
                for (const nft of dbNFTs) {
                    if (nft.mint_status === 'minted') {
                        let imageUrl = '/logo.png'; // default fallback
                        let campaignName = `Campaign ${nft.campaign_address.slice(0, 6)}...${nft.campaign_address.slice(-4)}`;
                        
                        // Try to extract image and name from metadata
                        try {
                            const metadata = JSON.parse(nft.nft_metadata || '{}');
                            if (metadata.image) imageUrl = metadata.image;
                            if (metadata.name) campaignName = metadata.name;
                        } catch (e) {
                            console.log('Could not parse NFT metadata for:', nft.id);
                        }
                        
                        // Filter out funding receipts without proper images
                        const nftType = nft.tier_id === 1 ? 'manual_mint' : 'funding_receipt';
                        if (nftType === 'funding_receipt') {
                            // Only include funding receipts with valid images (not default logos)
                            if (imageUrl && 
                                imageUrl !== '/logo.png' && 
                                imageUrl !== '/logo2.svg' && 
                                !imageUrl.includes('logo') &&
                                imageUrl.startsWith('http')) {
                                nfts.push({
                                    campaignAddress: nft.campaign_address,
                                    imageUrl,
                                    campaignName,
                                    type: nftType
                                });
                            }
                        } else {
                            // Always include manual mints regardless of image
                            nfts.push({
                                campaignAddress: nft.campaign_address,
                                imageUrl,
                                campaignName,
                                type: nftType
                            });
                        }
                    }
                }
                
                console.log(`Loaded ${nfts.length} NFTs from PocketBase`);
            } catch (error) {
                console.log('Failed to load NFTs from database, falling back to localStorage:', error);
            }

            // Load campaign images from campaigns the user has supported (funded)
            try {
                console.log(`Loading supported campaign NFTs for user: ${account.address}`);
                
                // Get funding records to find campaigns the user supported
                const fundingRecords = await campaignFundingService.getBySupporter(account.address);
                console.log(`Found ${fundingRecords.length} funding records`);
                
                // Get unique campaign addresses from funding records
                const supportedCampaigns = [...new Set(fundingRecords.map(record => record.campaign_address))];
                console.log(`User supported ${supportedCampaigns.length} unique campaigns`);
                
                // For each supported campaign, try to get its image
                for (const campaignAddress of supportedCampaigns) {
                    try {
                        // Skip if we already have an NFT for this campaign
                        if (nfts.some(nft => nft.campaignAddress === campaignAddress)) {
                            continue;
                        }
                        
                        // Get campaign image from database
                        const imageRecord = await campaignImageService.getByCampaignAddress(campaignAddress);
                        if (imageRecord?.image_url) {
                            // Get campaign name
                            let campaignName = `Campaign ${campaignAddress.slice(0, 6)}...${campaignAddress.slice(-4)}`;
                            try {
                                const contract = getContract({
                                    client: client,
                                    chain: chain,
                                    address: campaignAddress,
                                });
                                
                                const name = await readContract({
                                    contract: contract,
                                    method: "function name() view returns (string)",
                                    params: []
                                });
                                campaignName = name;
                            } catch (error) {
                                console.log(`Could not fetch campaign name for ${campaignAddress}`);
                            }
                            
                            nfts.push({
                                campaignAddress: campaignAddress,
                                imageUrl: imageRecord.image_url,
                                campaignName: campaignName,
                                type: 'supported_campaign'
                            });
                            
                            console.log(`Added supported campaign NFT: ${campaignName}`);
                        }
                    } catch (error) {
                        console.log(`Could not load image for supported campaign ${campaignAddress}:`, error);
                    }
                }
            } catch (error) {
                console.log('Failed to load supported campaign NFTs:', error);
            }
            
            // Fallback: Load from localStorage for backwards compatibility
            // Get manually minted campaign NFTs
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('mintedNFT_') && key.endsWith(`_${account.address}`)) {
                    const campaignAddress = key.replace('mintedNFT_', '').replace(`_${account.address}`, '');
                    
                    // Skip if we already have this from PocketBase
                    if (nfts.some(nft => nft.campaignAddress === campaignAddress && nft.type === 'manual_mint')) {
                        continue;
                    }
                    
                    const storedData = localStorage.getItem(key);
                    if (storedData) {
                        try {
                            // Try to parse as JSON (new format)
                            const mintData = JSON.parse(storedData);
                            if (mintData.imageUrl) {
                                nfts.push({ 
                                    campaignAddress, 
                                    imageUrl: mintData.imageUrl, 
                                    campaignName: `Campaign ${campaignAddress.slice(0, 6)}...${campaignAddress.slice(-4)}`,
                                    type: 'manual_mint'
                                });
                            }
                        } catch (e) {
                            // Fallback for old format (direct image URL string)
                            if (storedData.startsWith('http')) {
                                nfts.push({ 
                                    campaignAddress, 
                                    imageUrl: storedData, 
                                    campaignName: `Campaign ${campaignAddress.slice(0, 6)}...${campaignAddress.slice(-4)}`,
                                    type: 'manual_mint'
                                });
                            }
                        }
                    }
                }
            }

            // Get funding receipt NFTs (database first, localStorage fallback)
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('mintedReceipt_') && key.endsWith(`_${account.address}`)) {
                    const campaignAddress = key.replace('mintedReceipt_', '').replace(`_${account.address}`, '');
                    
                    // Skip if we already have this from PocketBase
                    if (nfts.some(nft => nft.campaignAddress === campaignAddress && nft.type === 'funding_receipt')) {
                        continue;
                    }
                    
                    const receiptDataStr = localStorage.getItem(key);
                    if (receiptDataStr) {
                        try {
                            const receiptData = JSON.parse(receiptDataStr);
                            // Only add funding receipts that have valid images (not default logo or empty)
                            const imageUrl = receiptData.imageUrl;
                            if (imageUrl && 
                                imageUrl !== '/logo.png' && 
                                imageUrl !== '/logo2.svg' && 
                                !imageUrl.includes('logo') &&
                                imageUrl.startsWith('http')) {
                                nfts.push({ 
                                    campaignAddress, 
                                    imageUrl: imageUrl,
                                    campaignName: `${receiptData.tierName} - $${receiptData.amount}`,
                                    type: 'funding_receipt'
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing receipt data:', e);
                        }
                    }
                }
            }

            // Also check localStorage for supported campaigns (backwards compatibility)
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('funded_') && key.endsWith(`_${account.address}`)) {
                    const campaignAddress = key.split('_')[1];
                    
                    // Skip if we already have this campaign
                    if (nfts.some(nft => nft.campaignAddress === campaignAddress)) {
                        continue;
                    }
                    
                    // Check if user actually funded this campaign
                    const funded = localStorage.getItem(key);
                    if (funded === 'true') {
                        // Try to get campaign image from localStorage
                        const imageKey = `campaign_image_${campaignAddress}`;
                        const storedImage = localStorage.getItem(imageKey);
                        
                        if (storedImage) {
                            nfts.push({
                                campaignAddress: campaignAddress,
                                imageUrl: storedImage,
                                campaignName: `Supported Campaign ${campaignAddress.slice(0, 6)}...${campaignAddress.slice(-4)}`,
                                type: 'supported_campaign_legacy'
                            });
                        }
                    }
                }
            }
            
            setMintedNFTs(nfts);
            setIsLoading(false);
        };
        
        loadNFTs();
    }, [account?.address, isMounted]);

    if (!isMounted || isLoading) {
        return (
            <div className="mb-12">
                <div className="bg-gradient-to-r from-purple-700/10 via-purple-600/10 to-purple-400/10 dark:from-purple-700/20 dark:via-purple-600/20 dark:to-purple-400/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                        <span className="mr-3 text-2xl">🎨</span>
                        My Campaign NFT Collection
                        <span className="ml-3 px-3 py-1 bg-purple-600 text-white text-sm rounded-full animate-pulse">
                            ...
                        </span>
                    </h2>
                    <p className="text-white/90 mb-6">
                        Loading your NFT collection...
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((idx) => (
                            <div key={idx} className="bg-gray-200 rounded-xl p-4 animate-pulse">
                                <div className="w-full h-28 bg-gray-300 rounded-lg mb-3"></div>
                                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                                <div className="h-3 bg-gray-300 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (mintedNFTs.length === 0) {
        return null;
    }

    return (
        <div className="mb-10">
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-5 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-50 mb-2 flex items-center">
                    <span className="mr-3">🎨</span>
                    My Campaign NFT Collection
                    <span className="ml-3 px-3 py-1 bg-gradient-to-r from-[#e94560] to-[#f45a06] text-white text-xs rounded-full font-semibold">
                        {mintedNFTs.length}
                    </span>
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                    Your collection includes campaign images from campaigns you&apos;ve supported and funding receipt NFTs.
                </p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {mintedNFTs.map((nft, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 border border-gray-100 dark:border-gray-600">
                            <div className="relative">
                                <Image 
                                    src={nft.imageUrl} 
                                    alt={`Campaign NFT ${idx + 1}`}
                                    width={120}
                                    height={120}
                                    className="w-full h-28 object-cover rounded-md border border-gray-200 dark:border-gray-600"
                                />
                                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-[#e94560] to-[#f45a06] text-white text-xs px-2 py-1 rounded-full font-bold shadow-md">
                                    {nft.type === 'funding_receipt' ? '🧾' : 
                                     nft.type === 'supported_campaign' ? '❤️' :
                                     nft.type === 'supported_campaign_legacy' ? '💜' : 'NFT'}
                                </div>
                                {nft.type === 'funding_receipt' && (
                                    <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                                        Auto
                                    </div>
                                )}
                            </div>
                            <div className="mt-3">
                                <span className="text-xs text-gray-800 dark:text-gray-100 font-medium block truncate">
                                    {nft.campaignName}
                                </span>
                                <span className="text-xs text-[#e94560] dark:text-[#ff8c42] font-medium">
                                    {nft.type === 'funding_receipt' ? 'Funding Receipt' : 
                                     nft.type === 'supported_campaign' ? 'Supported' :
                                     nft.type === 'supported_campaign_legacy' ? 'Legacy' :
                                     'NFT'}
                                </span>
                                <a
                                    href={`/campaign/${nft.campaignAddress}`}
                                    className="text-xs text-[#e94560] hover:text-[#f45a06] dark:text-[#ff8c42] dark:hover:text-[#e94560] font-semibold mt-2 inline-block hover:underline"
                                >
                                    View →
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Component to display individual supported campaign card
const SupportedCampaignCard = ({ contractAddress }: { contractAddress: string }) => {
    const account = useActiveAccount();
    const [campaignData, setCampaignData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const contract = getContract({
        client: client,
        chain: chain,
        address: contractAddress,
    });

    const { data: name } = useReadContract({
        contract: contract,
        method: "function name() view returns (string)",
        params: [],
    });

    const { data: description } = useReadContract({
        contract: contract,
        method: "function description() view returns (string)",
        params: [],
    });

    const { data: goal } = useReadContract({
        contract: contract,
        method: "function goal() view returns (uint256)",
        params: [],
    });

    const { data: balance } = useReadContract({
        contract: contract,
        method: "function getContractBalance() view returns (uint256)",
        params: [],
    });

    // Extract category from description
    const extractCategory = (desc: string | undefined) => {
        if (!desc) return null;
        const categoryMatch = desc.match(/📂 Category: (\w+)/);
        if (categoryMatch) {
            const category = categoryMatch[1];
            const categoryMap: { [key: string]: string } = {
                music: "🎵 Music",
                book: "📚 Book/Literature",
                art: "🎨 Art/Visual",
                film: "🎬 Film/Video",
                game: "🎮 Gaming",
                tech: "💻 Technology",
                charity: "❤️ Charity/Community",
                education: "🎓 Education",
                fashion: "👗 Fashion",
                food: "🍕 Food/Beverage",
                health: "🏥 Health/Wellness",
                other: "🌟 Other/General Support"
            };
            return categoryMap[category] || category;
        }
        return null;
    };

    const categoryData = extractCategory(description);
    const totalBalance = balance?.toString();
    const totalGoal = goal?.toString();
    const balancePercentage = totalBalance && totalGoal ? (parseInt(totalBalance) / parseInt(totalGoal)) * 100 : 0;

    // Check if user submitted contact info for this campaign
    const [hasSubmittedContact, setHasSubmittedContact] = useState(false);
    useEffect(() => {
        if (account?.address && contractAddress) {
            const contactKey = `contact_${contractAddress}_${account.address}`;
            const existingContact = localStorage.getItem(contactKey);
            setHasSubmittedContact(!!existingContact);
        }
    }, [account?.address, contractAddress]);

    // Extract campaign image from description - now using PocketBase
    const [campaignImageUrl, setCampaignImageUrl] = useState<string | null>(null);
    
    useEffect(() => {
        const fetchCampaignImage = async () => {
            if (contractAddress) {
                try {
                    const imageRecord = await campaignImageService.getByCampaignAddress(contractAddress);
                    if (imageRecord?.image_url) {
                        setCampaignImageUrl(imageRecord.image_url);
                    } else {
                        // Fallback to description parsing for older campaigns
                        const match = description?.match(/🖼️ Image: (https?:\/\/[^\s]+)/);
                        setCampaignImageUrl(match ? match[1] : null);
                    }
                } catch (error) {
                    console.error("Error fetching campaign image:", error);
                    // Fallback to description parsing
                    const match = description?.match(/🖼️ Image: (https?:\/\/[^\s]+)/);
                    setCampaignImageUrl(match ? match[1] : null);
                }
            }
        };
        
        fetchCampaignImage();
    }, [contractAddress, description]);

    return (
        <div className="bg-gradient-to-br from-purple-700/5 via-purple-600/5 to-purple-400/5 border border-purple-600/20 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
            
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-800 mb-1 truncate">
                        {name || "Loading..."}
                    </h4>
                    {categoryData && (
                        <span className="inline-block px-1.5 py-0.5 text-xs font-medium bg-purple-600/10 text-purple-600 rounded-full">
                            {categoryData}
                        </span>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500">
                        {balancePercentage >= 100 ? "✅ Funded" : "🚀 Active"}
                    </div>
                </div>
            </div>

            <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{balancePercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-purple-700 to-purple-400 transition-all duration-500"
                        style={{ width: `${Math.min(balancePercentage, 100)}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>${totalBalance || "0"}</span>
                    <span>${totalGoal || "0"}</span>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <div className="text-xs">
                    <span className="text-green-600 font-medium">
                        {hasSubmittedContact ? "✅ Contact" : "📧 Pending"}
                    </span>
                </div>
                <a
                    href={`/campaign/${contractAddress}`}
                    className="px-3 py-1.5 text-xs font-medium text-purple-600 hover:text-white hover:bg-purple-600 border border-purple-600 rounded-md transition-all duration-200"
                >
                    View
                </a>
            </div>
        </div>
    );
};


// Component to display campaign donors from on-chain data
const CampaignDonorsSection = ({ campaigns }: { campaigns: any[] | undefined }) => {
    const [selectedCampaign, setSelectedCampaign] = useState<string>('');
    const [campaignDonors, setCampaignDonors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [totalFunded, setTotalFunded] = useState<string>('0');

    // Export supporters data to CSV
    const exportSupportersData = (supporters: any[], campaignAddress: string) => {
        if (supporters.length === 0) {
            console.log('No supporters data to export');
            return;
        }

        try {
            const campaignName = campaigns?.find(c => c.campaignAddress === campaignAddress)?.name || 'Campaign';
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${campaignName}_supporters_${timestamp}.csv`;

            // CSV headers
            const headers = [
                'Wallet Address',
                'Amount (USDT)',
                'Tier',
                'Date Funded',
                'Time Funded',
                'Transaction Hash',
                'Has NFT',
                'Data Source',
                'Access Granted'
            ];

            // Convert supporters data to CSV rows
            const csvData = supporters.map(supporter => [
                supporter.walletAddress || '',
                supporter.tierAmount ? (parseFloat(supporter.tierAmount) / 1e6).toString() : '0',
                supporter.tierTitle || 'Supporter',
                supporter.fundedAt ? new Date(supporter.fundedAt).toLocaleDateString() : '',
                supporter.fundedAt ? new Date(supporter.fundedAt).toLocaleTimeString() : '',
                supporter.transactionHash || '',
                supporter.hasNFT ? 'Yes' : 'No',
                supporter.source || 'database',
                supporter.hasNFT ? 'Yes' : 'No'
            ]);

            // Combine headers and data
            const csvContent = [headers, ...csvData]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');

            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`CSV export successful: ${filename}`);
        } catch (error) {
            console.error('CSV export failed:', error);
            alert('Failed to export CSV. Please try again.');
        }
    };

    // Copy text to clipboard
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            // You could add a toast notification here if you have one
            console.log('Copied to clipboard:', text);
        } catch (err) {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                console.log('Copied to clipboard (fallback):', text);
            } catch (err) {
                console.error('Fallback copy failed: ', err);
            }
            document.body.removeChild(textArea);
        }
    };

    // Auto-select first campaign when campaigns are loaded
    useEffect(() => {
        if (campaigns && campaigns.length > 0 && !selectedCampaign) {
            const firstCampaign = campaigns[0];
            setSelectedCampaign(firstCampaign.campaignAddress);
            loadCampaignDonors(firstCampaign.campaignAddress);
        }
    }, [campaigns, selectedCampaign]);

    const loadCampaignDonors = async (campaignAddress: string) => {
        setIsLoading(true);
        try {
            console.log(`[CampaignDonorsSection] Fetching supporters for campaign: ${campaignAddress}`);
            
            // Fetch supporter data from PocketBase campaign_supporters collection
            const supporterRecords = await campaignSupporterService.getByCampaign(campaignAddress);
            console.log(`[CampaignDonorsSection] Found ${supporterRecords.length} supporter records:`, supporterRecords);

            // Calculate total funded from supporter records
            const totalFundedAmount = supporterRecords.reduce((sum, supporter) => {
                return sum + (supporter.amount_funded || 0);
            }, 0);

            // Update total funded state (convert to wei for display consistency)
            setTotalFunded((totalFundedAmount * 1e6).toString());

            // Transform supporter records into donor data format
            const donorsData = supporterRecords.map((supporter: any, index: number) => ({
                walletAddress: supporter.supporter_address,
                tierIndex: 0, // Generic tier since campaign_supporters doesn't have tier details
                tierAmount: (supporter.amount_funded * 1e6).toString(), // Convert to wei for consistency
                tierTitle: 'Supporter',
                tierDescription: `Contributed $${supporter.amount_funded} USDT`,
                hasNFT: supporter.access_granted || false,
                fundedAt: new Date(supporter.created),
                source: 'database',
                transactionHash: supporter.transaction_hash || null
            }));

            // Sort by funding date (most recent first)
            donorsData.sort((a, b) => new Date(b.fundedAt).getTime() - new Date(a.fundedAt).getTime());

            setCampaignDonors(donorsData);
            console.log(`[CampaignDonorsSection] Processed ${donorsData.length} supporters for display, total funded: $${totalFundedAmount}`);
        } catch (error) {
            console.error('Error loading campaign donors:', error);
            setCampaignDonors([]);
            setTotalFunded('0');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCampaignSelect = (campaignAddress: string) => {
        setSelectedCampaign(campaignAddress);
        loadCampaignDonors(campaignAddress);
    };

    const getWalletScanUrl = (address: string) => {
        return `https://basecamp.cloud.blockscout.com/address/${address}`;
    };

    if (!campaigns || campaigns.length === 0) {
        return null;
    }

    return (
        <div className="mt-10 p-5 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-50 mb-2">Campaign Supporters</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                View supporters who have funded your campaigns with their tier details.
            </p>

            {/* Campaign Selection */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Campaign:
                </label>
                <select
                    value={selectedCampaign}
                    onChange={(e) => handleCampaignSelect(e.target.value)}
                    className="w-full md:w-1/2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-[#e94560] focus:border-transparent text-sm transition-all"
                >
                    <option value="">Choose a campaign...</option>
                    {campaigns.map((campaign) => (
                        <option key={campaign.campaignAddress} value={campaign.campaignAddress}>
                            {campaign.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Campaign Stats */}
            {selectedCampaign && (
                <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#e94560]/20 to-[#f45a06]/20 dark:from-[#e94560]/30 dark:to-[#f45a06]/30 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-[#e94560] dark:text-[#ff8c42]" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Funded</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-50">${(parseInt(totalFunded) / 1e6).toFixed(2)}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">From blockchain</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Supporters</p>
                            <p className="text-lg font-bold text-[#e94560] dark:text-[#ff8c42]">{campaignDonors.length}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Combined data</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Cross-device Tracked</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                {campaignDonors.filter(d => d.source === 'database').length}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">With timestamps</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Supporters Display */}
            {selectedCampaign && (
                <div>
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                            <p className="text-gray-500 dark:text-gray-400 mt-4">Loading supporters...</p>
                        </div>
                    ) : campaignDonors.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 dark:text-gray-400">No supporters have funded this campaign yet.</p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                                Share your campaign to start receiving support!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Export Button */}
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Showing {campaignDonors.length} supporter{campaignDonors.length !== 1 ? 's' : ''}
                                </p>
                                <button
                                    onClick={() => exportSupportersData(campaignDonors, selectedCampaign)}
                                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 dark:from-green-700 dark:to-green-600 dark:hover:from-green-800 dark:hover:to-green-700 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2 shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export CSV
                                </button>
                            </div>

                            {/* Compact Table View */}
                            <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                                {/* Table Header */}
                                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                                    <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        <div className="col-span-4">Supporter</div>
                                        <div className="col-span-2">Amount</div>
                                        <div className="col-span-2">Date</div>
                                        <div className="col-span-2">Status</div>
                                        <div className="col-span-2">Actions</div>
                                    </div>
                                </div>

                                {/* Table Body */}
                                <div className="divide-y divide-gray-200 dark:divide-gray-600">
                                    {campaignDonors.map((donor, index) => (
                                        <div key={index} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                            <div className="grid grid-cols-12 gap-4 items-center">
                                                {/* Supporter Column */}
                                                <div className="col-span-4 flex items-center gap-3">
                                                    <div className="w-7 h-7 bg-gradient-to-br from-[#e94560] to-[#f45a06] rounded-lg flex items-center justify-center text-white text-xs font-semibold">
                                                        {donor.walletAddress.slice(2, 4).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                                                            {donor.walletAddress.slice(0, 6)}...{donor.walletAddress.slice(-4)}
                                                        </p>
                                                        {donor.transactionHash && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                Tx: {donor.transactionHash.slice(0, 12)}...
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Amount Column */}
                                                <div className="col-span-2">
                                                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">{donor.tierAmount ? `$${(parseInt(donor.tierAmount) / 1e6).toFixed(2)}` : 'N/A'}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{donor.tierTitle}</p>
                                                </div>

                                                {/* Date Column */}
                                                <div className="col-span-2">
                                                    <p className="text-sm text-gray-900 dark:text-gray-50">
                                                        {new Date(donor.fundedAt).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {new Date(donor.fundedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>

                                                {/* Status Column */}
                                                <div className="col-span-2">
                                                    <div className="flex flex-col gap-1">
                                                        {donor.source === 'database' && (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 w-fit">
                                                                ✓ Tracked
                                                            </span>
                                                        )}
                                                        {donor.hasNFT && (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 w-fit">
                                                                🎫 NFT
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions Column */}
                                                <div className="col-span-2 flex items-center gap-2">
                                                    <a
                                                        href={getWalletScanUrl(donor.walletAddress)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[#e94560] hover:text-[#f45a06] dark:text-[#ff8c42] dark:hover:text-[#e94560] transition-colors p-1"
                                                        title="View on Blockscout"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                                                            <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                                                        </svg>
                                                    </a>
                                                    <button
                                                        onClick={() => copyToClipboard(donor.walletAddress)}
                                                        className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1"
                                                        title="Copy wallet address"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Component to display supporter contact information
const SupporterContactsSection = ({ campaigns }: { campaigns: any[] | undefined }) => {
    const [selectedCampaign, setSelectedCampaign] = useState<string>('');
    const [supporterContacts, setSupporterContacts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadSupporterContacts = async (campaignAddress: string) => {
        setIsLoading(true);
        try {
            const contacts = await campaignContactService.getByCampaign(campaignAddress);
            setSupporterContacts(contacts);
        } catch (error) {
            console.error('Error loading supporter contacts:', error);
            setSupporterContacts([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCampaignSelect = (campaignAddress: string) => {
        setSelectedCampaign(campaignAddress);
        loadSupporterContacts(campaignAddress);
    };

    const exportContacts = () => {
        if (supporterContacts.length === 0) return;
        
        const csvContent = [
            ['Name', 'Email', 'Address', 'Phone', 'X Username', 'Telegram', 'Wallet Address', 'Message', 'Date'],
            ...supporterContacts.map(contact => [
                contact.name || 'Not provided',
                contact.email || 'Not provided',
                contact.address || 'Not provided',
                contact.phone || 'Not provided',
                contact.x_username || 'Not provided',
                contact.telegram_username || 'Not provided',
                contact.wallet_address || 'Not provided',
                contact.message || 'Not provided',
                new Date(contact.created).toLocaleDateString()
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `supporters_${selectedCampaign}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (!campaigns || campaigns.length === 0) {
        return null;
    }

    return (
        <div className="mt-8 sm:mt-12 p-3 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg sm:text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-3 sm:mb-4">Supporter Contact Information</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
                View and manage contact information from supporters who have funded your campaigns.
            </p>

            {/* Campaign Selection */}
            <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Campaign:
                </label>
                <select
                    value={selectedCampaign}
                    onChange={(e) => handleCampaignSelect(e.target.value)}
                    className="w-full sm:w-1/2 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm"
                >
                    <option value="">Choose a campaign...</option>
                    {campaigns.map((campaign) => (
                        <option key={campaign.campaignAddress} value={campaign.campaignAddress}>
                            {campaign.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Supporter Contacts Display */}
            {selectedCampaign && (
                <div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                        <h4 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
                            Contacts ({supporterContacts.length})
                        </h4>
                        {supporterContacts.length > 0 && (
                            <button
                                onClick={exportContacts}
                                className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white rounded-lg transition-colors text-sm"
                            >
                                Export CSV
                            </button>
                        )}
                    </div>

                    {isLoading ? (
                        <p className="text-gray-500 dark:text-gray-400">Loading contacts...</p>
                    ) : supporterContacts.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 dark:text-gray-400">No supporters have submitted contact information yet.</p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                                When supporters fund your campaign, they&apos;ll be able to submit their contact details.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-200 dark:border-gray-600 rounded-lg text-sm">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700">
                                        <th className="border border-gray-200 dark:border-gray-600 px-2 sm:px-4 py-1 sm:py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs sm:text-sm">Name</th>
                                        <th className="border border-gray-200 dark:border-gray-600 px-2 sm:px-4 py-1 sm:py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs sm:text-sm">Email</th>
                                        <th className="border border-gray-200 dark:border-gray-600 px-2 sm:px-4 py-1 sm:py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs sm:text-sm">Address</th>
                                        <th className="border border-gray-200 dark:border-gray-600 px-2 sm:px-4 py-1 sm:py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs sm:text-sm">Phone</th>
                                        <th className="border border-gray-200 dark:border-gray-600 px-2 sm:px-4 py-1 sm:py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs sm:text-sm">X Username</th>
                                        <th className="border border-gray-200 dark:border-gray-600 px-2 sm:px-4 py-1 sm:py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs sm:text-sm">Telegram</th>
                                        <th className="border border-gray-200 dark:border-gray-600 px-2 sm:px-4 py-1 sm:py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs sm:text-sm">Message</th>
                                        <th className="border border-gray-200 dark:border-gray-600 px-2 sm:px-4 py-1 sm:py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs sm:text-sm">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {supporterContacts.map((contact, index) => (
                                        <tr key={contact.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="border border-gray-200 dark:border-gray-600 px-2 sm:px-4 py-1 sm:py-2 text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{contact.name || 'Not provided'}</td>
                                            <td className="border border-gray-200 dark:border-gray-600 px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm">
                                                {contact.email ? (
                                                    <a href={`mailto:${contact.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                                                        {contact.email}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500 italic">Not provided</span>
                                                )}
                                            </td>
                                            <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">
                                                {contact.address ? (
                                                    <span className="text-gray-700 dark:text-gray-200">{contact.address}</span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500 italic">Not provided</span>
                                                )}
                                            </td>
                                            <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">
                                                {contact.phone ? (
                                                    <span className="text-gray-700 dark:text-gray-200">{contact.phone}</span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500 italic">Not provided</span>
                                                )}
                                            </td>
                                            <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">
                                                {contact.x_username ? (
                                                    <a href={`https://x.com/${contact.x_username}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                                        @{contact.x_username}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500">Not provided</span>
                                                )}
                                            </td>
                                            <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">
                                                {contact.telegram_username ? (
                                                    <a href={`https://t.me/${contact.telegram_username}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                                        @{contact.telegram_username}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500">Not provided</span>
                                                )}
                                            </td>
                                            <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">
                                                {contact.message ? (
                                                    <span className="text-gray-700 dark:text-gray-200 text-sm">{contact.message}</span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500 italic">No message</span>
                                                )}
                                            </td>
                                            <td className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">
                                                {new Date(contact.created).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};;

// Campaign Statistics Component
const CampaignStatistics = ({ myCampaigns }: { myCampaigns: readonly { campaignAddress: string; owner: string; name: string; creationTime: bigint; }[] | undefined }) => {
    const account = useActiveAccount();
    const [campaignStats, setCampaignStats] = useState<{
        total: number;
        funded: number;
        active: number;
        loading: boolean;
    }>({
        total: 0,
        funded: 0,
        active: 0,
        loading: true
    });

    useEffect(() => {
        const fetchCampaignStats = async () => {
            if (!myCampaigns || myCampaigns.length === 0) {
                setCampaignStats({
                    total: 0,
                    funded: 0,
                    active: 0,
                    loading: false
                });
                return;
            }

            let fundedCount = 0;
            let activeCount = 0;

            // Check each campaign's funding status
            for (const campaign of myCampaigns) {
                try {
                    const contract = getContract({
                        client: client,
                        chain: chain,
                        address: campaign.campaignAddress,
                    });

                    // Get goal and balance using readContract
                    const goalResponse = await readContract({
                        contract: contract,
                        method: "function goal() view returns (uint256)",
                        params: []
                    });
                    const balanceResponse = await readContract({
                        contract: contract,
                        method: "function getContractBalance() view returns (uint256)",
                        params: []
                    });
                    
                    const goal = goalResponse.toString();
                    const balance = balanceResponse.toString();
                    
                    const percentage = (parseInt(balance) / parseInt(goal)) * 100;
                    
                    if (percentage >= 100) {
                        fundedCount++;
                    } else {
                        activeCount++;
                    }
                } catch (error) {
                    console.error(`Error checking campaign ${campaign.campaignAddress}:`, error);
                    // If there's an error, assume it's active
                    activeCount++;
                }
            }

            setCampaignStats({
                total: myCampaigns.length,
                funded: fundedCount,
                active: activeCount,
                loading: false
            });
        };

        fetchCampaignStats();
    }, [myCampaigns]);

    if (campaignStats.loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="animate-pulse">
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                            <div className="h-4 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1"></div>
                            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Projects</h3>
                    <div className="w-8 h-8 bg-gradient-to-br from-[#e94560]/10 to-[#f45a06]/10 dark:from-[#e94560]/20 dark:to-[#f45a06]/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#e94560]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-1">
                    {campaignStats.total}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Creative projects created</p>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active Projects</h3>
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-1">
                    {campaignStats.active}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Still raising funds</p>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Funded Projects</h3>
                    <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
                <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {campaignStats.funded}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Reached funding goal</p>
            </div>
        </div>
    );
};