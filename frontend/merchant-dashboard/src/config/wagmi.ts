import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// Define Kusama EVM chain
export const kusamaEVM = {
  id: 2023, // Kusama EVM chain ID
  name: 'Kusama EVM',
  network: 'kusama-evm',
  nativeCurrency: {
    decimals: 18,
    name: 'KSM',
    symbol: 'KSM',
  },
  rpcUrls: {
    default: {
      http: ['https://kusama-evm-rpc.polkadot.io'],
      webSocket: ['wss://kusama-evm-rpc.polkadot.io']
    },
    public: {
      http: ['https://kusama-evm-rpc.polkadot.io'],
      webSocket: ['wss://kusama-evm-rpc.polkadot.io']
    },
  },
  blockExplorers: {
    default: {
      name: 'Subscan',
      url: 'https://kusama.subscan.io'
    },
  },
  testnet: false,
} as const

// Kusama Testnet
export const kusamaTestnet = {
  id: 2024,
  name: 'Kusama Testnet',
  network: 'kusama-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'KSM',
    symbol: 'KSM',
  },
  rpcUrls: {
    default: { http: ['https://kusama-testnet-rpc.polkadot.io'] },
    public: { http: ['https://kusama-testnet-rpc.polkadot.io'] },
  },
  blockExplorers: {
    default: { name: 'Subscan', url: 'https://kusama-testnet.subscan.io' },
  },
  testnet: true,
} as const

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID'

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
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
