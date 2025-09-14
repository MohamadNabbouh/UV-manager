'use client';

import { Card, Button, Row } from '@/components/ui';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from 'react';
import { useClaimBalances } from '@/hooks/useClaimBalances';
import { useClaimTokens } from '@/hooks/useClaimTokens';
import { formatUnits } from 'viem';

export default function Page() {
  const [rewardAmt, setRewardAmt] = useState<string>('0');
  const [rewardToken, setRewardToken] = useState<'HONEY' | 'YBGT'>('HONEY');
  const [claimingFees, setClaimingFees] = useState(false);

  // Use the custom hooks
  const { balances, isLoading: balancesLoading, error: balancesError, refetchAll } = useClaimBalances();
  const { claimHoney, claimYBGT} = useClaimTokens();

  // Format token amounts for display
  const formatTokenAmount = (raw: bigint | undefined, decimals: number = 18): string => {
    if (!raw) return '0';
    const formatted = formatUnits(raw, decimals);
    return Number(formatted).toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // Claim functions
  async function claimPerformanceFees() {
    setClaimingFees(true);
    try {
      await Promise.all([claimHoney(), claimYBGT()]);
      await refetchAll(); // Refresh balances after claiming
    } catch (err) {
      console.error('Error claiming performance fees:', err);
    } finally {
      setClaimingFees(false);
    }
  }

  async function addRewards() {
    console.log('add rewards', { rewardAmt, rewardToken });
  }

  async function fundRV() { 
    console.log('fund rv'); 
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16">
      {/* Top bar */}
      <div className="flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-full bg-violet-500" />
          <span className="text-lg font-semibold">UV Manager</span>
        </div>
        <ConnectButton showBalance={false} chainStatus="none" />
      </div>

      <Card className="p-4 md:p-6">
        {/* Error Display */}
        {balancesError && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-sm">
            Error loading balances: {balancesError.message}
          </div>
        )}
        {/* 50% Performance Fees */}
        <section className="border-b border-white/10">
          <Row>
            <div className="text-sm md:text-base">
              <div className="font-medium">50% Performance Fees collected</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right leading-tight">
                <div className="text-sm md:text-base">
                  {balancesLoading ? 'Loading...' : `${formatTokenAmount(balances.honey?.raw, balances.honey?.decimals)} ${balances.honey?.symbol || 'HONEY'}`}
                </div>
                <div className="text-xs text-white/70">
                  {balancesLoading ? 'Loading...' : `${formatTokenAmount(balances.ybgt?.raw, balances.ybgt?.decimals)} ${balances.ybgt?.symbol || 'YBGT'}`}
                </div>
              </div>
              <Button onClick={claimPerformanceFees} isLoading={claimingFees} disabled={balancesLoading || !!balancesError || claimingFees}>
                Claim
              </Button>
              <div className="hidden text-xs text-white/70 md:block">Signer : Multisig 1</div>
            </div>
          </Row>
        </section>

        {/* Add rewards */}
        <section className="border-b border-white/10">
          <Row>
            <div className="text-sm md:text-base">
              <div className="font-medium">Add rewards to swBERA / uvBGT Stakers</div>
            </div>
            <div className="flex items-center gap-3">
              <input
                value={rewardAmt}
                onChange={(e) => setRewardAmt(e.target.value)}
                type="number"
                min="0"
                className="w-28 rounded-lg bg-purple-800/30 px-3 py-2 text-sm outline-none ring-1 ring-purple-400/30"
              />
              <select
                value={rewardToken}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={(e) => setRewardToken(e.target.value as any)}
                className="rounded-lg bg-purple-800/30 px-3 py-2 text-sm outline-none ring-1 ring-purple-400/30"
              >
                <option>HONEY</option>
                <option>YBGT</option>
              </select>
              <Button onClick={addRewards}>Claim</Button>
              <div className="hidden text-xs text-white/70 md:block">Signer : Multisig 1</div>
            </div>
          </Row>
        </section>

        {/* Recommendation text */}
        <div className="py-6 text-sm text-white/80">
          Based on Data above you should bribe : <span className="font-semibold">1,400,000 honey</span>
        </div>

        {/* Fund RV */}
        <section className="space-y-3 pt-2">
          <div className="text-sm font-medium">Fund RV</div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              placeholder="HONEY"
              className="flex-1 rounded-lg bg-purple-800/30 px-3 py-3 text-sm outline-none ring-1 ring-purple-400/30"
            />
            <Button className="md:w-28" onClick={fundRV}>Claim</Button>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              placeholder="BGT Rate"
              className="flex-1 rounded-lg bg-purple-800/30 px-3 py-3 text-sm outline-none ring-1 ring-purple-400/30"
            />
            <div className="rounded-xl bg-purple-800/30 px-3 py-2 text-sm ring-1 ring-purple-400/30">
              50% APR
            </div>
          </div>
        </section>
      </Card>
    </main>
  );
}
