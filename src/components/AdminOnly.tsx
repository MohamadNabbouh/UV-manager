'use client';

import { PropsWithChildren, useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAdminGate } from '@/hooks/useAdminGate';
import { useSwitchChain } from 'wagmi';

export default function AdminOnly({ children }: PropsWithChildren) {
  const MAINNET_ID = Number(process.env.NEXT_PUBLIC_MAINNET_ID || 80094);
  const { status, address, chainId } = useAdminGate({ enforceChainId: MAINNET_ID });
  const { switchChain } = useSwitchChain();
  const [isInitialized, setIsInitialized] = useState(false);

  // Prevent flash of login popup during initial load and navigation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 200); // Simple delay to prevent flash

    return () => clearTimeout(timer);
  }, []);

  // Show loading state during initialization to prevent flash
  if (!isInitialized) {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-16">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        </div>
      </div>
    );
  }

  if (status === 'connecting' || status === 'disconnected') {
    return (
      <div className="mx-auto max-w-md p-6 rounded-2xl border">
        <h2 className="text-xl font-semibold mb-2">Admin Access</h2>
        <p className="mb-4 text-sm opacity-80">Connect your wallet to continue.</p>
        <ConnectButton />
      </div>
    );
  }

  if (status === 'wrong-network') {
    return (
      <div className="mx-auto max-w-md p-6 rounded-2xl border">
        <h2 className="text-xl font-semibold mb-2">Wrong Network</h2>
        <p className="mb-4 text-sm opacity-80">
          You’re connected to chain {chainId}. Please switch to {MAINNET_ID}.
        </p>
        <button
          onClick={() => switchChain({ chainId: MAINNET_ID })}
          className="px-4 py-2 rounded-xl border"
        >
          Switch Network
        </button>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return (
      <div className="mx-auto max-w-md p-6 rounded-2xl border">
        <h2 className="text-xl font-semibold mb-2">No Access</h2>
        <p className="text-sm opacity-80 break-all">
          Wallet <span className="font-mono">{address}</span> is not on the admin allowlist.
        </p>
        <div className="mt-4">
          <ConnectButton />
        </div>
      </div>
    );
  }

  // status === 'authorized'
  return <>{children}</>;
}
