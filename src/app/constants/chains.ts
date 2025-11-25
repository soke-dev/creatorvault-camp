import { defineChain } from "thirdweb";

// Camp Network BaseCAMP
export const chain = defineChain({
  id: 123420001114,
  name: "basecamp",
  nativeCurrency: {
    name: "CAMP",
    symbol: "CAMP",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_BASECAMP_RPC || "https://rpc.basecamp.t.raas.gelato.cloud",
        "https://rpc-campnetwork.xyz"
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "BaseCAMP Explorer",
      url: "https://basecamp.cloud.blockscout.com",
    },
  },
  testnet: false,
});