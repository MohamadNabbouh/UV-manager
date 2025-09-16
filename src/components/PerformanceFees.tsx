"use client";
import { Row, Button } from "@/components/ui";
import { useClaimBalances } from "@/hooks/useClaimBalances";
import { useClaimTokens } from "@/hooks/useClaimTokens";
import { useState } from "react";
import { formatUnits } from "viem";

export default function PerformanceFees() {
  const [claimingFees, setClaimingFees] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { balances, isLoading: balancesLoading, error: balancesError, refetchAll } = useClaimBalances();
  const { claimHoney, claimYBGT } = useClaimTokens();

  // Format token amounts for display
  const formatTokenAmount = (raw: bigint | undefined, decimals: number = 18): string => {
    if (!raw) return '0';
    const formatted = formatUnits(raw, decimals);
    return Number(formatted).toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  async function claimPerformanceFees() {
    setClaimingFees(true);
    setError(null);
    try {
      await Promise.all([claimHoney(), claimYBGT()]);
      await refetchAll(); // Refresh balances after claiming
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; message?: string };
      setError(error?.shortMessage || error?.message || "Claim failed");
    } finally {
      setClaimingFees(false);
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
          <Button onClick={claimPerformanceFees} isLoading={claimingFees} disabled={balancesLoading || !!balancesError || claimingFees}>
            Claim
          </Button>
          <div className="hidden text-xs text-white/70 md:block">Signer : Multisig 1</div>
        </div>
      </Row>
      {error && <div className="text-xs text-red-400 mt-2">{error}</div>}
    </section>
  );
}
