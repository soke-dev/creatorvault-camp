# CreatorVault 🎨

Welcome to Creator Vault, a powerful, token-gated vault for creators to fund, protect, and share their intellectual property — built entirely on the Camp Network using the Origin SDK.

## ✨ Features

### 🔐 **Blockchain Security**
- **Smart Contract Integration**: 
- **NFT Receipts**:
- **Decentralized Storage**:

### 🎭 **Creator Tools**
- **Multi-Category Support**: Books, Music, Videos, Art, Gaming, Tech, and more
- **Flexible Funding Tiers**: Create custom support levels with different rewards
- **Social Verification**: Verified Twitter, Discord, Spotify, and TikTok integration
- **Media Management**: Upload and manage campaign images, audio, and video content

### 🌟 **User Experience**
- **Dark/Light Mode**: Beautiful theme switching with persistent preferences
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Real-time Updates**: Live campaign statistics and funding progress
- **Contact Collection**: Optional supporter contact information for reward delivery

### 🎵 **Exclusive Access**
- **Premium Content**: Contents, Audio and video access for supporters
- **Community Features**: Recent activity feed and supporter networking
- **Dashboard Management**: Comprehensive creator and supporter dashboards

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MetaMask or compatible Web3 wallet
- Camp Origin SDK

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd creatorvault
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure your environment variables in `.env`:
   ```env
   NEXT_PUBLIC_TEMPLATE_CLIENT_ID=your_thirdweb_client_id
   NEXT_PUBLIC_CAMP_ORIGIN_API_KEY=your_camp_origin_api_key
   NEXT_PUBLIC_CAMP_ORIGIN_CLIENT_ID=your_camp_origin_client_id
   NEXT_PUBLIC_POCKETBASE_URL=your_pocketbase_url
   ```
   
   > ⚠️ **Security Note**: Never commit your `.env` file to version control. The `.env.example` file shows the required variables without sensitive values.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🛠️ Tech Stack

### **Frontend**
- **Next.js 14.1.0** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Icons** - Beautiful icon library

### **Blockchain**
- **Thirdweb** - Web3 development platform
- **Wagmi** - React hooks for Ethereum
- **Viem** - TypeScript interface for Ethereum

### **Backend & Storage**
- **PocketBase** - Real-time database and file storage
- **Camp Network Origin** - Social media verification

### **Smart Contracts**
- **OpenZeppelin** - Secure contract libraries
- **Solidity** - Smart contract development


## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Development Guidelines**
- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Include dark mode support for new components
- Write descriptive commit messages
- Test on multiple screen sizes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Built with ❤️ for creators by creators**

*CreatorVault - Empowering the future of creative funding*
