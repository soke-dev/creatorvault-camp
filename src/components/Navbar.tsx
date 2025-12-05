'use client';
import { useState } from 'react';
import { client } from "@/app/client";
import Link from "next/link";
import Image from "next/image";
import { ConnectButton, lightTheme, darkTheme, useActiveAccount } from "thirdweb/react";
import { useTheme } from "@/contexts/ThemeContext";
import DarkModeToggle from "./DarkModeToggle";

const Navbar = () => {
    const account = useActiveAccount();
    const { theme } = useTheme();

    // State to manage mobile menu visibility
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Custom theme for the ConnectButton based on current theme
    const customTheme = {
        ...(theme === 'dark' ? darkTheme() : lightTheme()),
        button: {
            primary: {
                background: theme === 'dark' 
                    ? "linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)"
                    : "#4f46e5", 
                color: "#ffffff", 
                border: "none", 
            },
            secondary: {
                background: theme === 'dark' ? "#374151" : "#1f2937",
                color: "#ffffff",
            },
        },
    };

    return (
        <nav className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-lg sticky top-0 z-50 transition-colors duration-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="relative flex h-20 items-center justify-between">
                    {/* Mobile menu button */}
                    <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                        <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-xl p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-700 dark:focus:ring-purple-400 transition-all duration-200"
                            aria-controls="mobile-menu"
                            aria-expanded={isMobileMenuOpen}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMobileMenuOpen ? (
                                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <div className="flex flex-1 items-center sm:items-stretch sm:justify-start justify-between">
                        {/* Logo Section */}
                        <div className="flex flex-shrink-0 items-center ml-12 sm:ml-0">
                            <Link href="/" className="flex items-center space-x-3 group">
                                <div className="relative">
                                    <Image 
                                        src="/logo.png" 
                                        alt="CreatorVault Logo" 
                                        width={48}
                                        height={48}
                                        unoptimized
                                        priority
                                        className="h-12 w-auto group-hover:scale-110 transition-transform duration-300"
                                        onError={(e) => {
                                            console.error('Logo failed to load:', e);
                                            // Fallback to a simple colored div if logo fails
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            const parent = target.parentElement;
                                            if (parent && !parent.querySelector('.logo-fallback')) {
                                                const fallback = document.createElement('div');
                                                fallback.className = 'logo-fallback h-12 w-12 bg-gradient-to-r from-purple-700 to-[#f45a06] rounded-full flex items-center justify-center text-white font-bold text-xl';
                                                fallback.textContent = 'CV';
                                                parent.appendChild(fallback);
                                            }
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-700/20 via-purple-500/20 to-[#f45a06]/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </div>
                                <div className="hidden sm:block">
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-700 via-purple-500 to-[#f45a06] bg-clip-text text-transparent">
                                        CreatorVault
                                    </h1>
                                    <p className="text-xs text-gray-500 -mt-1">Creative Crowdfunding</p>
                                </div>
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden sm:ml-8 sm:block">
                            <div className="flex space-x-1">
                                <Link href={'/'}>
                                    <div className="group relative px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 transition-colors duration-300 cursor-pointer">
                                        Home
                                        <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-700 via-purple-500 to-[#f45a06] group-hover:w-full transition-all duration-300"></div>
                                    </div>
                                </Link>
                                <Link href="/explore">
                                    <div className="group relative px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 transition-colors duration-300 cursor-pointer">
                                        Explore
                                        <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-700 via-purple-500 to-[#f45a06] group-hover:w-full transition-all duration-300"></div>
                                    </div>
                                </Link>
                                <Link href="/bounty">
                                    <div className="group relative px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 transition-colors duration-300 cursor-pointer">
                                        Bounties
                                        <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-700 via-purple-500 to-[#f45a06] group-hover:w-full transition-all duration-300"></div>
                                    </div>
                                </Link>
                                {account && (
                                    <Link href={`/dashboard/${account?.address}`}>
                                        <div className="group relative px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 transition-colors duration-300 cursor-pointer">
                                            Dashboard
                                            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-700 via-purple-500 to-[#f45a06] group-hover:w-full transition-all duration-300"></div>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dark Mode Toggle and Connect Button */}
                    <div className="absolute inset-y-0 right-0 flex items-center gap-3 pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                        {/* Dark Mode Toggle */}
                        <DarkModeToggle />
                        
                        {/* Connect Button */}
                        <div className="connect-button-wrapper">
                            <ConnectButton
                                client={client}
                                theme={customTheme}
                                detailsButton={{
                                    style: {
                                        maxHeight: "45px",
                                        borderRadius: "12px",
                                        background: theme === 'dark' 
                                            ? "linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)"
                                            : "linear-gradient(135deg, #f45a06 0%, #ff8c42 50%, #ffb366 100%)",
                                        border: "none",
                                        boxShadow: theme === 'dark'
                                            ? "0 4px 15px rgba(59, 130, 246, 0.3)"
                                            : "0 4px 15px rgba(244, 90, 6, 0.3)",
                                        transition: "all 0.3s ease",
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu (visible when open) */}
            {isMobileMenuOpen && (
                <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md transition-colors duration-300" id="mobile-menu">
                    <div className="space-y-1 px-4 pb-6 pt-4">
                        <Link href="/">
                            <div className="block rounded-xl px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-purple-700 dark:hover:text-purple-400 transition-all duration-300 cursor-pointer">
                                Home
                            </div>
                        </Link>
                        <Link href="/explore">
                            <div className="block rounded-xl px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-purple-700 dark:hover:text-purple-400 transition-all duration-300 cursor-pointer">
                                Explore
                            </div>
                        </Link>
                        <Link href="/bounty">
                            <div className="block rounded-xl px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-purple-700 dark:hover:text-purple-400 transition-all duration-300 cursor-pointer">
                                Bounties
                            </div>
                        </Link>
                        {account && (
                            <Link href={`/dashboard/${account?.address}`}>
                                <div className="block rounded-xl px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-purple-700 dark:hover:text-purple-400 transition-all duration-300 cursor-pointer">
                                    Dashboard
                                </div>
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
