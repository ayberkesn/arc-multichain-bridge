import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'viem/chains';

// Get Alchemy API key from environment
const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || 'od-Qy7D8pDM1cvXoJOBR5KIcDluzHp90';
const ALCHEMY_RPC_URL = `https://arc-testnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Arc Testnet configuration
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: {
    decimals: 6, // USDC has 6 decimals (Arc uses USDC as gas fee)
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: { http: [ALCHEMY_RPC_URL] },
    public: { http: [ALCHEMY_RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://testnet.arcscan.app' },
  },
} as const;

export const config = getDefaultConfig({
  appName: 'Bridge Kit App',
  projectId: 'ed1deffe285a3c80426c7502b6b773dd', // Replace with your WalletConnect Project ID
  chains: [sepolia, arcTestnet],
});

