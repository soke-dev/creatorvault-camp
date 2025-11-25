import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { CampProvider } from "@campnetwork/origin/react"; // <-- Add this import
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/Toast";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { suppressImageErrors } from "@/utils/suppressImageErrors";

const inter = Inter({ subsets: ["latin"] });

// Suppress image errors in development
if (typeof window !== 'undefined') {
  suppressImageErrors();
}

export const metadata: Metadata = {
  title: "CreatorVault",
  description: "Secure blockchain-powered funding platform for artists and creators. Fund books, music, videos, and creative projects with verified social media integration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-100 text-slate-700 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
        <ThemeProvider>
          <ThirdwebProvider>
            <CampProvider clientId={process.env.NEXT_PUBLIC_CAMP_ORIGIN_CLIENT_ID || ""}>
              <ToastProvider>
                <Navbar />
                {children}
              </ToastProvider>
            </CampProvider>
          </ThirdwebProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}