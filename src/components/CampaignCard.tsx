import { client } from "@/app/client";
import Link from "next/link";
import { getContract } from "thirdweb";
import { chain } from "@/app/constants/chains";
import { useReadContract } from "thirdweb/react";
import { FaXTwitter } from "react-icons/fa6";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from 'next/image';
import { campaignImageService } from '../lib/pocketbase';
import { getProxiedImageUrl } from '../utils/imageHandler';
import { devLog } from '@/utils/debugLog';

type CampaignCardProps = {
    campaignAddress: string;
};

export const CampaignCard: React.FC<CampaignCardProps> = ({ campaignAddress }) => {
    const [campaignImage, setCampaignImage] = useState<string>("");
    const [imageError, setImageError] = useState<boolean>(false);
    const [imageLoading, setImageLoading] = useState<boolean>(true);
    const [imageLoaded, setImageLoaded] = useState<boolean>(false); // Track if image has been loaded
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const contract = getContract({
        client: client,
        chain: chain,
        address: campaignAddress,
    });

    // Fetching project details
    const { data: campaignName, isLoading: isLoadingName } = useReadContract({
        contract: contract,
        method: "function name() view returns (string)",
        params: []
    });

    const { data: campaignDescription, isLoading: isLoadingDescription } = useReadContract({
        contract: contract,
        method: "function description() view returns (string)",
        params: []
    });

    // Simple image fetch with file priority over URL
    const fetchCampaignImage = useCallback(async () => {
        // Only prevent if already loaded successfully
        if (imageLoaded && campaignImage && !imageError) {
            devLog(`[CampaignCard] Image already loaded for: ${campaignAddress}`);
            return;
        }

        try {
            devLog(`[CampaignCard] Fetching image for campaign: ${campaignAddress}`);
            setImageLoading(true);
            setImageError(false);
            
            const response = await fetch(`/api/campaign-image/${campaignAddress}`);
            
            devLog(`[CampaignCard] Response status: ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                devLog(`[CampaignCard] API response for ${campaignAddress}:`, data);
                
                if (data.success && data.data) {
                    devLog(`[CampaignCard] Image data received:`, data.data);
                    
                    // Priority: file_url first (stored in PocketBase), then image_url
                    let imageUrl = null;
                    
                    if (data.data.file_url) {
                        devLog(`[CampaignCard] Using PocketBase file URL`);
                        imageUrl = data.data.file_url;
                    } else if (data.data.image_url) {
                        devLog(`[CampaignCard] Using image URL from database`);
                        
                        // Apply proxy for S3 URLs
                        if (data.data.image_url.includes('amazonaws.com')) {
                            imageUrl = getProxiedImageUrl(data.data.image_url);
                        } else {
                            imageUrl = data.data.image_url;
                        }
                    }
                    
                    if (imageUrl) {
                        devLog(`[CampaignCard] Setting campaign image: ${imageUrl}`);
                        setCampaignImage(imageUrl);
                        setImageLoaded(true);
                        setImageLoading(false);
                        return;
                    } else {
                        devLog(`[CampaignCard] No image URL found in response data`);
                    }
                } else {
                    devLog(`[CampaignCard] Response missing success or data: success=${data.success}, has data=${!!data.data}`);
                }
            } else {
                devLog(`[CampaignCard] API returned status ${response.status} for campaign ${campaignAddress}`);
            }
            
            // Fallback to localStorage if API fails
            const localKey = `campaign_image_${campaignAddress}`;
            const storedImage = localStorage.getItem(localKey);
            
            if (storedImage) {
                devLog(`[CampaignCard] Using stored image: ${storedImage}`);
                let imageUrl = storedImage;
                
                // Apply same proxy logic for stored URLs
                if (imageUrl.includes('amazonaws.com') || imageUrl.includes('s3.')) {
                    imageUrl = getProxiedImageUrl(imageUrl);
                }
                
                setCampaignImage(imageUrl);
                setImageLoaded(true);
                setImageLoading(false);
                return;
            }
            
            // No image found
            setImageError(true);
            setImageLoaded(true);
            setImageLoading(false);
            
        } catch (error) {
            console.error(`[CampaignCard] Error fetching image:`, error);
            setImageError(true);
            setImageLoaded(true);
            setImageLoading(false);
        }
    }, [campaignAddress, imageLoaded, campaignImage, imageError]);

    // Separate function to handle description-based fallback
    const handleDescriptionFallback = useCallback(() => {
        if (campaignDescription && !campaignImage && !imageLoading && imageError && imageLoaded) {
            const imageMatch = campaignDescription.match(/🖼️ Image: (https?:\/\/[^\s\n]+)/);
            if (imageMatch) {
                let imageUrl = imageMatch[1];
                
                if (imageUrl.includes('amazonaws.com') || imageUrl.includes('s3.')) {
                    imageUrl = getProxiedImageUrl(imageUrl);
                }
                
                devLog(`[CampaignCard] Using description fallback image: ${imageUrl}`);
                setCampaignImage(imageUrl);
                setImageError(false);
            }
        }
    }, [campaignDescription, campaignImage, imageLoading, imageError, imageLoaded]);

    // Load image when component mounts (only once per campaign address)
    useEffect(() => {
        if (campaignAddress) {
            fetchCampaignImage();
            
            // Add timeout to prevent infinite loading
            timeoutRef.current = setTimeout(() => {
                devLog(`[CampaignCard] Image loading timeout for: ${campaignAddress}`);
                setImageLoading(false);
                setImageError(true);
                setImageLoaded(true);
            }, 10000); // 10 second timeout
        }
        
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [campaignAddress, fetchCampaignImage]);

    // Handle description fallback separately
    useEffect(() => {
        handleDescriptionFallback();
    }, [handleDescriptionFallback]);

    // Clear timeout when image loads successfully
    useEffect(() => {
        if (imageLoaded && timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, [imageLoaded]);

    // Handle image load errors with retry mechanism
    const handleImageError = useCallback(() => {
        console.error(`[CampaignCard] Image failed to load: ${campaignImage}`);
        
        // If it's not already a proxied URL and looks like an external URL, try proxy
        if (!campaignImage.includes('/api/image-proxy') && 
            (campaignImage.includes('amazonaws.com') || campaignImage.includes('http'))) {
            devLog(`[CampaignCard] Retrying with proxy: ${campaignImage}`);
            const proxiedUrl = getProxiedImageUrl(campaignImage);
            setCampaignImage(proxiedUrl);
        } else {
            // Final fallback
            setImageError(true);
            setImageLoading(false);
        }
    }, [campaignImage]);

    const { data: goal, isLoading: isLoadingGoal } = useReadContract({
        contract: contract,
        method: "function goal() view returns (uint256)",
        params: [],
    });

    const { data: balance, isLoading: isLoadingBalance } = useReadContract({
        contract: contract,
        method: "function getContractBalance() view returns (uint256)",
        params: [],
    });

    const { data: ownerAddress, isLoading: isLoadingOwner } = useReadContract({
        contract: contract,
        method: "function owner() view returns (address)",
        params: [],
    });

    const { data: deadline, isLoading: isLoadingDeadline } = useReadContract({
        contract: contract,
        method: "function deadline() view returns (uint256)",
        params: [],
    });

    if (isLoadingName || isLoadingDescription || isLoadingGoal || isLoadingBalance || isLoadingOwner || isLoadingDeadline) {
        return <div className="text-center text-lg">Loading...</div>;
    }

    // Extract Twitter handle from description
    const extractTwitterHandle = (desc: string | undefined) => {
        if (!desc) return null;
        const verifiedMatch = desc.match(/🐦 Verified Creator: @(\w+)/);
        if (verifiedMatch) {
            return { handle: verifiedMatch[1], verified: true };
        }
        
        const unverifiedMatch = desc.match(/🐦 Created by: @(\w+)/);
        if (unverifiedMatch) {
            return { handle: unverifiedMatch[1], verified: false };
        }
        
        return null;
    };

    // Extract category from description
    const extractCategory = (desc: string | undefined) => {
        if (!desc) return null;
        const categoryMatch = desc.match(/📂 Category: (\w+)/);
        if (categoryMatch) {
            const category = categoryMatch[1];
            const categoryMap: { [key: string]: string } = {
                music: "🎵 Music",
                book: "📚 Book",
                art: "🎨 Art",
                film: "🎬 Film",
                game: "🎮 Gaming",
                tech: "💻 Tech",
                charity: "❤️ Charity",
                education: "🎓 Education",
                fashion: "👗 Fashion",
                food: "🍕 Food",
                health: "🏥 Health",
                other: "🌟 Other"
            };
            return categoryMap[category] || category;
        }
        return null;
    };

    // Check if backer info collection is enabled
    const isBackerInfoEnabled = (desc: string | undefined) => {
        if (!desc) return false;
        return desc.includes('🔒 Backer Info Collection: Enabled');
    };

    const twitterData = extractTwitterHandle(campaignDescription);
    const categoryData = extractCategory(campaignDescription);
    const backerInfoEnabled = isBackerInfoEnabled(campaignDescription);
    const cleanDescription = campaignDescription?.replace(/📂 Category: [^\n]+\n\n/g, '').replace(/\n\n🐦 (Verified Creator|Created by): @[^\n]+/g, '').replace(/\n\n🔒 Backer Info Collection: Enabled/g, '').replace(/🔒 Backer Info Collection: Enabled/g, '').replace(/\n\n🖼️ Image: https?:\/\/[^\s\n]+/g, '') || campaignDescription;

    // Calculate the funded percentage
    const totalBalance = balance?.toString() || "0";
    const totalGoal = goal?.toString() || "1";
    let balancePercentage = (parseInt(totalBalance) / parseInt(totalGoal)) * 100;
    
    const actualPercentage = balancePercentage;
    const isFullyFunded = balancePercentage >= 100;
    const isWithdrawn = localStorage.getItem(`withdrawn_${campaignAddress}`) === 'true';
    const showAsFullyFunded = isFullyFunded || isWithdrawn;

    // Convert deadline from uint256 timestamp to Date object
    const deadlineDate = deadline ? new Date(parseInt(deadline.toString()) * 1000) : null;
    const formattedDeadline = deadlineDate
        ? deadlineDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
          })
        : "No deadline available";

    return (
        <>
            <style jsx>{`
                @keyframes gradientMove {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
            
            <div className="group bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl sm:hover:shadow-2xl dark:hover:shadow-2xl dark:shadow-gray-900/50 transition-all duration-300 sm:duration-500 transform hover:scale-[1.01] sm:hover:scale-[1.02] overflow-hidden w-full border border-gray-100 dark:border-gray-700">
            
            {/* Loading State */}
            {imageLoading && (
                <div className="relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 h-32 sm:h-40 lg:h-48 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 border-4 border-[#e94560]/30 dark:border-[#e94560]/50 border-t-[#e94560] dark:border-t-[#ff8c42] rounded-full animate-spin"></div>
                        <p className="text-gray-500 text-sm font-medium">Loading image...</p>
                    </div>
                    {categoryData && (
                        <div className="absolute top-2 sm:top-3 lg:top-4 left-2 sm:left-3 lg:left-4">
                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium bg-white/90 text-gray-800 rounded-full backdrop-blur-sm">
                                {categoryData}
                            </span>
                        </div>
                    )}
                    <div className="absolute top-2 sm:top-3 lg:top-4 right-2 sm:right-3 lg:right-4">
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium bg-black/70 text-white rounded-full backdrop-blur-sm">
                            <span className="hidden sm:inline">Ends: </span>{formattedDeadline}
                        </span>
                    </div>
                    <div className="absolute bottom-2 sm:bottom-3 lg:bottom-4 right-2 sm:right-3 lg:right-4">
                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-bold rounded-full backdrop-blur-sm ${
                            showAsFullyFunded 
                                ? 'bg-green-500/90 text-white animate-pulse' 
                                : 'bg-white/90 text-gray-800'
                        }`}>
                            {showAsFullyFunded ? '✅' : `${actualPercentage.toFixed(0)}%`}
                        </span>
                    </div>
                </div>
            )}
            
            {/* Campaign Image */}
            {campaignImage && !imageError && !imageLoading && (
                <div className="relative overflow-hidden">
                    <Image
                        src={campaignImage}
                        alt={campaignName || "Campaign image"}
                        width={400}
                        height={240}
                        className="w-full h-32 sm:h-40 lg:h-48 object-cover group-hover:scale-105 transition-transform duration-300 sm:duration-500"
                        onError={handleImageError}
                        onLoad={() => {
                            setImageError(false);
                            setImageLoading(false);
                        }}
                        unoptimized={true}
                        priority={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Category Badge - Top Left */}
                    {categoryData && (
                        <div className="absolute top-2 sm:top-3 lg:top-4 left-2 sm:left-3 lg:left-4">
                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium bg-white/90 text-gray-800 rounded-full backdrop-blur-sm">
                                {categoryData}
                            </span>
                        </div>
                    )}
                    
                    {/* End Date Badge - Top Right */}
                    <div className="absolute top-2 sm:top-3 lg:top-4 right-2 sm:right-3 lg:right-4">
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium bg-black/70 text-white rounded-full backdrop-blur-sm">
                            <span className="hidden sm:inline">Ends: </span>{formattedDeadline}
                        </span>
                    </div>
                    
                    {/* Funding Status Badge - Bottom Right */}
                    <div className="absolute bottom-2 sm:bottom-3 lg:bottom-4 right-2 sm:right-3 lg:right-4">
                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-bold rounded-full backdrop-blur-sm ${
                            showAsFullyFunded 
                                ? 'bg-green-500/90 text-white animate-pulse' 
                                : 'bg-white/90 text-gray-800'
                        }`}>
                            {showAsFullyFunded ? '✅' : `${actualPercentage.toFixed(0)}%`}
                        </span>
                    </div>
                </div>
            )}
            
            {/* Fallback when no image or image fails to load */}
            {(!campaignImage || imageError) && !imageLoading && (
                <div className="relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 h-32 sm:h-40 lg:h-48 flex items-center justify-center">
                    <div className="text-center">
                        <div 
                            className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#e94560] via-[#f45a06] to-[#ff8c42] rounded-full flex items-center justify-center"
                            style={{
                                backgroundSize: '200% 200%',
                                animation: 'gradientMove 4s ease-in-out infinite'
                            }}
                        >
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-sm font-medium">Creative Project</p>
                        <p className="text-gray-400 text-xs">Image unavailable</p>
                    </div>
                    
                    {/* Badges for fallback state */}
                    {categoryData && (
                        <div className="absolute top-2 sm:top-3 lg:top-4 left-2 sm:left-3 lg:left-4">
                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium bg-white/90 text-gray-800 rounded-full backdrop-blur-sm">
                                {categoryData}
                            </span>
                        </div>
                    )}
                    
                    <div className="absolute top-2 sm:top-3 lg:top-4 right-2 sm:right-3 lg:right-4">
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium bg-black/70 text-white rounded-full backdrop-blur-sm">
                            <span className="hidden sm:inline">Ends: </span>{formattedDeadline}
                        </span>
                    </div>
                    
                    <div className="absolute bottom-2 sm:bottom-3 lg:bottom-4 right-2 sm:right-3 lg:right-4">
                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-bold rounded-full backdrop-blur-sm ${
                            showAsFullyFunded 
                                ? 'bg-green-500/90 text-white animate-pulse' 
                                : 'bg-white/90 text-gray-800'
                        }`}>
                            {showAsFullyFunded ? '✅' : `${actualPercentage.toFixed(0)}%`}
                        </span>
                    </div>
                </div>
            )}

            <div className="p-2 sm:p-3 lg:p-4">
                {/* Project Name */}
                <h5 className="mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg font-bold leading-tight text-[#f45a06] dark:text-[#ff8c42] group-hover:text-[#ff8c42] dark:group-hover:text-[#ffa366] transition-colors duration-300">
                    {campaignName || "Loading..."}
                </h5>

                {/* Contact Collection Badge */}
                {backerInfoEnabled && (
                    <div className="mb-2 sm:mb-3">
                        <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium bg-gradient-to-r from-green-100 to-green-200 dark:from-green-800 dark:to-green-700 text-green-700 dark:text-green-200 rounded-full border border-green-300 dark:border-green-600">
                            🔒 Contact Collection
                        </span>
                    </div>
                )}

                {/* Project Description */}
                <p className="mb-2 sm:mb-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {cleanDescription ? cleanDescription.split(' ').slice(0, 8).join(' ') + (cleanDescription.split(' ').length > 8 ? '...' : '') : 'No description available'}
                </p>

                {/* Simple Funding Info */}
                <div className={`mb-2 sm:mb-3 p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${
                    showAsFullyFunded 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700' 
                        : 'bg-gray-50 dark:bg-gray-800/50'
                }`}>
                    <div className="flex justify-between items-center text-xs sm:text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-300">Raised: <span className="font-medium text-gray-900 dark:text-gray-100">${totalBalance}</span></span>
                        <span className="text-gray-600 dark:text-gray-300">Goal: <span className="font-medium text-gray-900 dark:text-gray-100">${totalGoal}</span></span>
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-1 sm:mb-2">
                        {actualPercentage.toFixed(1)}% funded
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 sm:h-1.5 relative overflow-hidden">
                        <div 
                            className={`h-1 sm:h-1.5 rounded-full transition-all duration-1000 ease-out ${
                                showAsFullyFunded
                                    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                                    : 'bg-gradient-to-r from-blue-400 to-purple-500'
                            }`}
                            style={{ 
                                width: `${Math.min(actualPercentage, 100)}%`,
                            }}
                        />
                        {showAsFullyFunded && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                        )}
                    </div>
                </div>

                {/* Twitter Badge and Owner Address */}
                <div className="mb-2 sm:mb-3 flex items-center justify-between">
                    {twitterData ? (
                        <a
                            href={`https://x.com/${twitterData.handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full transition-all duration-200 hover:scale-105 hover:shadow-md ${
                                twitterData.verified
                                    ? 'bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-800 dark:to-cyan-800 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-600 hover:from-blue-200 hover:to-cyan-200 dark:hover:from-blue-700 dark:hover:to-cyan-700'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            <FaXTwitter className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                            @{twitterData.handle}
                            {twitterData.verified && <span className="ml-1 text-blue-500 dark:text-blue-400">✓</span>}
                        </a>
                    ) : (
                        <div></div>
                    )}
                    
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        @{ownerAddress?.slice(0, 4)}...{ownerAddress?.slice(-3)}
                    </span>
                </div>

                {/* Fund Project Button */}
                <Link href={`/campaign/${campaignAddress}`}>
                    <button className="w-full mt-2 sm:mt-3 lg:mt-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 dark:from-purple-500 dark:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-700 text-white font-medium py-2 sm:py-2.5 lg:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all duration-300 transform hover:scale-[1.01] sm:hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]">
                        <span className="sm:hidden">Fund →</span>
                        <span className="hidden sm:inline">Fund Project →</span>
                    </button>
                </Link>
            </div>
        </div>
        </>
    );
};
