'use client';

import { useState, useEffect, useMemo } from 'react';
import { useActiveAccount } from "thirdweb/react";
import { getContract } from "thirdweb";
import { client } from "../client";
import { defineChain } from "thirdweb/chains";
import { readContract } from "thirdweb";
import { CampaignCard } from "../../components/CampaignCard";
import { useTheme } from '../../contexts/ThemeContext';
import { CROWDFUNDING_FACTORY } from '../constants/contracts';
import { devLog } from '@/utils/debugLog';

const chain = defineChain(123420001114);

export default function ExplorePage() {
    const { theme } = useTheme();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const campaignsPerPage = 9;

    const account = useActiveAccount();

    const contract = getContract({
        client: client,
        chain: chain,
        address: CROWDFUNDING_FACTORY
    });

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                setIsLoading(true);
                
                // Get all campaigns using the same method as the main page
                const allCampaigns = await readContract({
                    contract,
                    method: "function getAllCampaigns() view returns ((address campaignAddress, address owner, string name)[])",
                    params: []
                });

                if (!allCampaigns || allCampaigns.length === 0) {
                    setCampaigns([]);
                    return;
                }

                // For each campaign, fetch detailed information
                const campaignDetailsPromises = allCampaigns.map(async (campaign, index) => {
                    try {
                        // Create contract for individual campaign
                        const campaignContract = getContract({
                            client: client,
                            chain: chain,
                            address: campaign.campaignAddress
                        });

                        // Add timeout to prevent hanging
                        const fetchWithTimeout = async () => {
                            const timeoutPromise = new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Request timeout')), 8000)
                            );

                            const dataPromise = Promise.all([
                                readContract({
                                    contract: campaignContract,
                                    method: "function goal() view returns (uint256)",
                                    params: []
                                }).catch(() => 1000), // Default if fails

                                readContract({
                                    contract: campaignContract,
                                    method: "function getBalance() view returns (uint256)",
                                    params: []
                                }).catch(() => 0), // Default if fails

                                readContract({
                                    contract: campaignContract,
                                    method: "function deadline() view returns (uint256)",
                                    params: []
                                }).catch(() => Date.now() + 30 * 24 * 60 * 60 * 1000), // Default if fails

                                readContract({
                                    contract: campaignContract,
                                    method: "function withdrawn() view returns (bool)",
                                    params: []
                                }).catch(() => false), // Default if fails

                                readContract({
                                    contract: campaignContract,
                                    method: "function description() view returns (string)",
                                    params: []
                                }).catch(() => "Campaign description") // Default if fails
                            ]);

                            return Promise.race([dataPromise, timeoutPromise]);
                        };

                        const [goal, balance, deadline, withdrawn, description] = await fetchWithTimeout() as [bigint, bigint, bigint, boolean, string];

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
                                    tech: "💻 Technology",
                                    charity: "❤️ Charity",
                                    education: "🎓 Education",
                                    fashion: "👗 Fashion",
                                    food: "🍕 Food",
                                    health: "🏥 Health",
                                    other: "🌟 Other"
                                };
                                return categoryMap[category] || category;
                            }
                            return "🌟 Other";
                        };

                        // Determine campaign status
                        const now = Date.now() / 1000; // Convert to seconds
                        const deadlineInSeconds = Number(deadline);
                        const goalAmount = Number(goal);
                        const currentBalance = Number(balance);
                        const isWithdrawn = Boolean(withdrawn);

                        let status = 'active';
                        if (isWithdrawn || currentBalance >= goalAmount) {
                            status = 'funded';
                        } else if (deadlineInSeconds < now) {
                            status = 'expired';
                        }

                        return {
                            id: index,
                            address: campaign.campaignAddress,
                            campaignAddress: campaign.campaignAddress,
                            owner: campaign.owner,
                            name: campaign.name,
                            description: description,
                            goal: goalAmount,
                            deadline: deadlineInSeconds * 1000, // Convert back to milliseconds
                            amountRaised: currentBalance,
                            withdrawn: isWithdrawn,
                            status: status,
                            category: extractCategory(description)
                        };
                    } catch (error) {
                        console.error(`Error fetching details for campaign ${campaign.campaignAddress}:`, error);
                        // Return campaign with basic info if detailed fetch fails
                        return {
                            id: index,
                            address: campaign.campaignAddress,
                            campaignAddress: campaign.campaignAddress,
                            owner: campaign.owner,
                            name: campaign.name,
                            description: "Campaign description",
                            goal: 1000,
                            deadline: Date.now() + 30 * 24 * 60 * 60 * 1000,
                            amountRaised: 0,
                            withdrawn: false,
                            status: 'active',
                            category: "🌟 Other"
                        };
                    }
                });

                const formattedCampaigns = await Promise.all(campaignDetailsPromises);

                // Reverse to show latest campaigns first
                const reorderedCampaigns = formattedCampaigns.reverse();
                
                setCampaigns(reorderedCampaigns);
            } catch (error) {
                console.error("Error fetching campaigns:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCampaigns();
    }, [contract]);

    // Filter campaigns based on search, category, and status with memoization
    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(campaign => {
            const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                campaign.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || campaign.category === selectedCategory;
            const matchesStatus = selectedStatus === 'All' || campaign.status === selectedStatus;
            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [campaigns, searchTerm, selectedCategory, selectedStatus]);

    // Pagination with memoization
    const paginationData = useMemo(() => {
        const totalPages = Math.ceil(filteredCampaigns.length / campaignsPerPage);
        const indexOfLastCampaign = currentPage * campaignsPerPage;
        const indexOfFirstCampaign = indexOfLastCampaign - campaignsPerPage;
        const currentCampaigns = filteredCampaigns.slice(indexOfFirstCampaign, indexOfLastCampaign);
        
        return { totalPages, currentCampaigns };
    }, [filteredCampaigns, currentPage, campaignsPerPage]);

    const { totalPages, currentCampaigns } = paginationData;

    // Get unique categories from campaigns dynamically
    const categories = useMemo(() => {
        const uniqueCategories = new Set(campaigns.map(campaign => campaign.category).filter(Boolean));
        return ['All', ...Array.from(uniqueCategories).sort()];
    }, [campaigns]);

    return (
        <div className={`min-h-screen transition-colors duration-300 ${
            theme === 'dark' 
                ? 'bg-gray-900' 
                : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
        }`}>
            <div className="mx-auto max-w-7xl px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-4 lg:py-6">
                {/* Header Section */}
                <div className={`text-center mb-4 sm:mb-6 lg:mb-8 p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl border ${
                    theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200 shadow-lg'
                }`}>
                    <h1 className={`text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 lg:mb-3 leading-tight ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                        <span className="bg-gradient-to-r from-[#f45a06] to-[#ff8c42] bg-clip-text text-transparent">
                            Explore
                        </span>{' '}
                        <span className="block sm:inline">Projects</span>
                    </h1>
                    <p className={`text-xs sm:text-sm md:text-base lg:text-lg max-w-2xl mx-auto px-1 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                        Discover and support creative campaigns from creators worldwide.
                    </p>
                </div>

                {/* Search and Filter Section */}
                <div className={`mb-6 sm:mb-8 p-4 sm:p-5 lg:p-6 rounded-lg sm:rounded-xl border ${
                    theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200 shadow-md'
                }`}>
                    {/* Status Filter Toggles */}
                    <div className="mb-4 sm:mb-6">
                        <h3 className={`text-xs sm:text-sm font-semibold mb-2 sm:mb-3 ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                            Campaign Status
                        </h3>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {['All', 'active', 'funded'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => {
                                        setSelectedStatus(status);
                                        setCurrentPage(1);
                                    }}
                                    className={`px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                                        selectedStatus === status
                                            ? 'bg-gradient-to-r from-[#f45a06] to-[#ff8c42] text-white shadow-lg transform scale-105'
                                            : theme === 'dark'
                                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="hidden sm:inline">
                                        {status === 'All' ? 'All Campaigns' : 
                                         status === 'active' ? '🟢 Active' : 
                                         status === 'funded' ? '🎉 Funded' : status}
                                    </span>
                                    <span className="sm:hidden">
                                        {status === 'All' ? 'All' : 
                                         status === 'active' ? '🟢' : 
                                         status === 'funded' ? '🎉' : status}
                                    </span>
                                    {status !== 'All' && (
                                        <span className="ml-1 sm:ml-2 text-xs opacity-75">
                                            ({campaigns.filter(c => c.status === status).length})
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        {/* Search Bar */}
                        <div className="flex-1">
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search campaigns..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg border focus:ring-2 focus:ring-[#f45a06] focus:border-[#f45a06] transition-colors ${
                                        theme === 'dark'
                                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div className="w-full sm:w-40 lg:w-48">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg border focus:ring-2 focus:ring-[#f45a06] focus:border-[#f45a06] transition-colors ${
                                    theme === 'dark'
                                        ? 'bg-gray-700 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                }`}
                            >
                                {categories.map(category => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Results Count */}
                    <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''} found
                        </p>
                        <div className="flex items-center space-x-2">
                            <span className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Page {currentPage} of {totalPages}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div>
                        {/* Loading header */}
                        <div className="flex flex-col sm:flex-row items-center justify-center py-6 sm:py-8">
                            <div className="relative mb-3 sm:mb-0 sm:mr-4">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full animate-spin"></div>
                                <div className="absolute top-0 left-0 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 border-4 border-[#f45a06] rounded-full animate-spin border-t-transparent"></div>
                            </div>
                            <span className={`text-sm sm:text-base lg:text-lg text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                Loading campaigns...
                            </span>
                        </div>
                        
                        {/* Loading skeleton grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
                            {[...Array(6)].map((_, index) => (
                                <div key={`skeleton-${index}`} className="w-full">
                                    <div className={`rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border ${
                                        theme === 'dark' 
                                            ? 'bg-gray-800 border-gray-700' 
                                            : 'bg-white border-gray-100'
                                    }`}>
                                        {/* Image skeleton */}
                                        <div className={`h-36 sm:h-40 lg:h-48 animate-pulse ${
                                            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                                        }`}>
                                        </div>
                                        
                                        {/* Content skeleton */}
                                        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                                            <div className={`h-4 sm:h-5 lg:h-6 rounded animate-pulse ${
                                                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                                            }`}></div>
                                            <div className={`h-3 sm:h-4 rounded animate-pulse ${
                                                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                                            }`}></div>
                                            <div className={`h-3 sm:h-4 w-3/4 rounded animate-pulse ${
                                                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                                            }`}></div>
                                            
                                            {/* Progress bar skeleton */}
                                            <div className={`p-2 rounded-lg sm:rounded-xl ${
                                                theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
                                            }`}>
                                                <div className={`h-2 sm:h-3 rounded animate-pulse ${
                                                    theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                                                }`}></div>
                                            </div>
                                            
                                            {/* Buttons skeleton */}
                                            <div className="flex space-x-2 pt-2">
                                                <div className={`h-6 sm:h-7 lg:h-8 flex-1 rounded animate-pulse ${
                                                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                                                }`}></div>
                                                <div className={`h-6 sm:h-7 lg:h-8 w-12 sm:w-14 lg:w-16 rounded animate-pulse ${
                                                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                                                }`}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Campaigns Grid */}
                {!isLoading && currentCampaigns.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
                        {currentCampaigns.map((campaign) => (
                            <div key={`${campaign.campaignAddress}-${campaign.id}`} className="w-full">
                                <CampaignCard 
                                    campaignAddress={campaign.campaignAddress}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* No Results */}
                {!isLoading && filteredCampaigns.length === 0 && (
                    <div className={`text-center py-12 sm:py-16 lg:py-20 rounded-lg sm:rounded-xl border ${
                        theme === 'dark'
                            ? 'bg-gray-800 border-gray-700'
                            : 'bg-white border-gray-200'
                    }`}>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-[#f45a06]/20 to-[#ff8c42]/20 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-[#f45a06]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291.94-5.709 2.291M20 12a8 8 0 11-16 0 8 8 0 0116 0z" />
                            </svg>
                        </div>
                        <h3 className={`text-xl sm:text-2xl font-bold mb-3 sm:mb-4 px-4 ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                            No campaigns found
                        </h3>
                        <p className={`text-sm sm:text-base lg:text-lg mb-4 sm:mb-6 max-w-md mx-auto px-4 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                            {campaigns.length === 0 
                                ? "No campaigns have been created yet. Be the first to start a creative project!"
                                : "Try adjusting your search criteria or browse all categories."
                            }
                        </p>
                        {searchTerm || selectedCategory !== 'All' || selectedStatus !== 'All' ? (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedCategory('All');
                                    setSelectedStatus('All');
                                    setCurrentPage(1);
                                }}
                                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#f45a06] to-[#ff8c42] text-white font-semibold text-sm sm:text-base rounded-lg hover:from-[#ff8c42] hover:to-[#ffb366] transition-all duration-300 transform hover:scale-105"
                            >
                                Clear Filters
                            </button>
                        ) : (
                            <a
                                href="/"
                                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#f45a06] to-[#ff8c42] text-white font-semibold text-sm sm:text-base rounded-lg hover:from-[#ff8c42] hover:to-[#ffb366] transition-all duration-300 transform hover:scale-105 inline-block"
                            >
                                Create First Campaign
                            </a>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {!isLoading && totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-1 sm:space-x-2 overflow-x-auto pb-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={`px-2.5 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                                currentPage === 1
                                    ? theme === 'dark'
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : theme === 'dark'
                                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                        >
                            <span className="hidden sm:inline">Previous</span>
                            <span className="sm:hidden">Prev</span>
                        </button>

                        <div className="flex items-center space-x-1 max-w-xs overflow-x-auto">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => {
                                    // Show first page, last page, current page, and pages around current
                                    if (totalPages <= 5) return true;
                                    if (page === 1 || page === totalPages) return true;
                                    if (Math.abs(page - currentPage) <= 1) return true;
                                    return false;
                                })
                                .map((page, index, arr) => {
                                    // Add ellipsis when there's a gap
                                    const showEllipsis = index > 0 && page - arr[index - 1] > 1;
                                    return (
                                        <div key={page} className="flex items-center space-x-1">
                                            {showEllipsis && (
                                                <span className={`px-1 text-xs sm:text-sm ${
                                                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                                }`}>
                                                    ...
                                                </span>
                                            )}
                                            <button
                                                onClick={() => setCurrentPage(page)}
                                                className={`px-2.5 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                                                    currentPage === page
                                                        ? 'bg-gradient-to-r from-[#f45a06] to-[#ff8c42] text-white'
                                                        : theme === 'dark'
                                                            ? 'bg-gray-700 text-white hover:bg-gray-600'
                                                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        </div>
                                    );
                                })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={`px-2.5 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                                currentPage === totalPages
                                    ? theme === 'dark'
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : theme === 'dark'
                                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                        >
                            <span className="hidden sm:inline">Next</span>
                            <span className="sm:hidden">Next</span>
                        </button>
                    </div>
                )}

                {/* Call to Action */}
                {!isLoading && campaigns.length > 0 && (
                    <div className={`mt-12 sm:mt-14 lg:mt-16 text-center p-6 sm:p-8 rounded-xl sm:rounded-2xl border ${
                        theme === 'dark'
                            ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700'
                            : 'bg-gradient-to-br from-[#f45a06]/5 to-[#ff8c42]/10 border-[#f45a06]/20'
                    }`}>
                        <h2 className={`text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 px-4 ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                            Have a creative idea?
                        </h2>
                        <p className={`text-sm sm:text-base lg:text-lg mb-4 sm:mb-6 max-w-2xl mx-auto px-4 ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                            Join our community of creators and bring your project to life. Start your own campaign and get the support you need to make it happen.
                        </p>
                        <a
                            href="/"
                            className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#f45a06] to-[#ff8c42] text-white font-bold text-sm sm:text-base lg:text-lg rounded-lg sm:rounded-xl hover:from-[#ff8c42] hover:to-[#ffb366] transition-all duration-300 transform hover:scale-105 inline-block shadow-lg"
                        >
                            Start Your Campaign
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
