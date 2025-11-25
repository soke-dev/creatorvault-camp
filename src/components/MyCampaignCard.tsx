import { client } from "@/app/client";
import Link from "next/link";
import { getContract } from "thirdweb";
import { chain } from "@/app/constants/chains";
import { useReadContract } from "thirdweb/react";
import { useState, useEffect, useCallback } from "react";
import Image from 'next/image';
import { campaignImageService } from '../lib/pocketbase';
import { devLog } from '@/utils/debugLog';


type MyCampaignCardProps = {
    contractAddress: string;
};

export const MyCampaignCard: React.FC<MyCampaignCardProps> = ({ contractAddress }) => {
    const [campaignImage, setCampaignImage] = useState<string>("");
    const [imageError, setImageError] = useState<boolean>(false);
    const [isWithdrawn, setIsWithdrawn] = useState<boolean>(false);

    const contract = getContract({
        client: client,
        chain: chain,
        address: contractAddress,
    });

    // Get Campaign Name
    const { data: name } = useReadContract({
        contract, 
        method: "function name() view returns (string)", 
        params: []
    });

    // Get Campaign Description
    const { data: description } = useReadContract({
        contract, 
        method: "function description() view returns (string)", 
        params: [] 
    });

    // Fetch campaign image from API route (bypasses CORS) with retry logic
    const fetchCampaignImageFromDB = useCallback(async (retryCount = 0) => {
        try {
            devLog(`[MyCampaignCard] Fetching image for campaign: ${contractAddress} (attempt ${retryCount + 1})`);
            
            const response = await fetch(`/api/campaign-image/${contractAddress}`, {
                cache: 'force-cache', // Use cache when available
            });
            
            devLog(`[MyCampaignCard] Response status: ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                devLog(`[MyCampaignCard] Response data:`, data);
                
                if (data.success && data.data?.image_url) {
                    devLog(`[MyCampaignCard] Setting image URL: ${data.data.image_url}`);
                    setCampaignImage(data.data.image_url);
                    return true;
                }
            } else if (response.status === 404) {
                // Don't retry 404s - no image exists
                devLog(`[MyCampaignCard] No image exists for campaign: ${contractAddress}`);
                return false;
            } else if (response.status === 429) {
                // Rate limited - wait longer before retry
                if (retryCount < 1) {
                    devLog(`[MyCampaignCard] Rate limited, retrying in 5 seconds... (attempt ${retryCount + 2})`);
                    setTimeout(() => fetchCampaignImageFromDB(retryCount + 1), 5000);
                    return false;
                }
            } else {
                const errorData = await response.json();
                devLog(`[MyCampaignCard] API error:`, errorData);
                
                // Retry logic for 5xx errors only
                if (response.status >= 500 && retryCount < 1) {
                    devLog(`[MyCampaignCard] Server error, retrying in 3 seconds... (attempt ${retryCount + 2})`);
                    setTimeout(() => fetchCampaignImageFromDB(retryCount + 1), 3000);
                    return false;
                }
            }
        } catch (error) {
            console.error(`[MyCampaignCard] Network error fetching image:`, error);
            
            // Retry on network errors (reduced retry count)
            if (retryCount < 1) {
                devLog(`[MyCampaignCard] Network error, retrying in 3 seconds... (attempt ${retryCount + 2})`);
                setTimeout(() => fetchCampaignImageFromDB(retryCount + 1), 3000);
                return false;
            }
        }
        
        devLog(`[MyCampaignCard] No image found for campaign: ${contractAddress}`);
        return false;
    }, [contractAddress]);

    // Load campaign image with improved fallback logic
    useEffect(() => {
        const loadImage = async () => {
            devLog(`[MyCampaignCard] Loading image for campaign: ${contractAddress}`);
            
            // First try PocketBase database
            const dbSuccess = await fetchCampaignImageFromDB();
            
            if (!dbSuccess && !campaignImage) {
                devLog(`[MyCampaignCard] Database fetch failed, trying localStorage fallback`);
                
                // Fallback to localStorage (for backwards compatibility)
                const imageKey = `campaign_image_${contractAddress}`;
                const storedImage = localStorage.getItem(imageKey);
                
                if (storedImage) {
                    devLog(`[MyCampaignCard] Found stored image: ${storedImage}`);
                    setCampaignImage(storedImage);
                } else if (description) {
                    devLog(`[MyCampaignCard] Trying to extract image from description`);
                    
                    // Extract image URL from description as last resort
                    const imageMatch = description.match(/🖼️ Image: (https?:\/\/[^\s\n]+)/);
                    if (imageMatch) {
                        devLog(`[MyCampaignCard] Found image in description: ${imageMatch[1]}`);
                        setCampaignImage(imageMatch[1]);
                    } else {
                        devLog(`[MyCampaignCard] No image found anywhere for campaign: ${contractAddress}`);
                    }
                }
            }
        };
        
        if (contractAddress && !campaignImage) {
            loadImage();
        }
    }, [contractAddress, description, campaignImage, fetchCampaignImageFromDB]);

    // Get Campaign Goal and Funding Progress
    const { data: goal } = useReadContract({
        contract,
        method: "function goal() view returns (uint256)",
        params: []
    });

    const { data: balance } = useReadContract({
        contract,
        method: "function getContractBalance() view returns (uint256)",
        params: []
    });

    // Get campaign tiers to show backer information
    const { data: tiers } = useReadContract({
        contract,
        method: "function getTiers() view returns ((string name, uint256 amount, uint256 backers)[])",
        params: []
    });

    // Calculate Funding Percentage
    let balancePercentage = goal && balance ? (parseInt(balance.toString()) / parseInt(goal.toString())) * 100 : 0;
    
    // If campaign is withdrawn, show 100% progress regardless of current balance
    if (isWithdrawn) {
        balancePercentage = 100;
    }

    // Extract category from description
    const extractCategory = (desc: string | undefined) => {
        if (!desc) return null;
        const categoryMatch = desc.match(/📂 Category: (\w+)/);
        if (categoryMatch) {
            const category = categoryMatch[1];
            // Map category to display format
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

    const categoryData = extractCategory(description);
    const backerInfoEnabled = isBackerInfoEnabled(description);
    const cleanDescription = description?.replace(/📂 Category: [^\n]+\n\n/g, '').replace(/\n\n🐦 (Verified Creator|Created by): @[^\n]+/g, '').replace(/\n\n🔒 Backer Info Collection: Enabled/g, '').replace(/🔒 Backer Info Collection: Enabled/g, '').replace(/\n\n🖼️ Image: https?:\/\/[^\s\n]+/g, '') || description;

    return (
        <div className="group bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg dark:hover:shadow-gray-900/50 transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Campaign Image - Always rendered with fallback */}
            <div className="relative overflow-hidden">
                {campaignImage && !imageError ? (
                    <Image
                        src={campaignImage}
                        alt={name || "Campaign image"}
                        width={400}
                        height={150}
                        className="w-full h-28 sm:h-32 lg:h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={() => {
                            setImageError(true);
                        }}
                        onLoad={() => setImageError(false)}
                        unoptimized={true}
                    />
                ) : (
                    <div className="w-full h-28 sm:h-32 lg:h-36 bg-gradient-to-br from-[#e94560]/10 via-[#f45a06]/10 to-[#ff8c42]/10 dark:from-[#e94560]/20 dark:via-[#f45a06]/20 dark:to-[#ff8c42]/20 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-[#e94560] to-[#f45a06] rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="text-gray-600 dark:text-gray-300 text-xs font-medium">Creative Project</div>
                        </div>
                    </div>
                )}
                {/* Status Badge */}
                <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                    <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold rounded-full backdrop-blur-sm ${
                        isWithdrawn 
                            ? 'bg-green-500/90 text-white' 
                            : balancePercentage >= 100 
                                ? 'bg-blue-500/90 text-white' 
                                : 'bg-white/90 text-gray-800'
                    }`}>
                        {isWithdrawn ? '✅ Withdrawn' : balancePercentage >= 100 ? '🎯 Funded' : `${balancePercentage.toFixed(0)}%`}
                    </span>
                </div>
            </div>

            <div className="p-2 sm:p-3">
                {/* Campaign Title */}
                <h5 className="mb-1 sm:mb-2 text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#f45a06] dark:group-hover:text-[#ff8c42] transition-colors duration-300 truncate">
                    {name || "Loading..."}
                </h5>

                {/* Category and Info Badges */}
                <div className="flex flex-wrap gap-1 mb-1 sm:mb-2">
                    {categoryData && (
                        <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 text-xs font-medium bg-purple-700/10 dark:bg-purple-600/20 text-purple-700 dark:text-purple-300 rounded-full">
                            {categoryData}
                        </span>
                    )}
                    {backerInfoEnabled && (
                        <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300 rounded-full">
                            🔒
                        </span>
                    )}
                </div>

                {/* Progress Bar */}
                {goal && balance && (
                    <div className="mb-1 sm:mb-2">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
                            <span>${isWithdrawn ? goal?.toString() : balance?.toString()}</span>
                            <span>${goal?.toString()}</span>
                        </div>
                        <div className="w-full h-1 sm:h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-700 via-purple-500 to-[#f45a06] rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(balancePercentage, 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Compact Supporter Statistics */}
                {tiers && tiers.length > 0 && (
                    <div className="mb-2 sm:mb-3 p-1.5 sm:p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-600 dark:text-gray-300">Supporters:</span>
                            <span className="font-bold text-[#f45a06] dark:text-[#ff8c42]">
                                {tiers.reduce((total, tier) => total + parseInt(tier.backers.toString()), 0)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Action Button */}
                <Link href={`/campaign/${contractAddress}`} className="block">
                    <button className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-800 via-purple-600 to-[#f45a06] rounded-lg hover:shadow-md transition-all duration-300">
                        {isWithdrawn ? 'View Completed' : 'Manage'}
                    </button>
                </Link>
            </div>
        </div>
    );
};
