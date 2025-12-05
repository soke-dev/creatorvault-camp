"use client";
import { client } from "@/app/client";
import { TierCard } from "@/components/TierCard";
import { Leaderboard } from "@/components/Leaderboard";
import { CommentsSection } from "@/components/CommentsSection";
import { useParams } from "next/navigation";
import { FaExternalLinkAlt, FaHandHoldingUsd, FaUsers, FaEnvelope } from 'react-icons/fa';
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getContract,
  prepareContractCall,
  ThirdwebContract,
  sendTransaction,
  readContract,
} from "thirdweb";
import { chain } from "@/app/constants/chains";
import {
  lightTheme,
  TransactionButton,
  useActiveAccount,
  useReadContract,
} from "thirdweb/react";
import {
  FaWhatsapp,
  FaTelegram,
  FaDiscord,
  FaLink,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Link from "next/link";
import Image from 'next/image';
import { campaignImageService, campaignAudioService, campaignVideoService, campaignSupporterService, campaignFundingService, campaignNFTService, campaignContactService, leaderboardService } from '@/lib/pocketbase';
import { ImageOptimizer } from '@/utils/imageOptimization';
import { useToast } from '@/components/Toast';
import PromoteCampaignModal from '@/components/PromoteCampaignModal';

export default function CampaignPage() {
  const account = useActiveAccount();
  const { campaignAddress } = useParams();
  const { showSuccess, showError, showInfo } = useToast();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showPromoteModal, setShowPromoteModal] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [campaignImage, setCampaignImage] = useState<string>("");
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(true);
  const [campaignAudio, setCampaignAudio] = useState<any>(null);
  const [campaignVideo, setCampaignVideo] = useState<any>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(true);
  const [isLoadingVideo, setIsLoadingVideo] = useState<boolean>(true);
  const [hasAudioAccess, setHasAudioAccess] = useState<boolean>(false);
  const [hasVideoAccess, setHasVideoAccess] = useState<boolean>(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState<boolean>(false);
  const [contactFormData, setContactFormData] = useState({
    name: '',
    email: '',
    address: '',
    phone: '',
    xUsername: '',
    telegramUsername: ''
  });
  const [hasSubmittedContact, setHasSubmittedContact] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [isClaimingFunds, setIsClaimingFunds] = useState(false);
  const [isWithdrawn, setIsWithdrawn] = useState(false);

  // NFT Minting State
  const [isMinting, setIsMinting] = useState(false);
  const [mintedImageUrl, setMintedImageUrl] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  // Refresh state to trigger contract data refetch
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const contract = getContract({
    client: client,
    chain: chain,
    address: campaignAddress as string,
  });

  const { data: name, isLoading: isLoadingName } = useReadContract({
    contract: contract,
    method: "function name() view returns (string)",
    params: [],
  });

  const { data: description } = useReadContract({
    contract,
    method: "function description() view returns (string)",
    params: [],
  });

  // Fetch campaign image from PocketBase database with file-first approach
  const fetchCampaignImageFromDB = useCallback(async () => {
    try {
      if (campaignAddress) {
        // Use the enhanced PocketBase service that prefers files over URLs
        const imageRecord = await campaignImageService.getByCampaignAddress(campaignAddress as string);
        
        if (imageRecord?.image_url) {
          setCampaignImage(imageRecord.image_url);
          
          // Check optimized cache and preload
          const cacheKey = `campaign_${campaignAddress}`;
          ImageOptimizer.cacheImageUrl(cacheKey, imageRecord.image_url);
          ImageOptimizer.preloadImage(imageRecord.image_url);
        }
      }
    } catch (error) {
      console.error('[Campaign] Failed to fetch image from database:', error);
    }
  }, [campaignAddress]);

  // Extract campaign image from description or fetch from PocketBase with optimization
  useEffect(() => {
    const loadCampaignImage = async () => {
      setIsLoadingImage(true);
      
      // First check if image is embedded in description (fastest)
      if (description) {
        const imageMatch = description.match(/🖼️ Image: (https?:\/\/[^\s\n]+)/);
        if (imageMatch) {
          setCampaignImage(imageMatch[1]);
          setIsLoadingImage(false);
          return;
        }
      }
      
      // If no image in description, fetch from PocketBase
      if (campaignAddress) {
        await fetchCampaignImageFromDB();
      }
      
      setIsLoadingImage(false);
    };

    loadCampaignImage();
  }, [description, fetchCampaignImageFromDB, campaignAddress]);

  // Load campaign audio and check user access
  useEffect(() => {
    const loadCampaignAudio = async () => {
      setIsLoadingAudio(true);
      
      try {
        if (campaignAddress) {
          // Check if this is a music campaign by looking for 🎵 in description
          const isMusic = description?.includes('📂 Category: music') || description?.includes('🎵');
          
          if (isMusic) {
            // Fetch audio from PocketBase
            const audioRecord = await campaignAudioService.getByCampaignAddress(campaignAddress as string);
            
            if (audioRecord) {
              setCampaignAudio(audioRecord);
              
              // Check if user has access to the audio
              if (account?.address) {
                setIsCheckingAccess(true);
                const hasAccess = await campaignSupporterService.hasAudioAccess(
                  campaignAddress as string, 
                  account.address
                );
                setHasAudioAccess(hasAccess);
                setIsCheckingAccess(false);
              }
            }
          }
        }
      } catch (error) {
        console.error('[Campaign] Failed to fetch audio:', error);
      } finally {
        setIsLoadingAudio(false);
      }
    };

    loadCampaignAudio();
  }, [campaignAddress, description, account?.address]);

  // Load campaign video and check user access
  useEffect(() => {
    const loadCampaignVideo = async () => {
      setIsLoadingVideo(true);
      
      try {
        if (campaignAddress) {
          // Check if this is a film/video campaign by looking for 🎬 in description
          const isVideo = description?.includes('📂 Category: film') || description?.includes('📂 Category: video') || description?.includes('🎬');
          
          if (isVideo) {
            // Fetch video from PocketBase
            const videoRecord = await campaignVideoService.getByCampaignAddress(campaignAddress as string);
            
            if (videoRecord) {
              setCampaignVideo(videoRecord);
              
              // Check if user has access to the video (same access as audio)
              if (account?.address) {
                setIsCheckingAccess(true);
                const hasAccess = await campaignSupporterService.hasAudioAccess(
                  campaignAddress as string, 
                  account.address
                );
                setHasVideoAccess(hasAccess);
                setIsCheckingAccess(false);
              }
            }
          }
        }
      } catch (error) {
        console.error('[Campaign] Failed to fetch video:', error);
      } finally {
        setIsLoadingVideo(false);
      }
    };

    loadCampaignVideo();
  }, [campaignAddress, description, account?.address]);

  // Check if user has already submitted contact info
  useEffect(() => {
    const checkContactSubmission = async () => {
      try {
        if (campaignAddress && account?.address) {
          const hasSubmitted = await campaignContactService.hasSubmittedContact(
            campaignAddress as string,
            account.address
          );
          setHasSubmittedContact(hasSubmitted);
        }
      } catch (error) {
        console.error('[Campaign] Failed to check contact submission:', error);
        setHasSubmittedContact(false);
      }
    };

    checkContactSubmission();
  }, [campaignAddress, account?.address]);

  // Extract Twitter handle from description
  const extractTwitterHandle = (desc: string | undefined) => {
    if (!desc) return null;
    // Look for verified creator pattern
    const verifiedMatch = desc.match(/🐦 Verified Creator: @(\w+)/);
    if (verifiedMatch) {
      return { handle: verifiedMatch[1], verified: true };
    }
    
    // Fallback to old pattern (but mark as unverified)
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
      // Map category to display format
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

  const twitterData = extractTwitterHandle(description);
  const categoryData = extractCategory(description);
  const cleanDescription = description?.replace(/📂 Category: [^\n]+\n\n/g, '').replace(/\n\n🐦 (Verified Creator|Created by): @[^\n]+/g, '').replace(/\n\n🖼️ Image: https?:\/\/[^\s\n]+/g, '') || description;

  // Fetching the campaign owner’s address
  const { data: ownerAddress, } = useReadContract({
    contract: contract,
    method: "function owner() view returns (address)",
    params: [],
});

  const { data: deadline, isLoading: isLoadingDeadline } = useReadContract({
    contract: contract,
    method: "function deadline() view returns (uint256)",
    params: [],
  });

  const deadlineDate = useMemo(() => {
    return new Date(parseInt(deadline?.toString() as string) * 1000);
  }, [deadline]);
  
  const hasDeadlinePassed = deadlineDate < new Date();

  const calculateTimeLeft = useCallback(() => {
    const now = new Date();
    const difference = deadlineDate.getTime() - now.getTime();
    if (difference > 0) {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else {
      return "Project Ended";
    }
  }, [deadlineDate]);

  useEffect(() => {
    if (!isLoadingDeadline) {
      const timer = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [deadline, isLoadingDeadline, calculateTimeLeft]);

  const { data: goal, isLoading: isLoadingGoal } = useReadContract({
    contract: contract,
    method: "function goal() view returns (uint256)",
    params: [],
  });

  const { data: balance, isLoading: isLoadingBalance } = useReadContract({
    contract: contract,
    method: "function getContractBalance() view returns (uint256)",
    params: [],
    queryOptions: {
      refetchInterval: 3000, // Refetch every 3 seconds for balance updates
    },
  });

  const totalBalance = balance?.toString();
  const totalGoal = goal?.toString();
  let balancePercentage =
    (parseInt(totalBalance as string) / parseInt(totalGoal as string)) * 100;

  // If campaign is withdrawn, show 100% progress regardless of current balance
  if (isWithdrawn) {
    balancePercentage = 100;
  } else if (balancePercentage >= 100) {
    balancePercentage = 100;
  }

  const { data: tiers, isLoading: isLoadingTiers } = useReadContract({
    contract: contract,
    method: "function getTiers() view returns ((string name, uint256 amount, uint256 backers)[])",
    params: [],
    queryOptions: {
      refetchInterval: 5000, // Refetch every 5 seconds for tier updates
    },
  });

  const { data: owner, isLoading: isLoadingOwner } = useReadContract({
    contract: contract,
    method: "function owner() view returns (address)",
    params: [],
  });

  const { data: status } = useReadContract({
    contract,
    method: "function state() view returns (uint8)",
    params: [],
  });

  // Check if current account has funded this campaign
  // Check both localStorage (legacy), campaign_funding collection, and campaign_supporters collection
  const getUserFundingStatus = useCallback(async () => {
    if (!account?.address || !campaignAddress) return false;
    
    // First check localStorage for legacy funding records
    const fundingKey = `funded_${campaignAddress}_${account.address}`;
    const legacyFunded = localStorage.getItem(fundingKey) === 'true';
    
    if (legacyFunded) return true;
    
    // Then check PocketBase database for current funding records
    try {
      // Check both campaign_funding and campaign_supporters collections
      const fundingRecords = await campaignFundingService.getBySupporter(account.address);
      const hasFundedInFundingCollection = fundingRecords.some(record => 
        record.campaign_address === campaignAddress
      );
      
      if (hasFundedInFundingCollection) return true;
      
      // Also check campaign_supporters collection (created by TierCard funding)
      const supporterRecords = await campaignSupporterService.getBySupporter(account.address);
      const hasFundedInSupportersCollection = supporterRecords.some(record => 
        record.campaign_address === campaignAddress
      );
      
      return hasFundedInSupportersCollection;
    } catch (error) {
      console.error('Failed to check funding status from database:', error);
      return false;
    }
  }, [account?.address, campaignAddress]);

  const [hasUserFunded, setHasUserFunded] = useState(false);

  // Update funding status when account or campaign changes
  useEffect(() => {
    const checkFundingStatus = async () => {
      const currentFundingStatus = await getUserFundingStatus();
      setHasUserFunded(currentFundingStatus);
    };
    
    checkFundingStatus();
  }, [getUserFundingStatus]);

  // Function to refresh funding status (can be called after successful funding)
  const refreshFundingStatus = useCallback(async () => {
    const currentFundingStatus = await getUserFundingStatus();
    setHasUserFunded(currentFundingStatus);
    
    // Trigger contract data refresh for real-time progress updates
    setRefreshKey(prev => prev + 1);
    
    // If user just funded, show thank you modal
    if (currentFundingStatus) {
      setShowThankYouModal(true);
    }
  }, [getUserFundingStatus]);

  // Contact form functions
  const handleContactFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);
    
    try {
      if (!account?.address || !campaignAddress) {
        alert('Please connect your wallet first');
        setIsSubmittingContact(false);
        return;
      }

      // Store contact info in database
      await campaignContactService.create({
        campaign_address: campaignAddress as string,
        supporter_address: account.address,
        name: contactFormData.name,
        email: contactFormData.email,
        address: contactFormData.address || '',
        phone: contactFormData.phone || '',
        x_username: contactFormData.xUsername || '',
        telegram_username: contactFormData.telegramUsername || '',
        additional_notes: ''
      });
      
      console.log('✅ Contact info successfully stored in database');
      
      setHasSubmittedContact(true);
      setShowContactForm(false);
      setShowThankYouModal(true);
    } catch (error) {
      console.error('❌ Error submitting contact info to database:', error);
      alert('Failed to submit contact information. Please try again.');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleContactFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setContactFormData({
      ...contactFormData,
      [e.target.name]: e.target.value
    });
  };

  // Check if user has already submitted contact info
  useEffect(() => {
    if (account?.address && campaignAddress) {
      const contactKey = `contact_${campaignAddress}_${account?.address}`;
      const existingContact = localStorage.getItem(contactKey);
      if (existingContact) {
        setHasSubmittedContact(true);
      }
    }
  }, [account?.address, campaignAddress]);

  // Check if user submitted contact info for this campaign
  useEffect(() => {
    if (account?.address && campaignAddress) {
      const contactKey = `contact_${campaignAddress}_${account.address}`;
      const existingContact = localStorage.getItem(contactKey);
      setHasSubmittedContact(!!existingContact);
    }
  }, [account?.address, campaignAddress]);

  // Check if user already minted NFT for this campaign (prioritize database over localStorage)
  useEffect(() => {
    const checkMintStatus = async () => {
      if (account?.address && campaignAddress) {
        // First check database for minted NFTs (primary source)
        try {
          const existingNFT = await campaignNFTService.getBySupporterAndCampaign(
            account.address, 
            campaignAddress as string
          );
          
          if (existingNFT && existingNFT.mint_status === 'minted') {
            console.log("✅ Found minted NFT in database:", existingNFT);
            // Extract image from metadata or use campaign image
            try {
              const metadata = JSON.parse(existingNFT.nft_metadata || '{}');
              setMintedImageUrl(metadata.image || campaignImage);
            } catch {
              setMintedImageUrl(campaignImage);
            }
            
            // Clean up any legacy localStorage entry to prevent confusion
            const mintedKey = `mintedNFT_${campaignAddress}_${account.address}`;
            localStorage.removeItem(mintedKey);
            
            return; // Found in database, no need to check localStorage
          }
        } catch (error) {
          console.error('Failed to check manual mint status from database:', error);
        }

        // Fallback: check localStorage for legacy mints
        const mintedKey = `mintedNFT_${campaignAddress}_${account.address}`;
        const mintedUrl = localStorage.getItem(mintedKey);
        if (mintedUrl) {
          console.log("⚠️ Found legacy mint in localStorage, consider migrating to database");
          setMintedImageUrl(mintedUrl);
        }
      }
    };
    
    checkMintStatus();
  }, [account?.address, campaignAddress, campaignImage]);

  // Simple NFT minting function - mints campaign image directly to blockchain
  const handleMintNFT = async () => {
    if (!account?.address) {
      alert("Please connect your wallet first");
      return;
    }

    if (!campaignImage) {
      alert("No campaign image available for minting");
      return;
    }

    // Check if user actually funded this campaign using localStorage (simplified approach)
    if (!hasUserFunded) {
      alert("❌ Only campaign supporters can mint NFTs. Please fund this campaign first to unlock NFT minting!");
      return;
    }

    setIsMinting(true);
    setMintError(null);
    
    try {
      // Create a simple metadata object for the NFT
      const metadata = {
        name: `${name} - Campaign Support NFT`,
        description: `Exclusive NFT for supporting the campaign: ${name}`,
        image: campaignImage,
        attributes: [
          {
            trait_type: "Campaign Address",
            value: campaignAddress
          },
          {
            trait_type: "Supporter",
            value: account.address
          },
          {
            trait_type: "Support Date",
            value: new Date().toISOString()
          }
        ]
      };

      // Upload metadata to IPFS or use the image URL directly
      console.log("Creating NFT with metadata:", metadata);
      
      // For simplicity, we'll use the thirdweb NFT drop or create a simple storage
      // In this case, we'll mint using thirdweb's built-in NFT functionality
      
      // Check if user already minted (prioritize database over localStorage)
      try {
        const existingNFT = await campaignNFTService.getBySupporterAndCampaign(
          account.address, 
          campaignAddress as string
        );
        
        if (existingNFT && existingNFT.mint_status === 'minted') {
          alert('✨ You have already minted an NFT for this campaign!');
          try {
            const metadata = JSON.parse(existingNFT.nft_metadata || '{}');
            setMintedImageUrl(metadata.image || campaignImage);
          } catch {
            setMintedImageUrl(campaignImage);
          }
          
          // Clean up any legacy localStorage entry to prevent confusion
          const mintedKey = `mintedNFT_${campaignAddress}_${account.address}`;
          localStorage.removeItem(mintedKey);
          
          return;
        }
      } catch (error) {
        console.error('Failed to check existing manual mints:', error);
      }

      // Also check localStorage as fallback for legacy mints
      const mintedKey = `mintedNFT_${campaignAddress}_${account.address}`;
      const existingMint = localStorage.getItem(mintedKey);
      
      if (existingMint) {
        alert('✨ You have already minted an NFT for this campaign!');
        setMintedImageUrl(existingMint);
        return;
      }

      // For this simple implementation, we'll simulate the minting process
      // In a real implementation, you could use thirdweb's NFT contract or deploy a simple ERC721
      
      // Simulate minting delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate a simulated token ID (in real implementation, this would come from blockchain)
      const simulatedTokenId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const simulatedTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      // Create a comprehensive record in PocketBase database
      let nftRecord;
      try {
        nftRecord = await campaignNFTService.create({
          campaign_address: campaignAddress as string,
          supporter_address: account.address,
          tier_id: 1, // Using 1 for manual mints (PocketBase requires nonzero value)
          nft_token_id: simulatedTokenId,
          nft_contract_address: campaignAddress as string, // Using campaign address as contract for simplicity
          nft_metadata: JSON.stringify(metadata),
          transaction_hash: simulatedTxHash,
          mint_status: 'minted'
        });
        
        console.log("✅ NFT record successfully created in database:", nftRecord);
        
        // Set the minted image URL from the stored metadata
        setMintedImageUrl(campaignImage);
        
        // Also save to localStorage for backward compatibility (but database is primary source)
        const mintedKey = `mintedNFT_${campaignAddress}_${account.address}`;
        localStorage.setItem(mintedKey, campaignImage);
        
      } catch (dbError) {
        console.error("❌ Failed to create NFT record in database:", dbError);
        // If database fails, we can still save locally as fallback
        const mintedKey = `mintedNFT_${campaignAddress}_${account.address}`;
        localStorage.setItem(mintedKey, campaignImage);
        setMintedImageUrl(campaignImage);
        
        alert("⚠️ NFT minted successfully, but database storage failed. NFT saved locally only.");
        return;
      }
      
      // Success - no popup notification needed, visual feedback is handled by UI state changes
      console.log(`✅ NFT minted successfully! Token ID: ${simulatedTokenId}, Database ID: ${nftRecord.id}`);
      
    } catch (err: any) {
      console.error('Minting error:', err);
      setMintError(err.message || 'Minting failed. Please try again.');
    } finally {
      setIsMinting(false);
    }
  };

  // Check if campaign has been withdrawn
  useEffect(() => {
    if (campaignAddress) {
      const withdrawnKey = `withdrawn_${campaignAddress}`;
      const withdrawnStatus = localStorage.getItem(withdrawnKey);
      if (withdrawnStatus === 'true') {
        setIsWithdrawn(true);
      }
    }
  }, [campaignAddress]);

  const handleClaimFunds = async () => {
    if (!account) {
      alert("Please connect your wallet first");
      return;
    }

    if (owner !== account.address) {
      alert("Only the campaign owner can claim funds");
      return;
    }

    if (balancePercentage < 100) {
      alert("Campaign must reach 100% funding before claiming funds");
      return;
    }

    setIsClaimingFunds(true);
    
    try {
      // Prepare the contract call for withdrawing funds
      const withdrawCall = prepareContractCall({
        contract: contract,
        method: "function withdraw()",
        params: [],
      });

      // Execute the withdrawal transaction
      const result = await sendTransaction({
        transaction: withdrawCall,
        account: account,
      });
      
      // Mark the campaign as withdrawn
      const withdrawnKey = `withdrawn_${campaignAddress}`;
      localStorage.setItem(withdrawnKey, 'true');
      setIsWithdrawn(true);
      
      alert(`Successfully claimed ${totalBalance} USDT! Transaction hash: ${result.transactionHash}`);
      
      // In our simplified version, NFT minting is available for supporters
      console.log("Campaign successfully funded and claimed - NFT minting available for supporters!");
      
    } catch (error) {
      console.error("Error claiming funds:", error);
      alert("Failed to claim funds. Please try again or check if your campaign contract supports withdrawal.");
    } finally {
      setIsClaimingFunds(false);
    }
  };

  // Function to enable NFT minting for this campaign (Admin only) - SIMPLIFIED VERSION
  const enableNFTMinting = async () => {
    // In our simplified version, NFT minting is always enabled for campaigns with images
    console.log("Simplified NFT minting - always enabled when campaign has image");
    setIsNFTMintingEnabled(!!campaignImage);
  };

  // Function to check if NFT minting is enabled for this campaign - SIMPLIFIED
  const checkNFTMintingStatus = useCallback(async () => {
    // In our simplified version, minting is enabled if campaign has an image
    return !!campaignImage;
  }, [campaignImage]);

  // State to track if NFT minting is enabled
  const [isNFTMintingEnabled, setIsNFTMintingEnabled] = useState<boolean>(false);

  // Check NFT minting status when campaign loads
  useEffect(() => {
    const checkStatus = async () => {
      const enabled = await checkNFTMintingStatus();
      setIsNFTMintingEnabled(enabled);
    };
    
    if (campaignAddress && campaignImage) {
      checkStatus();
    }
  }, [campaignAddress, campaignImage, checkNFTMintingStatus]);

  const campaignUrl = `https://creatorvaultcamp.netlify.app/campaign/${campaignAddress}`;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 dark:bg-gray-900 min-h-screen">
            {/* Enhanced Support Instructions - Compact Version */}
            <div className="mx-auto max-w-6xl bg-gradient-to-br from-[#f45a06]/8 via-[#ff8c42]/12 to-[#ffb366]/16 dark:from-[#f45a06]/15 dark:via-[#ff8c42]/20 dark:to-[#ffb366]/25 rounded-xl shadow-md border border-[#f45a06]/20 dark:border-[#f45a06]/30 mb-6 overflow-hidden">
                <div className="relative p-4">
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#f45a06]/10 to-[#ff8c42]/10 rounded-full blur-xl -translate-y-4 translate-x-4"></div>
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-[#ff8c42]/10 to-[#ffb366]/10 rounded-full blur-xl translate-y-2 -translate-x-2"></div>
                    
                    <div className="relative z-10">
                        {/* Compact Header */}
                        <div className="flex items-center justify-center mb-3">
                            <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-gradient-to-br from-[#f45a06] to-[#ff8c42] rounded-full flex items-center justify-center shadow-lg">
                                    <FaHandHoldingUsd className="w-3 h-3 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Support This Creative Journey</h3>
                            </div>
                        </div>
                        
                        {/* Compact subtitle */}
                        <p className="text-center text-gray-600 dark:text-gray-300 mb-4 text-sm max-w-xl mx-auto">
                            Join the community helping bring this creative vision to life. Every contribution matters!
                        </p>
                        
                        {/* Compact step guide */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="flex flex-col items-center text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-white/40 dark:border-gray-700/40 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-2 shadow-md">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Connect</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300">Link wallet</p>
                            </div>
                            
                            <div className="flex flex-col items-center text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-white/40 dark:border-gray-700/40 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300">
                                <div className="w-8 h-8 bg-gradient-to-br from-[#f45a06] to-[#ff8c42] rounded-full flex items-center justify-center mb-2 shadow-md">
                                    <FaHandHoldingUsd className="w-4 h-4 text-white" />
                                </div>
                                <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Support</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300">Choose tier</p>
                            </div>
                            
                            <div className="flex flex-col items-center text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-white/40 dark:border-gray-700/40 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300">
                                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-2 shadow-md">
                                    <FaEnvelope className="w-4 h-4 text-white" />
                                </div>
                                <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Contact</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300">Share info(optional)</p>
                            </div>
                            
                            <div className="flex flex-col items-center text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-white/40 dark:border-gray-700/40 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-2 shadow-md">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">Track</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300">Follow progress</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
        {/* Compact Campaign Header with Image Left, Details Right */}
        <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
            <div className="flex flex-col lg:flex-row">
                {/* Left Side - Campaign Image */}
                <div className="lg:w-1/3 relative">
                    {isLoadingImage ? (
                        // Loading state
                        <div className="relative">
                            <div className="relative p-2 bg-gradient-to-br from-[#f45a06] via-[#ff8c42] to-[#ffb366] rounded-t-xl">
                                <div className="w-full h-64 lg:h-80 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 flex items-center justify-center rounded-lg shadow-lg animate-pulse">
                                    <div className="text-center">
                                        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#f45a06] to-[#ff8c42] rounded-full flex items-center justify-center shadow-xl">
                                            <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h2a2 2 0 002-2z" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">Loading image...</p>
                                        <p className="text-gray-400 dark:text-gray-400 text-xs mt-1"></p>
                                        <div className="mt-3 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                                            <div className="bg-gradient-to-r from-[#f45a06] to-[#ff8c42] h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 p-4 border-t border-gray-100 dark:border-gray-600 rounded-b-xl">
                                <div className="text-center">
                                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                                        {hasDeadlinePassed ? '🔚 Campaign Ended' : '⏰ Time Remaining'}
                                    </div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
                                        {hasDeadlinePassed ? 'Campaign Closed' : timeLeft}
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-[#f45a06] via-[#ff8c42] to-[#ffb366] rounded-full transition-all duration-700"
                                            style={{ 
                                                width: `${Math.min(balancePercentage, 100)}%`,
                                                backgroundSize: '200% 100%',
                                                animation: hasDeadlinePassed ? 'none' : 'progressFlow 2s ease-in-out infinite'
                                            }}
                                        />
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        {balancePercentage.toFixed(0)}% of goal reached
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : campaignImage ? (
                        <div className="relative">
                            <div className="relative p-2 bg-gradient-to-br from-[#f45a06] via-[#ff8c42] to-[#ffb366] rounded-t-xl">
                                <Image
                                    src={campaignImage}
                                    alt={name || "Campaign image"}
                                    width={400}
                                    height={300}
                                    unoptimized={true}
                                    className="w-full h-64 lg:h-80 object-cover rounded-lg transition-all duration-300 hover:scale-[1.02] shadow-lg"
                                    style={{ 
                                        filter: 'brightness(1.05) contrast(1.1) saturate(1.1)',
                                        objectPosition: 'center center',
                                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                                    }}
                                    onLoad={() => console.log(`[Campaign] Image loaded successfully: ${campaignImage}`)}
                                    onError={(e) => {
                                        console.error(`[Campaign] Image failed to load: ${campaignImage}`);
                                        // Set to a fallback or retry
                                        const target = e.target as HTMLImageElement;
                                        if (!target.dataset.retried) {
                                            target.dataset.retried = 'true';
                                            // Retry loading after a delay
                                            setTimeout(() => {
                                                target.src = campaignImage;
                                            }, 2000);
                                        }
                                    }}
                                />
                                {/* Decorative corner elements */}
                                <div className="absolute top-1 left-1 w-6 h-6 border-l-2 border-t-2 border-white/30 rounded-tl-lg"></div>
                                <div className="absolute top-1 right-1 w-6 h-6 border-r-2 border-t-2 border-white/30 rounded-tr-lg"></div>
                                <div className="absolute bottom-1 left-1 w-6 h-6 border-l-2 border-b-2 border-white/30 rounded-bl-lg"></div>
                                <div className="absolute bottom-1 right-1 w-6 h-6 border-r-2 border-b-2 border-white/30 rounded-br-lg"></div>
                                
                                {/* Animated border glow */}
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#f45a06] via-[#ff8c42] to-[#ffb366] opacity-20 animate-pulse"></div>
                            </div>
                            {/* Clean countdown section under the image */}
                            <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 p-4 border-t border-gray-100 dark:border-gray-600 rounded-b-xl">
                                <div className="text-center">
                                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                                        {hasDeadlinePassed ? '🔚 Campaign Ended' : '⏰ Time Remaining'}
                                    </div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
                                        {hasDeadlinePassed ? 'Campaign Closed' : timeLeft}
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-[#f45a06] via-[#ff8c42] to-[#ffb366] rounded-full transition-all duration-700"
                                            style={{ 
                                                width: `${Math.min(balancePercentage, 100)}%`,
                                                backgroundSize: '200% 100%',
                                                animation: hasDeadlinePassed ? 'none' : 'progressFlow 2s ease-in-out infinite'
                                            }}
                                        />
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        {balancePercentage.toFixed(0)}% of goal reached
                                    </div>
                                </div>
                            </div>

                            
                            
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="relative p-2 bg-gradient-to-br from-[#f45a06] via-[#ff8c42] to-[#ffb366] rounded-t-xl">
                                <div className="w-full h-64 lg:h-80 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 flex items-center justify-center rounded-lg shadow-lg">
                                    <div className="text-center">
                                        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#f45a06] to-[#ff8c42] rounded-full flex items-center justify-center shadow-xl">
                                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h2a2 2 0 002-2z" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">Creative Project</p>
                                        <p className="text-gray-400 dark:text-gray-400 text-xs mt-1">Image will appear here</p>
                                    </div>
                                </div>
                                {/* Decorative corner elements */}
                                <div className="absolute top-1 left-1 w-6 h-6 border-l-2 border-t-2 border-white/30 rounded-tl-lg"></div>
                                <div className="absolute top-1 right-1 w-6 h-6 border-r-2 border-t-2 border-white/30 rounded-tr-lg"></div>
                                <div className="absolute bottom-1 left-1 w-6 h-6 border-l-2 border-b-2 border-white/30 rounded-bl-lg"></div>
                                <div className="absolute bottom-1 right-1 w-6 h-6 border-r-2 border-b-2 border-white/30 rounded-br-lg"></div>
                                
                                {/* Animated border glow */}
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#f45a06] via-[#ff8c42] to-[#ffb366] opacity-20 animate-pulse"></div>
                            </div>
                            {/* Clean countdown section under the placeholder */}
                            <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 p-4 border-t border-gray-100 dark:border-gray-600 rounded-b-xl">
                                <div className="text-center">
                                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                                        {hasDeadlinePassed ? '🔚 Campaign Ended' : '⏰ Time Remaining'}
                                    </div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
                                        {hasDeadlinePassed ? 'Campaign Closed' : timeLeft}
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-[#f45a06] via-[#ff8c42] to-[#ffb366] rounded-full transition-all duration-700"
                                            style={{ 
                                                width: `${Math.min(balancePercentage, 100)}%`,
                                                backgroundSize: '200% 100%',
                                                animation: hasDeadlinePassed ? 'none' : 'progressFlow 2s ease-in-out infinite'
                                            }}
                                        />
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        {balancePercentage.toFixed(0)}% of goal reached
                                    </div>
                                </div>
                            </div>

                            {/* NFT Minting Section for Supporters - No Image Available */}
                            {hasUserFunded && !campaignImage && (
                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 p-4 border-t border-gray-100 dark:border-gray-600">
                                    <div className="text-center">
                                        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center justify-center">
                                            <span className="mr-2">🎨</span>
                                            Campaign NFT
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            No campaign image available for NFT minting
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Side - Campaign Details */}
                <div className="lg:w-2/3 p-6">
                    {/* Campaign Title and Promote Button */}
                    <div className="flex items-start justify-between mb-4">
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 flex-1">
                            {name || "Loading..."}
                        </h1>
                        {account?.address === owner && (
                            <button
                                onClick={() => setShowPromoteModal(true)}
                                className="ml-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                </svg>
                                Promote
                            </button>
                        )}
                    </div>
                    
                    {/* Category and Status Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {categoryData && (
                            <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gradient-to-r from-[#f45a06]/20 to-[#ff8c42]/20 text-[#f45a06] rounded-full border border-[#f45a06]/30">
                                {categoryData}
                            </span>
                        )}
                        
                        {twitterData && (
                            <Link
                                href={`https://twitter.com/${twitterData.handle}`}
                                target="_blank"
                                className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                                    twitterData.verified 
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/50'
                                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                                }`}
                            >
                                <FaXTwitter className="w-3 h-3 mr-1" />
                                {twitterData.verified ? '✓ Verified' : 'Claimed'}
                                <span className="ml-1">@{twitterData.handle}</span>
                            </Link>
                        )}
                    </div>

                    {/* Campaign Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        {/* Campaign Goal */}
                        <div className="text-center">
                            <div className="text-2xl font-bold text-[#f45a06] mb-1">
                                ${goal?.toString() || '0'}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300">Goal</p>
                            <div className="flex justify-center mt-2">
                                <svg className="w-3 h-3 text-[#f45a06]" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>

                        {/* Supporters Count */}
                        <div className="text-center">
                            <div className="text-2xl font-bold text-[#f45a06] mb-1">
                                {tiers?.reduce((total, tier) => total + parseInt(tier.backers.toString()), 0) || 0}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300">Supporters</p>
                            <div className="flex justify-center mt-2">
                                <FaUsers className="text-[#f45a06] w-3 h-3" />
                            </div>
                        </div>

                        {/* Time Left */}
                        <div className="text-center">
                            <div className="text-2xl font-bold text-[#f45a06] mb-1">
                                {timeLeft.includes('Project Ended') ? '0' : timeLeft.split('d')[0]}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300">Days Left</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {hasDeadlinePassed ? 'Ended' : 'Remaining'}
                            </p>
                        </div>
                    </div>

                    {/* Funding Info */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
                        <div className="flex justify-between items-center text-sm mb-2">
                            <span className="text-gray-600 dark:text-gray-300">
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    ${isWithdrawn ? goal?.toString() : balance?.toString()}
                                </span> {isWithdrawn ? 'funded' : 'raised'}
                            </span>
                            <span className="text-gray-600 dark:text-gray-300">
                                Goal: <span className="font-semibold text-gray-900 dark:text-gray-100">${goal?.toString()}</span>
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-600 dark:via-gray-500 dark:to-gray-600 rounded-full overflow-hidden shadow-inner relative">
                            <div
                                className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                                style={{ 
                                    width: `${Math.min(balancePercentage, 100)}%`,
                                    background: `linear-gradient(45deg, 
                                        #f45a06 0%, 
                                        #ff8c42 25%, 
                                        #ffb366 50%, 
                                        #ff8c42 75%, 
                                        #f45a06 100%
                                    )`,
                                    backgroundSize: '200% 100%',
                                    animation: 'progressFlow 2s ease-in-out infinite'
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200 to-transparent opacity-20" 
                                     style={{ animation: 'shimmer 3s ease-in-out infinite' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Support Tiers Section */}
                    {balancePercentage < 100 && !isWithdrawn && (
                        <div className="mt-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                                <FaHandHoldingUsd className="text-[#f45a06] mr-2 text-sm" />
                                Support Tiers
                            </h3>
                            <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2">
                                {isLoadingTiers ? (
                                    <div className="col-span-2 lg:w-full text-center py-2">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Loading tiers...</p>
                                    </div>
                                ) : (
                                    tiers && tiers.length > 0 ? (
                                        tiers.map((tier, index) => (
                                            <div key={index} className="lg:flex-1 lg:min-w-0 bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600 hover:border-[#f45a06] hover:shadow-md transition-all duration-300">
                                                <div className="space-y-3">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex flex-col flex-1">
                                                            <div className="flex items-baseline justify-between">
                                                                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{tier.name}</h4>
                                                                <div className="text-lg font-bold text-[#f45a06] leading-none ml-3">${tier.amount.toString()}</div>
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tier.backers.toString()} backers</div>
                                                        </div>
                                                    </div>
                                                    <TierCard
                                                        tier={tier}
                                                        index={index}
                                                        contract={contract}
                                                        isEditing={isEditing}
                                                        compact={true}
                                                        isWithdrawn={isWithdrawn}
                                                        onFundingSuccess={refreshFundingStatus}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-2 lg:w-full text-center py-2">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">No support tiers available</p>
                                        </div>
                                    )
                                )}
                                {isEditing && (
                                    <div className="lg:flex-1 lg:min-w-0">
                                        <button
                                            className="w-full h-full py-3 px-2 text-xs font-medium text-white bg-gradient-to-r from-[#f45a06] to-[#ff8c42] rounded-lg hover:from-[#ff8c42] hover:to-[#ffb366] transition-all duration-300"
                                            onClick={() => setIsModalOpen(true)}
                                        >
                                            + Add Tier
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Campaign Completed Message */}
                    {isWithdrawn && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-200 dark:border-green-700">
                            <div className="flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">Project Fully Funded!</p>
                                    <p className="text-xs text-green-700 dark:text-green-400">The creator has withdrawn the funds and the project is now closed.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Claim Funds Button for Owner */}
                    {owner === account?.address && balancePercentage >= 100 && !isWithdrawn && (
                        <div className="mt-4">
                            <button
                                className="w-full px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#f45a06] via-[#ff8c42] to-[#ffb366] rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50"
                                onClick={handleClaimFunds}
                                disabled={isClaimingFunds}
                            >
                                {isClaimingFunds ? "Claiming..." : `🎉 Withdraw ${balance?.toString()} USDT`}
                            </button>
                        </div>
                    )}

                    {/* Withdrawal Status Display */}
                    {owner === account?.address && isWithdrawn && (
                        <div className="mt-4">
                            <div className="w-full px-4 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
                                ✅ Funds Successfully Withdrawn
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>        {/* Main Content - Description and Actions */}
        <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto mb-6">
            {/* Campaign Description */}
            <div className="flex-1">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-[#f45a06]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        About This Project
                    </h2>
                    <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {cleanDescription || "Loading description..."}
                        </p>
                    </div>
                </div>

                {/* Exclusive Audio Content - Only for Music Campaigns */}
                {campaignAudio && !isLoadingAudio && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 mt-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                            </svg>
                            🎵 Exclusive Audio Content
                        </h2>
                        
                        {account?.address ? (
                            hasAudioAccess ? (
                                <div className="space-y-4">
                                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                                        <div className="flex items-center mb-2">
                                            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span className="font-semibold text-green-800 dark:text-green-300">Access Granted!</span>
                                        </div>
                                        <p className="text-sm text-green-700 dark:text-green-400">
                                            Thank you for supporting this campaign! You now have access to exclusive audio content.
                                        </p>
                                    </div>
                                    
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                        <h3 className="font-medium text-purple-900 mb-3">{campaignAudio.audio_title || "Campaign Audio"}</h3>
                                        <audio 
                                            controls 
                                            className="w-full"
                                            src={campaignAudio.audio_url}
                                            preload="metadata"
                                        >
                                            Your browser does not support the audio element.
                                        </audio>
                                        {campaignAudio.audio_duration && (
                                            <p className="text-sm text-purple-600 mt-2">
                                                Duration: {Math.floor(campaignAudio.audio_duration / 60)}:{(campaignAudio.audio_duration % 60).toString().padStart(2, '0')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <div className="flex items-center mb-2">
                                        <svg className="w-5 h-5 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <span className="font-semibold text-amber-800">Support Required</span>
                                    </div>
                                    <p className="text-sm text-amber-700 mb-3">
                                        This campaign features exclusive audio content for supporters only. Fund this campaign to unlock access to:
                                    </p>
                                    <div className="bg-white rounded-lg p-3 border border-amber-300">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-800">{campaignAudio.audio_title || "Exclusive Audio Track"}</p>
                                                {campaignAudio.audio_duration && (
                                                    <p className="text-sm text-gray-600">
                                                        Duration: {Math.floor(campaignAudio.audio_duration / 60)}:{(campaignAudio.audio_duration % 60).toString().padStart(2, '0')}
                                                    </p>
                                                )}
                                                <div className="mt-2 flex items-center space-x-1">
                                                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="text-sm text-amber-600 font-medium">Locked for non-supporters</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-amber-700 mt-3">
                                        💰 Choose any support tier above to unlock this exclusive content and support the creator!
                                    </p>
                                </div>
                            )
                        ) : (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center mb-2">
                                    <svg className="w-5 h-5 text-gray-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-semibold text-gray-800">Connect Wallet</span>
                                </div>
                                <p className="text-sm text-gray-700">
                                    Connect your wallet to check if you have access to exclusive audio content for this campaign.
                                </p>
                            </div>
                        )}
                        
                        {isCheckingAccess && (
                            <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                                <span className="ml-2 text-sm text-gray-600">Checking access...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Exclusive Video Content - Only for Film/Video Campaigns */}
                {campaignVideo && !isLoadingVideo && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 mt-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                            </svg>
                            🎬 Exclusive Video Content
                        </h2>
                        
                        {account?.address ? (
                            hasVideoAccess ? (
                                <div className="space-y-4">
                                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                                        <div className="flex items-center mb-2">
                                            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span className="font-semibold text-green-800 dark:text-green-300">Access Granted!</span>
                                        </div>
                                        <p className="text-sm text-green-700 dark:text-green-300">
                                            Thank you for supporting this campaign! You now have access to exclusive video content.
                                        </p>
                                    </div>
                                    
                                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                                        <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-3">{campaignVideo.video_title || "Campaign Video"}</h3>
                                        <video 
                                            controls 
                                            className="w-full max-h-96 rounded-lg"
                                            src={campaignVideo.video_url}
                                            poster={campaignVideoService.getThumbnailUrl(campaignVideo) || ""}
                                            preload="metadata"
                                        >
                                            Your browser does not support the video element.
                                        </video>
                                        {campaignVideo.video_duration && (
                                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                                                Duration: {Math.floor(campaignVideo.video_duration / 60)}:{(campaignVideo.video_duration % 60).toString().padStart(2, '0')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                                    <div className="flex items-center mb-2">
                                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <span className="font-semibold text-amber-800 dark:text-amber-300">Support Required</span>
                                    </div>
                                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                                        This campaign features exclusive video content for supporters only. Fund this campaign to unlock access to:
                                    </p>
                                    <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-amber-300 dark:border-amber-600">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-800 dark:text-gray-200">{campaignVideo.video_title || "Exclusive Video Content"}</p>
                                                {campaignVideo.video_duration && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        Duration: {Math.floor(campaignVideo.video_duration / 60)}:{(campaignVideo.video_duration % 60).toString().padStart(2, '0')}
                                                    </p>
                                                )}
                                                <div className="mt-2 flex items-center space-x-1">
                                                    <svg className="w-4 h-4 text-amber-500 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">Locked for non-supporters</span>
                                                </div>
                                            </div>
                                        </div>
                                        {campaignVideoService.getThumbnailUrl(campaignVideo) && (
                                            <div className="mt-3 relative">
                                                <Image
                                                    src={campaignVideoService.getThumbnailUrl(campaignVideo) || ""}
                                                    alt="Video thumbnail"
                                                    width={200}
                                                    height={112}
                                                    className="w-full max-w-xs rounded-lg opacity-75 mx-auto"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-12 h-12 bg-black bg-opacity-70 rounded-full flex items-center justify-center">
                                                        <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-3">
                                        💰 Choose any support tier above to unlock this exclusive content and support the creator!
                                    </p>
                                </div>
                            )
                        ) : (
                            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                <div className="flex items-center mb-2">
                                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">Connect Wallet</span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    Connect your wallet to check if you have access to exclusive video content for this campaign.
                                </p>
                            </div>
                        )}
                        
                        {isCheckingAccess && (
                            <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Checking access...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Recent Donations Section - Split Layout */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 mt-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        {/* <svg className="w-5 h-5 mr-2 text-[#f45a06]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                        </svg> */}
                       
                    </h3>
                    
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Recent Community Support - Left Side */}
                        <div className="flex-1 lg:max-w-md">
                            <RecentDonations 
                                campaignAddress={campaignAddress as string} 
                                currentUserAddress={account?.address}
                                hasUserFunded={hasUserFunded}
                                refreshKey={refreshKey}
                            />
                        </div>
                        
                        {/* Your Support - Right Side */}
                        <div className="flex-1 lg:max-w-sm">
                            <UserSupport 
                                campaignAddress={campaignAddress as string} 
                                currentUserAddress={account?.address}
                                hasUserFunded={hasUserFunded}
                                refreshKey={refreshKey}
                            />
                        </div>
                    </div>

                    {/* Comments Section - Below Recent Support */}
                    <div className="mt-6">
                        <CommentsSection campaignAddress={campaignAddress as string} creatorAddress={owner as string} />
                    </div>
                </div>
            </div>

            {/* Compact Actions Sidebar */}
            <div className="w-full lg:w-72 space-y-4">
                {/* Owner Actions */}
                {owner === account?.address && (
                    <div className="bg-gradient-to-br from-[#f45a06]/10 to-[#ff8c42]/10 dark:from-[#f45a06]/20 dark:to-[#ff8c42]/20 rounded-xl p-4 border border-[#f45a06]/20 dark:border-[#f45a06]/30">
                        <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">Campaign Management</h3>
                        {isEditing && (
                            <div className="mb-3 p-2 bg-white/70 dark:bg-gray-800/70 rounded-lg border border-white/20 dark:border-gray-600/20">
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                    Status: 
                                    <span className={`ml-2 font-medium ${
                                        status === 0 ? 'text-green-600 dark:text-green-400' : 
                                        status === 1 ? 'text-blue-600 dark:text-blue-400' : 
                                        status === 2 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                        {status === 0 ? "Active" : status === 1 ? "Successful" : status === 2 ? "Failed" : "Unknown"}
                                    </span>
                                </p>
                            </div>
                        )}
                        <button
                            className="w-full px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#f45a06] via-[#ff8c42] to-[#ffb366] rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {isEditing ? "Done" : "Manage Campaign"}
                        </button>
                    </div>
                )}

                {/* Campaign NFT Section for Supporters */}
                {hasUserFunded && campaignImage && (
                    <div className="bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 dark:from-emerald-900/20 dark:via-cyan-900/20 dark:to-blue-900/20 rounded-xl p-6 shadow-lg border border-emerald-200 dark:border-emerald-700/50">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-300 mb-4 flex items-center justify-center">
                                <span className="mr-2">🎨</span>
                                Campaign NFT
                            </h3>
                            {mintedImageUrl ? (
                                <div className="flex flex-col items-center">
                                    <div className="relative mb-4 group">
                                        <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 rounded-xl opacity-75 group-hover:opacity-100 transition duration-300 blur"></div>
                                        <div className="relative">
                                            <Image 
                                                src={mintedImageUrl} 
                                                alt="Minted Campaign NFT" 
                                                width={120}
                                                height={120}
                                                className="w-32 h-32 object-cover rounded-xl border-2 border-emerald-300 dark:border-emerald-600 shadow-xl bg-white dark:bg-gray-800" 
                                            />
                                            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                                                NFT
                                            </div>
                                            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-emerald-200/20 via-transparent to-cyan-200/20"></div>
                                        </div>
                                    </div>
                                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-emerald-200 dark:border-emerald-700/50 shadow-sm">
                                        <span className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-center">
                                            ✨ You own this campaign NFT!
                                        </span>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Check your dashboard to view your collection</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center space-y-4">
                                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-emerald-200 dark:border-emerald-700/50 shadow-sm">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                            Thank you for supporting this campaign! 
                                            <br />Mint the campaign image as your exclusive NFT.
                                        </p>
                                        <button
                                            className="px-6 py-3 bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 text-white font-semibold text-sm rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                            onClick={handleMintNFT}
                                            disabled={isMinting}
                                        >
                                            {isMinting ? "Minting..." : "🎨 Mint Campaign NFT"}
                                        </button>
                                        {mintError && (
                                            <p className="text-xs text-red-500 text-center mt-2">{mintError}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Post-Funding Features for Supporters */}
                {tiers && tiers.length > 0 && !isWithdrawn && hasUserFunded && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                        {/* Contact Form and Mint NFT Section for Supporters */}
                        <div className="mt-0">
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg p-3 border border-green-200 dark:border-green-700 mb-3">
                                <div className="flex items-center mb-2">
                                    <svg className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-semibold text-green-800 dark:text-green-200">Thank you for your support!</span>
                                </div>
                                <p className="text-xs text-green-700 dark:text-green-300">
                                    You&apos;ve successfully funded this campaign. Here are some optional next steps:
                                </p>
                            </div>
                                
                                {/* Contact Form Button */}
                                {!hasSubmittedContact && (
                                    <button
                                        onClick={() => setShowContactForm(true)}
                                        className="w-full mb-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center justify-center"
                                    >
                                        <FaEnvelope className="w-3 h-3 mr-2" />
                                        Submit Contact Info (Optional)
                                    </button>
                                )}
                                
                                {/* Already submitted contact info message */}
                                {hasSubmittedContact && (
                                    <div className="text-center">
                                        <div className="inline-flex items-center px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm rounded-lg">
                                            <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            Contact Info Submitted ✓
                                        </div>
                                    </div>
                                )}
                            </div>
                    </div>
                )}

                {/* Compact Social Sharing */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">Share Project</h3>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        <a
                            href={`https://twitter.com/share?url=${encodeURIComponent(campaignUrl)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        >
                            <FaXTwitter className="w-4 h-4" />
                        </a>
                        <a
                            href={`https://wa.me/?text=${encodeURIComponent(campaignUrl)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                        >
                            <FaWhatsapp className="w-4 h-4" />
                        </a>
                        <a
                            href={`https://t.me/share/url?url=${encodeURIComponent(campaignUrl)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        >
                            <FaTelegram className="w-4 h-4" />
                        </a>
                        <button
                            onClick={() => navigator.clipboard.writeText(campaignUrl)}
                            className="flex items-center justify-center p-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                            <FaLink className="w-4 h-4" />
                        </button>
                    </div>
                    
                </div>

                {/* Top Supporters - Below Share Panel */}
                <div className="mt-4">
                    <Leaderboard limit={10} />
                </div>
            </div>
        </div>

{/* Add the gradient movement and highlight animation */}
<style jsx>{`
    @keyframes gradientMovement {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }

    @keyframes movingHighlight {
        0% {
            left: 0%;
        }
        50% {
            left: 100%;
        }
        100% {
            left: 0%;
        }
    }

    @keyframes progressFlow {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }

    @keyframes shimmer {
        0% {
            transform: translateX(-100%);
        }
        50% {
            transform: translateX(100%);
        }
        100% {
            transform: translateX(-100%);
        }
    }

    @keyframes progressPulse {
        0%, 100% {
            box-shadow: 0 0 5px rgba(244, 90, 6, 0.3);
        }
        50% {
            box-shadow: 0 0 20px rgba(244, 90, 6, 0.6), 0 0 30px rgba(255, 140, 66, 0.4);
        }
    }
`}</style>

    {/* Thank You Modal */}
    {showThankYouModal && (
        <ThankYouModal
            setShowThankYouModal={setShowThankYouModal}
            setShowContactForm={setShowContactForm}
            hasSubmittedContact={hasSubmittedContact}
        />
    )}

    {/* Contact Form Modal */}
    {showContactForm && (
        <ContactFormModal
            setShowContactForm={setShowContactForm}
            contactFormData={contactFormData}
            handleContactFormChange={handleContactFormChange}
            handleContactFormSubmit={handleContactFormSubmit}
            isSubmittingContact={isSubmittingContact}
        />
    )}

    {/* Create Tier Modal */}
    {isModalOpen && (
        <CreateCampaignModal
            setIsModalOpen={setIsModalOpen}
            contract={contract}
            showSuccess={showSuccess}
            showError={showError}
        />
    )}

    {/* Promote Campaign Modal */}
    {showPromoteModal && (
        <PromoteCampaignModal
            isOpen={showPromoteModal}
            onClose={() => setShowPromoteModal(false)}
            campaignAddress={campaignAddress as string}
            campaignName={name || 'Campaign'}
            creatorAddress={account?.address || ''}
        />
    )}
    </div>
  );
}

type CreateTierModalProps = {
    setIsModalOpen: (value: boolean) => void
    contract: ThirdwebContract
    showSuccess: (title: string, message?: string) => void
    showError: (title: string, message?: string) => void
}

const CreateCampaignModal = (
    { setIsModalOpen, contract, showSuccess, showError }: CreateTierModalProps
) => {
    const [tierName, setTierName] = useState<string>("");
    const [tierAmount, setTierAmount] = useState<bigint>(1n);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center backdrop-blur-md z-50">
            <div className="w-1/2 bg-white dark:bg-gray-800 p-6 rounded-md shadow-2xl border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create a Support Tier</p>
                    <button
                        className="text-sm px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                        onClick={() => setIsModalOpen(false)}
                    >Close</button>
                </div>
                <div className="flex flex-col">
                    <label className="text-gray-700 dark:text-gray-300 mb-2 font-medium">Support Tier Name:</label>
                    <input 
                        type="text" 
                        value={tierName}
                        onChange={(e) => setTierName(e.target.value)}
                        placeholder="e.g., 'Early Supporter', 'Creative Patron', 'Premium Backer'"
                        className="mb-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-[#f45a06] focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    <label className="text-gray-700 dark:text-gray-300 mb-2 font-medium">Support Amount $:</label>
                    <input 
                        type="number"
                        value={parseInt(tierAmount.toString())}
                        onChange={(e) => setTierAmount(BigInt(e.target.value))}
                        className="mb-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-[#f45a06] focus:border-transparent"
                    />
                    <TransactionButton
                        transaction={() => prepareContractCall({
                            contract: contract,
                            method: "function addTier(string _name, uint256 _amount)",
                            params: [tierName, tierAmount]
                        })}
                        onTransactionConfirmed={async () => {
                            showSuccess(
                                "🎉 Support Tier Created Successfully!", 
                                "Your new support tier has been added to the campaign and is now available for supporters to fund."
                            );
                            setIsModalOpen(false);
                        }}
                        onError={(error) => {
                            showError(
                                "❌ Failed to Create Tier",
                                error.message || "An error occurred while creating the support tier. Please try again."
                            );
                        }}
                    >
                        Create Support Tier
                    </TransactionButton>
                </div>
            </div>
        </div>
    );
};

type ThankYouModalProps = {
    setShowThankYouModal: (value: boolean) => void;
    setShowContactForm: (value: boolean) => void;
    hasSubmittedContact: boolean;
};

const ThankYouModal = ({ 
    setShowThankYouModal, 
    setShowContactForm, 
    hasSubmittedContact 
}: ThankYouModalProps) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center backdrop-blur-md z-50">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl">
                <div className="text-center">
                    {/* Success Icon */}
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    
                    {/* Thank You Message */}
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Thank You!</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        Your support means the world to this creative project. You&apos;re now part of the community bringing this vision to life!
                    </p>
                    
                    {/* Celebration Animation */}
                    <div className="mb-6">
                        <div className="text-4xl animate-bounce">🎉</div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="space-y-3">
                        {!hasSubmittedContact && (
                            <button
                                onClick={() => {
                                    setShowThankYouModal(false);
                                    setShowContactForm(true);
                                }}
                                className="w-full flex items-center justify-center px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
                            >
                                <FaEnvelope className="w-4 h-4 mr-2" />
                                Share Contact Info (Optional)
                            </button>
                        )}
                        
                        <button
                            onClick={() => setShowThankYouModal(false)}
                            className="w-full px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Continue Browsing
                        </button>
                    </div>
                    
                    {/* Additional Info */}
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                            <strong>What&apos;s next?</strong> You&apos;ll be able to track the project&apos;s progress and receive updates. The creator may reach out if they need to deliver any rewards!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

type ContactFormModalProps = {
    setShowContactForm: (value: boolean) => void;
    contactFormData: {
        name: string;
        email: string;
        address: string;
        phone: string;
        xUsername: string;
        telegramUsername: string;
    };
    handleContactFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleContactFormSubmit: (e: React.FormEvent) => void;
    isSubmittingContact: boolean;
};

const ContactFormModal = ({ 
    setShowContactForm, 
    contactFormData, 
    handleContactFormChange, 
    handleContactFormSubmit,
    isSubmittingContact 
}: ContactFormModalProps) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center backdrop-blur-md z-50">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Submit Contact Information</h2>
                    <button
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl"
                        onClick={() => setShowContactForm(false)}
                    >
                        ×
                    </button>
                </div>
                
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                        <strong>📋 This form is completely optional!</strong>
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        • <strong>Address & Phone:</strong> Only needed if you expect physical rewards (books, merchandise, etc.)
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        • <strong>Social handles:</strong> For project updates and community engagement
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                        The creator will only contact you if they need to deliver rewards or send important project updates.
                    </p>
                </div>
                
                <form onSubmit={handleContactFormSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Full Name <span className="text-gray-500 dark:text-gray-400">(optional)</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={contactFormData.name}
                            onChange={handleContactFormChange}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-[#f45a06] focus:border-transparent"
                            placeholder="Enter your full name"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email Address <span className="text-gray-500 dark:text-gray-400">(optional)</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={contactFormData.email}
                            onChange={handleContactFormChange}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-[#f45a06] focus:border-transparent"
                            placeholder="Enter your email address"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Address <span className="text-gray-500 dark:text-gray-400">(only for physical reward delivery)</span>
                        </label>
                        <textarea
                            name="address"
                            value={contactFormData.address}
                            onChange={handleContactFormChange}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-[#f45a06] focus:border-transparent resize-none"
                            placeholder="Enter your address only if you expect physical rewards like books, merchandise, etc."
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Phone Number <span className="text-gray-500 dark:text-gray-400">(only for delivery notifications)</span>
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={contactFormData.phone}
                            onChange={handleContactFormChange}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-[#f45a06] focus:border-transparent"
                            placeholder="Phone number for delivery updates (optional)"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            X (Twitter) Username <span className="text-gray-500 dark:text-gray-400">(optional)</span>
                        </label>
                        <input
                            type="text"
                            name="xUsername"
                            value={contactFormData.xUsername}
                            onChange={handleContactFormChange}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-[#f45a06] focus:border-transparent"
                            placeholder="@username (optional)"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Telegram Username <span className="text-gray-500 dark:text-gray-400">(optional)</span>
                        </label>
                        <input
                            type="text"
                            name="telegramUsername"
                            value={contactFormData.telegramUsername}
                            onChange={handleContactFormChange}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-[#f45a06] focus:border-transparent"
                            placeholder="@username (optional)"
                        />
                    </div>
                    
                    <div className="flex space-x-4 mt-6">
                        <button
                            type="button"
                            onClick={() => setShowContactForm(false)}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                            Skip
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmittingContact}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-[#f45a06] to-[#ff8c42] text-white rounded-lg hover:from-[#ff8c42] hover:to-[#ffb366] transition-all duration-300 disabled:opacity-50"
                        >
                            {isSubmittingContact ? 'Submitting...' : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

type RecentDonationsProps = {
    campaignAddress: string;
    currentUserAddress?: string;
    hasUserFunded: boolean;
    refreshKey?: number;
};

const RecentDonations = ({ 
    campaignAddress, 
    currentUserAddress, 
    hasUserFunded,
    refreshKey 
}: RecentDonationsProps) => {
    const [donations, setDonations] = useState<any[]>([]);
    const [userDonations, setUserDonations] = useState<any[]>([]);

    useEffect(() => {
        // Load recent donations from PocketBase database
        const loadDonations = async () => {
            try {
                console.log(`[RecentDonations] Loading donations for campaign: ${campaignAddress}`);
                console.log(`[RecentDonations] Current user address: ${currentUserAddress}`);
                
                // Debug: Show what we're querying for
                console.log(`[RecentDonations] Searching for supporters with campaign_address: "${campaignAddress}"`);
                
                // Fetch supporter data from PocketBase campaign_supporters collection
                const supporterRecords = await campaignSupporterService.getByCampaign(campaignAddress as string);
                console.log(`[RecentDonations] Found ${supporterRecords.length} supporter records from database:`, supporterRecords);

                // Debug: Show details of each supporter record
                supporterRecords.forEach((record, index) => {
                    console.log(`[RecentDonations] Supporter ${index + 1}:`, {
                        supporter_address: record.supporter_address,
                        campaign_address: record.campaign_address,
                        amount_funded: record.amount_funded,
                        created: record.created,
                        is_current_user: record.supporter_address === currentUserAddress
                    });
                });

                // Debug: Log the total number of supporter records found
                console.log(`[RecentDonations] Found ${supporterRecords.length} supporters for campaign ${campaignAddress}`);
                if (supporterRecords.length === 0) {
                    console.log(`[RecentDonations] No supporters found for campaign ${campaignAddress} in database`);
                }

                const allDonations = supporterRecords.map((record: any) => ({
                    walletAddress: record.supporter_address,
                    timestamp: record.created,
                    amount: `$${record.amount_funded}`,
                    tierName: 'Supporter', // We'll use a generic name since campaign_supporters doesn't have tier info
                    transactionHash: record.transaction_hash || null,
                    blockNumber: record.block_number || null
                }));

                // Sort by created date (most recent first)
                allDonations.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                // Filter user donations
                const userDonationsList = allDonations.filter(
                    (donation: any) => donation.walletAddress === currentUserAddress
                );

                console.log(`[RecentDonations] Processed ${allDonations.length} donations, ${userDonationsList.length} from current user`);
                setDonations(allDonations.slice(0, 5)); // Show last 5 donations
                setUserDonations(userDonationsList);
            } catch (error) {
                console.error('[RecentDonations] Error loading donations from database:', error);
                
                // Fallback to localStorage if database fails
                const allDonations = [];
                const userDonationsList = [];
                
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key?.startsWith(`funded_${campaignAddress}_`)) {
                        const walletAddress = key.split('_')[2];
                        
                        const tierInfoKey = `tier_${campaignAddress}_${walletAddress}`;
                        const tierInfoData = localStorage.getItem(tierInfoKey);
                        
                        let tierInfo;
                        if (tierInfoData) {
                            try {
                                tierInfo = JSON.parse(tierInfoData);
                            } catch (e) {
                                tierInfo = null;
                            }
                        }
                        
                        const donationData = {
                            walletAddress,
                            timestamp: tierInfo?.timestamp || new Date().toISOString(),
                            amount: tierInfo?.amount ? `$${tierInfo.amount}` : '$25',
                            tierName: tierInfo?.tierName || 'Supporter'
                        };
                        
                        allDonations.push(donationData);
                        
                        if (walletAddress === currentUserAddress) {
                            userDonationsList.push(donationData);
                        }
                    }
                }
                
                allDonations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setDonations(allDonations.slice(0, 5));
                setUserDonations(userDonationsList);
            }
        };

        loadDonations();
    }, [campaignAddress, currentUserAddress, refreshKey]);

    const formatWalletAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const getWalletScanUrl = (address: string) => {
        // BaseCAMP explorer
        return `https://basecamp.cloud.blockscout.com/address/${address}`;
    };

    return (
        <div className="space-y-3">
            {/* Recent Donations Section - Compact */}
            <div>
                <h4 className="text-sm font-semibold text-white dark:text-white mb-2 flex items-center">
                    <FaUsers className="w-3 h-3 mr-1 text-[#f45a06]" />
                    Recent Community Support
                </h4>
                
                {donations.length > 0 ? (
                    <div className="space-y-2">
                        {donations.map((donation, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-2 border border-gray-200 hover:bg-gray-100 transition-colors">
                                <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 bg-gradient-to-br from-[#f45a06] to-[#ff8c42] rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-900">
                                            {donation.walletAddress === currentUserAddress ? 'You' : formatWalletAddress(donation.walletAddress)}
                                        </p>
                                        <p className="text-xs text-gray-600">{donation.tierName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <a
                                        href={getWalletScanUrl(donation.walletAddress)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-gray-600 hover:text-gray-800 underline"
                                    >
                                        View
                                    </a>
                                    <span className="text-xs text-gray-500">
                                        {new Date(donation.timestamp).toLocaleDateString()}
                                    </span>
                                    <span className="text-sm">
                                        {donation.walletAddress === currentUserAddress ? '🎉' : '❤️'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-2">
                            <FaHandHoldingUsd className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-gray-600 text-sm font-medium">No donations yet</p>
                        <p className="text-gray-500 text-xs">Be the first to support this project!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

type UserSupportProps = {
    campaignAddress: string;
    currentUserAddress?: string;
    hasUserFunded: boolean;
    refreshKey?: number;
};

const UserSupport = ({ 
    campaignAddress, 
    currentUserAddress, 
    hasUserFunded,
    refreshKey 
}: UserSupportProps) => {
    const [userDonations, setUserDonations] = useState<any[]>([]);

    useEffect(() => {
        const loadUserDonations = async () => {
            try {
                // Fetch funding data from PocketBase for this campaign and current user
                const fundingRecords = await campaignFundingService.getByCampaign(campaignAddress as string);
                
                // Filter only current user's donations
                const userFundingRecords = fundingRecords.filter(
                    (record: any) => record.supporter_address === currentUserAddress
                );

                const userDonationsList = userFundingRecords.map((record: any) => ({
                    walletAddress: record.supporter_address,
                    timestamp: record.created,
                    amount: `$${record.amount}`,
                    tierName: record.tier_title || 'Supporter',
                    totalAmount: record.amount,
                    donationCount: 1, // Each record is one donation
                    transactionHash: record.transaction_hash
                }));

                setUserDonations(userDonationsList);
            } catch (error) {
                console.error('Error loading user donations from database:', error);
                
                // Fallback to localStorage if database fails
                const userDonationsList = [];
                
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key?.startsWith(`funded_${campaignAddress}_`)) {
                        const walletAddress = key.split('_')[2];
                        
                        // Only get current user's donations
                        if (walletAddress === currentUserAddress) {
                            const tierInfoKey = `tier_${campaignAddress}_${walletAddress}`;
                            const tierInfoData = localStorage.getItem(tierInfoKey);
                            
                            let tierInfo;
                            if (tierInfoData) {
                                try {
                                    tierInfo = JSON.parse(tierInfoData);
                                } catch (e) {
                                    console.error('Error parsing tier info:', e);
                                    tierInfo = null;
                                }
                            }
                            
                            const donationData = {
                                walletAddress,
                                timestamp: tierInfo?.timestamp || new Date().toISOString(),
                                amount: `$${tierInfo?.amount || '25'}`,
                                tierName: tierInfo?.tierName || 'Supporter',
                                totalAmount: parseInt(tierInfo?.amount || '25'),
                                donationCount: tierInfo?.donationCount || 1
                            };
                            
                            userDonationsList.push(donationData);
                        }
                    }
                }
                
                setUserDonations(userDonationsList);
            }
        };

        loadUserDonations();
    }, [campaignAddress, currentUserAddress, refreshKey]);

    const getWalletScanUrl = (address: string) => {
        return `https://basecamp.cloud.blockscout.com/address/${address}`;
    };

    if (!hasUserFunded || userDonations.length === 0) {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
            <h3 className="text-md font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Your Support
            </h3>
            <div className="space-y-2">
                {userDonations.map((donation, index) => (
                    <div key={index} className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-3 border border-green-300/30 dark:border-green-700/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-green-800 dark:text-green-300">
                                        {donation.amount} • {donation.tierName}
                                        {donation.donationCount > 1 && (
                                            <span className="ml-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full text-xs">
                                                {donation.donationCount} donations
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-green-600 dark:text-green-400">
                                        {donation.donationCount > 1 ? 'Last donation: ' : ''}
                                        {new Date(donation.timestamp).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <a
                                    href={getWalletScanUrl(donation.walletAddress)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 underline"
                                >
                                    View
                                </a>
                                <span className="text-green-800 dark:text-green-300">🎉</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
