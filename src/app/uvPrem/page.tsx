'use client';

import { Card } from '@/components/ui';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import UVRewards from '@/components/UVRewards';
import Link from 'next/link';

export default function UVPremPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-16">
      {/* Top bar */}
      <div className="flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-full bg-violet-500" />
          <span className="text-lg font-semibold">UV Prem Manager</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-purple-300 hover:text-white transition-colors"
          >
            ← Back to Main
          </Link>
          <ConnectButton showBalance={false} chainStatus="none" />
        </div>
      </div>

      <Card className="p-4 md:p-6">
        <UVRewards />
      </Card>
    </main>
  );
}
