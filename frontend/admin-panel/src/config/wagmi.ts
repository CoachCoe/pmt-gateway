import { http, createConfig } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Custom Kusama EVM chains
export const kusamaTestnet = {
  id: 2023,
  name: 'Kusama EVM Testnet',
  nativeCurrency: { decimals: 18, name: 'KSM', symbol: 'KSM' },
  rpcUrls: {
    default: { http: ['https://kusama-testnet-rpc.polkadot.io'] },
  },
  blockExplorers: {
    default: { name: 'Kusama Explorer', url: 'https://kusama.subscan.io' },
  },
  testnet: true,
} as const;

export const kusamaEVM = {
  id: 2024,
  name: 'Kusama EVM',
  nativeCurrency: { decimals: 18, name: 'KSM', symbol: 'KSM' },
  rpcUrls: {
    default: { http: ['https://kusama-evm-rpc.polkadot.io'] },
  },
  blockExplorers: {
    default: { name: 'Kusama Explorer', url: 'https://kusama.subscan.io' },
  },
} as const;

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

export const config = createConfig({
  chains: [kusamaTestnet, kusamaEVM, mainnet, sepolia],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [kusamaTestnet.id]: http(),
    [kusamaEVM.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});
