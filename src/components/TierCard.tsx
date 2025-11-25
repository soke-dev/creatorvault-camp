import { prepareContractCall, ThirdwebContract, sendTransaction, getContract, readContract } from "thirdweb";
import { TransactionButton, useActiveAccount } from "thirdweb/react";
import { campaignSupporterService, campaignNFTService, campaignImageService, recentActivitiesService, campaignFundingService, communitySupportService, leaderboardService } from "@/lib/pocketbase";
import { storeFundingData } from '@/utils/storageUtils';
import { useToast } from '@/components/Toast';
import { client } from "@/app/client";
import { chain } from "@/app/constants/chains";
import { CAMPAIGN_NFT_CONTRACT } from "@/app/constants/contracts";
import { useState } from "react";
import { devLog } from '@/utils/debugLog';

type Tier = {
    name: string;
    amount: bigint;
    backers: bigint;
};

type TierCardProps = {
    tier: Tier;
    index: number;
    contract: ThirdwebContract;
    isEditing: boolean;
    compact?: boolean;
    isWithdrawn?: boolean;
    onFundingSuccess?: () => void; // Callback to refresh parent component state
};

export const TierCard: React.FC<TierCardProps> = ({ tier, index, contract, isEditing, compact = false, isWithdrawn = false, onFundingSuccess }) => {
    const account = useActiveAccount();
    const campaignAddress = contract.address;
    const { showSuccess, showError, showInfo } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFundingSuccess = async (receipt?: any) => {
        devLog(`[TierCard] 🔥 FUNCTION CALLED! handleFundingSuccess for campaign: ${campaignAddress}, user: ${account?.address}`);
        devLog(`[TierCard] 🔥 RECEIPT RECEIVED:`, receipt);
        devLog(`[TierCard] 🔥 ACCOUNT OBJECT:`, account);
        
        // Mark this user as having funded this campaign and store tier info
        if (account?.address && campaignAddress) {
            devLog(`[TierCard] ✅ Starting database operations for account: ${account.address}, campaign: ${campaignAddress}`);
            try {
                // Primary storage: Save to PocketBase for reliable online storage
                const currentAmount = parseInt(tier.amount.toString());
                devLog(`[TierCard] Calculated amount: ${currentAmount}`);
                
                try {
                    devLog(`[TierCard] Granting media access for campaign: ${campaignAddress}, supporter: ${account.address}, amount: ${currentAmount}`);
                    await campaignSupporterService.grantAudioAccess(
                        campaignAddress,
                        account.address,
                        currentAmount
                    );
                    devLog(`[TierCard] Media access granted successfully`);
                } catch (error) {
                    console.error(`[TierCard] Failed to grant media access:`, error);
                }

                // Get campaign details for activity record
                let campaignName = 'Unknown Campaign';
                try {
                    const campaignContract = getContract({
                        client: client,
                        chain: chain,
                        address: campaignAddress,
                    });
                    
                    const name = await readContract({
                        contract: campaignContract,
                        method: "function name() view returns (string)",
                        params: []
                    });
                    campaignName = name;
                    
                    const owner = await readContract({
                        contract: campaignContract,
                        method: "function owner() view returns (address)",
                        params: []
                    });

                    // Create activity record for recent activities
                    await recentActivitiesService.create({
                        campaign_address: campaignAddress,
                        supporter_address: account.address,
                        creator_address: owner,
                        activity_type: 'funding',
                        amount: currentAmount / 1e6, // Convert from USDT wei to USDT
                        tier_title: tier.name,
                        campaign_name: campaignName,
                        message: `New supporter funded ${tier.name} tier with $${(currentAmount / 1e6).toFixed(2)} USDT`,
                        is_read: false
                    });

                    // Create funding record for cross-device supporter tracking
                    // NOTE: We now rely on campaignSupporterService.grantAudioAccess() above 
                    // which automatically creates the supporter record. No need for separate campaign_funding collection.
                    devLog(`[TierCard] ✅ Supporter record already created via grantAudioAccess`);

                    // Create community support record for global feed
                    await communitySupportService.create({
                        user_address: account.address,
                        user_name: account.address.slice(0, 6) + '...' + account.address.slice(-4), // Short address format
                        support_type: 'tier_purchase',
                        campaign_address: campaignAddress,
                        campaign_name: campaignName,
                        amount: (currentAmount / 1e6).toFixed(2), // Convert from USDT wei to USDT string
                        tier_name: tier.name,
                        message: `Supported ${campaignName} with ${tier.name} tier`
                    });
                    
                    // Update leaderboard entry for the supporter
                    try {
                        await leaderboardService.updateSupporter(account.address, campaignAddress, currentAmount);
                        devLog(`[TierCard] Leaderboard updated for ${account.address}`);
                    } catch (error) {
                        console.error('Failed to update leaderboard:', error);
                    }
                } catch (error) {
                    console.error('Failed to create activity record:', error);
                }

                // Secondary storage: Use safe localStorage utility
                const storageSuccess = storeFundingData(
                    campaignAddress,
                    account.address,
                    tier.name,
                    tier.amount.toString()
                );
                
                if (!storageSuccess) {
                    console.warn('Failed to store funding data in localStorage, relying on PocketBase only');
                }
            } catch (overallError) {
                console.error('🚨 [TierCard] CRITICAL ERROR in funding success handler:', overallError);
                console.error('🚨 [TierCard] Failed to save funding data to database!', overallError);
                showError("Database Error", "Funding succeeded but failed to save to database. Please check console.");
            }
        }

        // Auto-mint NFT receipt after successful funding
        if (account?.address && campaignAddress) {
            const currentAmount = parseInt(tier.amount.toString());

            // Get campaign image for receipt NFT
            let campaignImage = '/logo.png'; // Default fallback
            try {
                const imageRecord = await campaignImageService.getByCampaignAddress(campaignAddress);
                if (imageRecord?.image_url) {
                    campaignImage = imageRecord.image_url;
                }
            } catch (error) {
                console.error('Failed to fetch campaign image for receipt:', error);
            }

            // Mint NFT receipt for the supporter
            try {
                devLog(`[TierCard] Minting NFT receipt for supporter: ${account.address}, campaign: ${campaignAddress}`);
                
                // Get NFT contract
                const nftContract = getContract({
                    client: client,
                    chain: chain,
                    address: CAMPAIGN_NFT_CONTRACT,
                });
                
                // Check if user has already minted for this campaign (check database first, then blockchain)
                try {
                    // First check database to avoid duplicates
                    const existingNFT = await campaignNFTService.getBySupporterAndCampaign(
                        account.address, 
                        campaignAddress
                    );
                    
                    if (existingNFT && existingNFT.mint_status === 'minted') {
                        devLog(`[TierCard] User already has an NFT for this campaign in database:`, existingNFT);
                        
                        // Don't create another record, just proceed with funding
                        // Store receipt info for dashboard display (but don't duplicate database entry)
                        const mintedKey = `mintedReceipt_${campaignAddress}_${account.address}`;
                        const receiptData = {
                            campaignAddress,
                            tierName: tier.name,
                            amount: currentAmount,
                            timestamp: new Date().toISOString(),
                            imageUrl: campaignImage,
                            type: 'funding_receipt'
                        };
                        localStorage.setItem(mintedKey, JSON.stringify(receiptData));
                        
                        devLog(`[TierCard] Funding receipt info stored in localStorage`);
                        return;
                    }
                } catch (error) {
                    console.error(`[TierCard] Failed to check database for existing NFT:`, error);
                }

                // Fallback: check blockchain state
                const hasMinted = await readContract({
                    contract: nftContract,
                    method: "function hasUserMinted(address user, address campaignAddress) view returns (bool)",
                    params: [account.address, campaignAddress],
                });
                
                if (!hasMinted) {
                    // Prepare the mint transaction
                    const mintCall = prepareContractCall({
                        contract: nftContract,
                        method: "function mintCampaignNFT(address campaignAddress, address supporter)",
                        params: [campaignAddress, account.address],
                    });
                    
                    // Execute the minting transaction
                    const mintResult = await sendTransaction({
                        transaction: mintCall,
                        account: account,
                    });
                    
                    devLog(`[TierCard] NFT receipt minted successfully! Transaction hash: ${mintResult.transactionHash}`);
                    
                    // Update NFT record status to 'minted'
                    await campaignNFTService.create({
                        campaign_address: campaignAddress,
                        supporter_address: account.address,
                        tier_id: index,
                        mint_status: 'minted',
                        transaction_hash: mintResult.transactionHash,
                        nft_metadata: JSON.stringify({
                            tierName: tier.name,
                            amount: currentAmount,
                            timestamp: new Date().toISOString(),
                            auto_minted: true
                        })
                    });
                    
                    // Store minted NFT receipt info for dashboard display
                    const mintedKey = `mintedReceipt_${campaignAddress}_${account.address}`;
                    const receiptData = {
                        campaignAddress,
                        tierName: tier.name,
                        amount: currentAmount,
                        timestamp: new Date().toISOString(),
                        transactionHash: mintResult.transactionHash,
                        imageUrl: campaignImage,
                        type: 'funding_receipt'
                    };
                    localStorage.setItem(mintedKey, JSON.stringify(receiptData));
                    
                } else {
                    devLog(`[TierCard] User already has an NFT receipt for this campaign on blockchain, skipping mint`);
                    
                    // Store receipt info for dashboard display but don't create duplicate database entry
                    const mintedKey = `mintedReceipt_${campaignAddress}_${account.address}`;
                    const receiptData = {
                        campaignAddress,
                        tierName: tier.name,
                        amount: currentAmount,
                        timestamp: new Date().toISOString(),
                        imageUrl: campaignImage,
                        type: 'funding_receipt'
                    };
                    localStorage.setItem(mintedKey, JSON.stringify(receiptData));
                }
                
            } catch (error) {
                console.error(`[TierCard] Failed to mint NFT receipt:`, error);
                // Create NFT record in pending state if automatic minting fails
                try {
                    await campaignNFTService.create({
                        campaign_address: campaignAddress,
                        supporter_address: account.address,
                        tier_id: index,
                        mint_status: 'failed',
                        nft_metadata: JSON.stringify({
                            tierName: tier.name,
                            amount: currentAmount,
                            timestamp: new Date().toISOString(),
                            error: (error as Error).message || 'Unknown error'
                        })
                    });
                } catch (dbError) {
                    console.error(`[TierCard] Failed to create NFT record:`, dbError);
                }
            }
        }
        
        showSuccess(
            "🎉 Funded Successfully!",
            "Your NFT receipt has been minted and added to your dashboard. You can now submit your contact information to help the creator deliver rewards. If this is a music or video campaign, you now have access to exclusive content! The page will refresh to show the mint form."
        );
        
        // Call parent callback to refresh state, or fallback to page reload
        if (onFundingSuccess) {
            setTimeout(() => {
                onFundingSuccess();
            }, 2000); // Give user time to read the success message
        } else {
            // Fallback: refresh the page after successful funding so mint form and updated status show
            setTimeout(() => {
                window.location.reload();
            }, 3000); // Give user time to read the success message
        }
    };

    // Compact version - just the support button
    if (compact) {
        if (isWithdrawn) {
            return (
                <button
                    disabled
                    className="w-full px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md cursor-not-allowed"
                >
                    Withdrawn
                </button>
            );
        }
        
        return (
            <TransactionButton
                transaction={() => prepareContractCall({
                    contract: contract,
                    method: "function fund(uint256 _tierIndex) payable",
                    params: [BigInt(index)],
                    value: tier.amount,
                })}
                onTransactionSent={() => {
                    setIsProcessing(true);
                    showInfo("Transaction Sent", "Processing your funding transaction...");
                }}
                onTransactionConfirmed={async (receipt) => {
                    try {
                        await handleFundingSuccess(receipt);
                        // Call parent callback to refresh data
                        if (onFundingSuccess) {
                            onFundingSuccess();
                        }
                        showSuccess("🎉 Funding Successful!", `Thank you for supporting the ${tier.name} tier!`);
                    } finally {
                        setIsProcessing(false);
                    }
                }}
                onError={(error) => {
                    setIsProcessing(false);
                    showError("Transaction Failed", error.message);
                }}
                className="w-full px-2 py-1 text-xs font-medium text-white bg-gradient-to-r from-purple-700 via-purple-500 to-[#f45a06] rounded-md hover:from-purple-800 hover:to-[#f45a06] transition-all duration-300 disabled:opacity-50"
                disabled={isProcessing}
            >
                {isProcessing ? (
                    <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                    </div>
                ) : (
                    "Support"
                )}
            </TransactionButton>
        );
    }

    return (
        <div className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl dark:hover:shadow-gray-900/50 transition-all duration-300 border border-gray-100 dark:border-gray-700 w-80 mx-3 mb-6 hover:scale-105 hover:border-purple-700/30 dark:hover:border-purple-500/50">
            {/* Tier Header */}
            <div className="mb-6">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#f45a06] dark:group-hover:text-[#ff8c42] transition-colors">
                        {tier.name}
                    </h3>
                    <div className="bg-gradient-to-r from-purple-700/10 via-purple-500/10 to-[#f45a06]/10 dark:from-purple-600/20 dark:via-purple-400/20 dark:to-[#ff8c42]/20 px-3 py-1 rounded-full">
                        <span className="text-sm font-medium text-[#f45a06] dark:text-[#ff8c42]">
                            {tier.backers.toString()} backers
                        </span>
                    </div>
                </div>
                
                {/* Amount Display */}
                <div className="flex items-baseline mb-4">
                    <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">${tier.amount.toString()}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">contribution</span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
                {isWithdrawn ? (
                    <button
                        disabled
                        className="w-full px-6 py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-xl cursor-not-allowed"
                    >
                        <svg className="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Campaign Completed - Funds Withdrawn
                    </button>
                ) : (
                    <TransactionButton
                        transaction={() =>
                            prepareContractCall({
                                contract: contract,
                                method: "function fund(uint256 _tierIndex) payable",
                                params: [BigInt(index)],
                                value: tier.amount,
                            })
                        }
                        onTransactionSent={() => {
                            setIsProcessing(true);
                            showInfo("Transaction Sent", "Processing your funding transaction...");
                        }}
                        onError={(error) => {
                            setIsProcessing(false);
                            showError("Transaction Error", error.message);
                        }}
                        onTransactionConfirmed={async () => {
                            try {
                                await handleFundingSuccess();
                            } finally {
                                setIsProcessing(false);
                            }
                        }}
                        className="w-full px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-800 via-purple-600 to-[#f45a06] rounded-xl shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-700/30 transition-all duration-300 disabled:opacity-50"
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <div className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing Transaction...
                            </div>
                        ) : (
                            <>
                                <svg className="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                Support This Project
                            </>
                        )}
                    </TransactionButton>
                )}

                {isEditing && (
                    <TransactionButton
                        transaction={() =>
                            prepareContractCall({
                                contract: contract,
                                method: "function removeTier(uint256 _index)",
                                params: [BigInt(index)],
                            })
                        }
                        onError={(error) => showError("Remove Tier Error", error.message)}
                        onTransactionConfirmed={async () => showSuccess("Tier Removed", "The tier has been successfully removed from your campaign!")}
                        className="w-full px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 transition-all duration-300"
                    >
                        <svg className="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove Tier
                    </TransactionButton>
                )}
            </div>

            {/* Tier Benefits or Description */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Support this creative project at the <strong className="dark:text-gray-100">${tier.amount.toString()}</strong> level and help bring this vision to life.
                </p>
            </div>
        </div>
    );
};
