'use client';

import { WagmiProvider, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { defineChain } from 'viem';

const berachain = defineChain({
  id: 80094,
  name: 'Berachain',
  nativeCurrency: { name: 'BERA', symbol: 'BERA', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.berachain.com'] } },
  blockExplorers: { default: { name: 'BeraScan', url: 'https://berascan.com' } },
});

const queryClient = new QueryClient();

const config = getDefaultConfig({
  appName: 'BERA Deposit UI',
  chains: [berachain],
  transports: { [berachain.id]: http('https://rpc.berachain.com') },
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
