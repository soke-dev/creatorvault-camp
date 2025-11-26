'use client';
import { useReadContract } from "thirdweb/react";
import { client } from "./client";
import { getContract } from "thirdweb";
import { CampaignCard } from "@/components/CampaignCard";
import { CROWDFUNDING_FACTORY } from "./constants/contracts";
import { chain } from "./constants/chains";
import Link from 'next/link';

export default function Home() {
  // Get CrowdfundingFactory contract
  const contract = getContract({
    client: client,
    chain: chain,
    address: CROWDFUNDING_FACTORY,
  });

  // Get all campaigns deployed with CrowdfundingFactory
  const { data: campaigns, isLoading: isLoadingCampaigns, refetch: refetchCampaigns } = useReadContract({
    contract: contract,
    method: "function getAllCampaigns() view returns ((address campaignAddress, address owner, string name)[])",
    params: []
  });

  return (
    <main className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-6 xl:px-8 mt-2 sm:mt-4 transition-colors duration-300">
   {/* Hero Section */}
<div className="relative overflow-hidden rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl mb-6 sm:mb-8 lg:mb-12 transition-colors duration-300 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
  {/* Animated background elements */}
  <div className="absolute inset-0 opacity-30">
    <div className="absolute top-10 left-10 w-40 h-40 sm:w-56 sm:h-56 lg:w-80 lg:h-80 bg-gradient-to-br from-[#e94560] to-[#f45a06] rounded-full blur-3xl opacity-20"></div>
    <div className="absolute -bottom-10 -right-10 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-gradient-to-tl from-[#a8dadc] to-[#457b9d] rounded-full blur-3xl opacity-15"></div>
  </div>
  
  <div className="relative z-10 text-white py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
    {/* Main heading */}
    <div className="max-w-3xl mx-auto text-center mb-6 sm:mb-8 lg:mb-10">
      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-3 sm:mb-4 lg:mb-6 tracking-tight leading-tight">
        <span className="text-white">Fund Your</span>
        <br />
        <span className="bg-gradient-to-r from-[#e94560] via-[#f45a06] to-[#ff8c42] bg-clip-text text-transparent">Creative Dream</span>
      </h1>
      <p className="text-base sm:text-lg lg:text-xl text-gray-300 leading-relaxed mb-6 sm:mb-8">
        Join thousands of creators bringing their projects to life. Get funded by supporters who believe in your vision.
      </p>
      
      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
        <Link href="/dashboard/page">
          <button className="group relative w-full sm:w-auto px-6 sm:px-8 lg:px-10 py-3 sm:py-4 bg-gradient-to-r from-[#e94560] to-[#f45a06] text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base shadow-2xl shadow-[#e94560]/30 hover:shadow-[#e94560]/50 transition-all duration-300 hover:scale-105 transform">
            Start Your Campaign
          </button>
        </Link>
        <Link href="/explore">
          <button className="group relative w-full sm:w-auto px-6 sm:px-8 lg:px-10 py-3 sm:py-4 border-2 border-white/50 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:border-white hover:bg-white/10 transition-all duration-300">
            Explore Projects
          </button>
        </Link>
      </div>
    </div>
  </div>
</div>

{/* Creator Features - Compact Section */}
<section className="py-4 sm:py-6 lg:py-8 -mt-2 sm:-mt-3 relative z-20">
  <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 xl:px-8">
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
      {/* Feature 1 */}
      <div className="bg-gradient-to-br from-purple-900/40 to-purple-900/20 rounded-lg p-3 sm:p-4 border border-purple-500/30 text-center hover:border-purple-500/60 transition-all">
        <div className="text-lg sm:text-2xl mb-1">🔐</div>
        <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">Protect IP</h4>
        <p className="text-xs text-gray-300 leading-tight">On-chain auth</p>
      </div>

      {/* Feature 2 */}
      <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-900/20 rounded-lg p-3 sm:p-4 border border-emerald-500/30 text-center hover:border-emerald-500/60 transition-all">
        <div className="text-lg sm:text-2xl mb-1">⚡</div>
        <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">Tokenize</h4>
        <p className="text-xs text-gray-300 leading-tight">As RWA</p>
      </div>

      {/* Feature 3 */}
      <div className="bg-gradient-to-br from-rose-900/40 to-rose-900/20 rounded-lg p-3 sm:p-4 border border-rose-500/30 text-center hover:border-rose-500/60 transition-all">
        <div className="text-lg sm:text-2xl mb-1">🚀</div>
        <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">Decentralized</h4>
        <p className="text-xs text-gray-300 leading-tight">Funding</p>
      </div>

      {/* Feature 4 */}
      <div className="bg-gradient-to-br from-indigo-900/40 to-indigo-900/20 rounded-lg p-3 sm:p-4 border border-indigo-500/30 text-center hover:border-indigo-500/60 transition-all">
        <div className="text-lg sm:text-2xl mb-1">🎨</div>
        <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">Remix</h4>
        <p className="text-xs text-gray-300 leading-tight">& Collaborate</p>
      </div>

      {/* Feature 5 */}
      <div className="bg-gradient-to-br from-pink-900/40 to-pink-900/20 rounded-lg p-3 sm:p-4 border border-pink-500/30 text-center hover:border-pink-500/60 transition-all">
        <div className="text-lg sm:text-2xl mb-1">👥</div>
        <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">Community</h4>
        <p className="text-xs text-gray-300 leading-tight">& NFTs</p>
      </div>

      {/* Feature 6 */}
      <div className="bg-gradient-to-br from-amber-900/40 to-amber-900/20 rounded-lg p-3 sm:p-4 border border-amber-500/30 text-center hover:border-amber-500/60 transition-all">
        <div className="text-lg sm:text-2xl mb-1">💰</div>
        <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">Monetize</h4>
        <p className="text-xs text-gray-300 leading-tight">Real benefits</p>
      </div>
    </div>
  </div>
</section>

{/* How It Works Section */}
<section className="py-8 sm:py-12 lg:py-16 relative">
  <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 xl:px-8">
    <div className="text-center mb-10 sm:mb-14 lg:mb-16">
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-3 sm:mb-4 lg:mb-6">
        How It Works
      </h2>
      <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        Three simple steps to fund your creative project
      </p>
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
      {/* Step 1 */}
      <div className="relative">
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#e94560] to-[#f45a06] rounded-full flex items-center justify-center text-white font-bold text-lg">
          1
        </div>
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg sm:rounded-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="w-12 h-12 bg-gradient-to-r from-[#e94560] to-[#f45a06] rounded-lg flex items-center justify-center text-white text-xl mb-4">
            📝
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3">Create Your Campaign</h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            Tell your story, set your funding goal, and share what makes your project special.
          </p>
        </div>
      </div>

      {/* Step 2 */}
      <div className="relative">
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#f45a06] to-[#ff8c42] rounded-full flex items-center justify-center text-white font-bold text-lg">
          2
        </div>
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg sm:rounded-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="w-12 h-12 bg-gradient-to-r from-[#f45a06] to-[#ff8c42] rounded-lg flex items-center justify-center text-white text-xl mb-4">
            🚀
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3">Get Backed</h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            Connect with supporters who believe in your vision. Reach your funding goal securely.
          </p>
        </div>
      </div>

      {/* Step 3 */}
      <div className="relative">
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#ff8c42] to-[#ffa947] rounded-full flex items-center justify-center text-white font-bold text-lg">
          3
        </div>
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg sm:rounded-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="w-12 h-12 bg-gradient-to-r from-[#ff8c42] to-[#ffa947] rounded-lg flex items-center justify-center text-white text-xl mb-4">
            ✨
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3">Make It Real</h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            Deliver your project and build lasting relationships with your community.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

{/* Featured Projects Header */}
<section className="py-6 sm:py-8 lg:py-10 mt-8 sm:mt-12 lg:mt-16">
  <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 xl:px-8">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
      <div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-2 sm:mb-3">
          Trending Campaigns
        </h2>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300">
          Check out the latest projects gaining momentum
        </p>
      </div>
      
      <Link href="/explore" className="w-full sm:w-auto">
        <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#e94560] to-[#f45a06] text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform">
          See All Projects →
        </button>
      </Link>
    </div>
  </div>
</section>

{/* Creative Projects Section */}
<section className="py-2 sm:py-4 lg:py-6">
  <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 xl:px-8">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
      {!isLoadingCampaigns && campaigns && campaigns.length > 0 ? (
        campaigns
          .slice(-3) // Show last 3 campaigns (newest) as featured campaigns
          .reverse() // Reverse to show most recent first
          .map((campaign) => (
            <CampaignCard
              key={campaign.campaignAddress}
              campaignAddress={campaign.campaignAddress}
            />
          ))
      ) : (
        <div className="col-span-2 lg:col-span-3 text-center py-6 sm:py-8 lg:py-12">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg sm:rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3">🚀</div>
            <h3 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-800 dark:text-gray-200 mb-1 sm:mb-2">
              Loading creative projects...
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Discovering amazing campaigns for you
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
</section>



  {/* Campaign Stats Section
      <section className="py-12 my-4">
        <h2 className="text-3xl font-semibold text-center text-gray-800 mb-6"></h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-indigo-600">Total Campaigns</h3>
            <p className="text-3xl font-bold text-gray-800">{campaigns ? campaigns.length : 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-indigo-600">Total Funds Donated</h3>
            <p className="text-3xl font-bold text-gray-800">$44,000</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-indigo-600">Total Backers</h3>
            <p className="text-3xl font-bold text-gray-800">21</p>
          </div>
        </div>
      </section> */}


      {/* Success Stories Section */}
      <section className="py-12 sm:py-16 lg:py-20 mt-8 sm:mt-12 lg:mt-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl">
  <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 xl:px-8">
    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-center text-gray-900 dark:text-white mb-10 sm:mb-14 lg:mb-16">
      Creator Success Stories
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
      {/* Story 1 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#e94560] to-[#f45a06] flex items-center justify-center text-white text-xl">
            🎵
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Maya Joseph</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Indie Musician</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed text-sm">
          Raised $15K for my debut album. The community support was incredible—these are now my biggest fans!
        </p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Goal: $12,000</span>
          <span className="font-bold text-green-600 dark:text-green-400">✓ 125% Funded</span>
        </div>
      </div>

      {/* Story 2 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#457b9d] to-[#a8dadc] flex items-center justify-center text-white text-xl">
            📚
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Favour Ehimen</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Author</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed text-sm">
          My graphic novel was fully funded in 10 days! Exceeded my goal by 80%. Best decision ever.
        </p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Goal: $8,500</span>
          <span className="font-bold text-green-600 dark:text-green-400">✓ 180% Funded</span>
        </div>
      </div>

      {/* Story 3 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#f45a06] to-[#ff8c42] flex items-center justify-center text-white text-xl">
            🎬
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Alex C.</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Filmmaker</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed text-sm">
          Funded my documentary from 50 countries. Built a global community around my vision.
        </p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Goal: $20,000</span>
          <span className="font-bold text-green-600 dark:text-green-400">✓ 110% Funded</span>
        </div>
      </div>
    </div>
  </div>
</section>


      {/* Footer */}
      <footer className="mt-8 sm:mt-12 lg:mt-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 bg-gradient-to-br from-purple-700 via-purple-500 to-purple-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 sm:w-60 sm:h-60 lg:w-80 lg:h-80 bg-gradient-to-br from-purple-800 to-purple-600 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 py-6 sm:py-8 lg:py-12">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-6 lg:mb-8">
            {/* Brand Section */}
            <div className="sm:col-span-2 lg:col-span-2">
              <div className="flex items-center mb-2 sm:mb-3 lg:mb-4">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold">
                  <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Creator</span>
                  <span className="bg-gradient-to-r from-purple-700 via-purple-500 to-purple-400 bg-clip-text text-transparent">Vault</span>
                </h3>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-md">
                The next-generation Web3 platform empowering creators, artists, builders, authors, and innovators to own & crowdfund their creative vision.
              </p>
              <div className="flex items-center gap-2 sm:gap-4 mt-2 sm:mt-4">
                <span className="text-xs text-gray-500">Powered by</span>
                <span className="text-purple-300 font-semibold text-xs sm:text-sm">Camp Network</span>
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="text-sm sm:text-base lg:text-lg font-semibold mb-2 sm:mb-3 lg:mb-4 text-white">Quick Links</h4>
              <ul className="space-y-1 sm:space-y-2">
                <li><a href="/" className="text-gray-400 hover:text-purple-300 transition-colors duration-300 text-xs sm:text-sm">Home</a></li>
                <li><a href="/explore" className="text-gray-400 hover:text-purple-300 transition-colors duration-300 text-xs sm:text-sm">Explore Projects</a></li>
                <li><a href="/dashboard/page" className="text-gray-400 hover:text-purple-300 transition-colors duration-300 text-xs sm:text-sm">Create Project</a></li>
                <li><a href="/" className="text-gray-400 hover:text-purple-300 transition-colors duration-300 text-xs sm:text-sm">How It Works</a></li>
              </ul>
            </div>
            
            {/* Support */}
            <div>
              <h4 className="text-sm sm:text-base lg:text-lg font-semibold mb-2 sm:mb-3 lg:mb-4 text-white">Support</h4>
              <ul className="space-y-1 sm:space-y-2">
                <li><a href="/" className="text-gray-400 hover:text-purple-300 transition-colors duration-300 text-xs sm:text-sm">About Us</a></li>
                <li><a href="/" className="text-gray-400 hover:text-purple-300 transition-colors duration-300 text-xs sm:text-sm">Contact</a></li>
                <li><a href="/" className="text-gray-400 hover:text-purple-300 transition-colors duration-300 text-xs sm:text-sm">FAQs</a></li>
                <li><a href="/" className="text-gray-400 hover:text-purple-300 transition-colors duration-300 text-xs sm:text-sm">Terms & Privacy</a></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="border-t border-gray-700 pt-4 sm:pt-6 lg:pt-8 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
            <p className="text-gray-400 text-xs sm:text-sm">© 2025 CreatorVault. All Rights Reserved.</p>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs text-gray-500">Secured by Blockchain</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400">Network Active</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
