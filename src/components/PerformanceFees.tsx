"use client";
import { Row, Button } from "@/components/ui";
import { useClaimBalances } from "@/hooks/useClaimBalances";
import { useClaimTokens } from "@/hooks/useClaimTokens";
import { useState } from "react";
import { formatUnits } from "viem";

export default function PerformanceFees() {
  const [claimingHoney, setClaimingHoney] = useState(false);
  const [claimingYBGT, setClaimingYBGT] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { balances, isLoading: balancesLoading, error: balancesError, refetchAll } = useClaimBalances();
  const { claimHoney, claimYBGT } = useClaimTokens();

  // Format token amounts for display
  const formatTokenAmount = (raw: bigint | undefined, decimals: number = 18): string => {
    if (!raw) return '0';
    const formatted = formatUnits(raw, decimals);
    return Number(formatted).toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  async function claimHoneyTokens() {
    setClaimingHoney(true);
    setError(null);
    try {
      await claimHoney();
      await refetchAll(); // Refresh balances after claiming
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; message?: string };
      setError(error?.shortMessage || error?.message || "Honey claim failed");
    } finally {
      setClaimingHoney(false);
    }
  }

  async function claimYBGTTokens() {
    setClaimingYBGT(true);
    setError(null);
    try {
      await claimYBGT();
      await refetchAll(); // Refresh balances after claiming
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; message?: string };
      setError(error?.shortMessage || error?.message || "yBGT claim failed");
    } finally {
      setClaimingYBGT(false);
    }
  }

  return (
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
          <div className="flex gap-2">
            <Button 
              onClick={claimHoneyTokens} 
              isLoading={claimingHoney} 
              disabled={balancesLoading || !!balancesError || claimingHoney || claimingYBGT}
            >
              Claim Honey
            </Button>
            <Button 
              onClick={claimYBGTTokens} 
              isLoading={claimingYBGT} 
              disabled={balancesLoading || !!balancesError || claimingHoney || claimingYBGT}
            >
              Claim yBGT
            </Button>
          </div>
        </div>
      </Row>
      {error && <div className="text-xs text-red-400 mt-2">{error}</div>}
    </section>
  );
}
