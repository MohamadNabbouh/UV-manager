"use client";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import erc20Abi from "@/abis/ERC20.json";
import { useClaimBalances } from "@/hooks/useClaimBalances";

// Environment variables
const HONEY = process.env.NEXT_PUBLIC_HONEY_80094!.trim() as `0x${string}`;
const SHOW = process.env.NEXT_PUBLIC_CLAIM_DESTINATION!.trim() as `0x${string}`;

interface InfoSectionProps {
  error?: string | null;
}

export default function InfoSection({ error }: InfoSectionProps) {
  const [bribePercentage, setBribePercentage] = useState('0');
  const { balances } = useClaimBalances();

  // Contract reads
  const { data: dDec } = useReadContract({ address: HONEY, abi: erc20Abi, functionName: 'decimals' });
  const dec = typeof dDec === 'number' ? dDec : 18;

  // Multisig balance (SHOW is the multisig)
  const { data: multisigBalRaw } = useReadContract({ 
    address: HONEY, 
    abi: erc20Abi, 
    functionName: 'balanceOf', 
    args: [SHOW] 
  });
  
  // 50% Performance fees (HONEY from balances hook)
  const performanceFeesRaw = balances.honey?.raw || BigInt(0);
  
  // Total balance = multisig + 50% performance fees
  const totalBalanceWei = useMemo(() => {
    const multisigBalance = (multisigBalRaw as bigint) || BigInt(0);
    const performanceFees = performanceFeesRaw as bigint;
    return multisigBalance + performanceFees;
  }, [multisigBalRaw, performanceFeesRaw]);
  
  const showBal = useMemo(() => totalBalanceWei ? formatUnits(totalBalanceWei, dec) : '0', [totalBalanceWei, dec]);
  
  // Bribe calculation: total balance - (user percentage of total balance)
  const shouldBribeWei = useMemo(() => {
    const percentage = parseFloat(bribePercentage || '0') / 100;
    const bribeAmount = totalBalanceWei - BigInt(Math.floor(Number(formatUnits(totalBalanceWei, dec)) * percentage * Math.pow(10, dec)));
    return bribeAmount > BigInt(0) ? bribeAmount : BigInt(0);
  }, [totalBalanceWei, bribePercentage, dec]);

  // Format individual components for display
  const multisigBalanceFormatted = useMemo(() => {
    const multisigBalance = (multisigBalRaw as bigint) || BigInt(0);
    return formatUnits(multisigBalance, dec);
  }, [multisigBalRaw, dec]);
  
  const performanceFeesFormatted = useMemo(() => {
    return formatUnits(performanceFeesRaw, dec);
  }, [performanceFeesRaw, dec]);

  return (
    <div className="py-6 space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/90">HS: HONEY Balance</h3>
        <div className="text-2xl font-mono text-white/90">{Number(showBal).toLocaleString()}</div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/5 border border-white/10">
          <span className="text-sm text-white/70">Multisig</span>
          <span className="text-sm font-mono text-white/90">{Number(multisigBalanceFormatted).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/5 border border-white/10">
          <span className="text-sm text-white/70">50% Performance Fees</span>
          <span className="text-sm font-mono text-white/90">{Number(performanceFeesFormatted).toLocaleString()}</span>
        </div>
      </div>
      
      {/* Bribe Calculator */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/70">Keep:</span>
          <Input 
            value={bribePercentage} 
            onChange={(e) => setBribePercentage(e.target.value)} 
            placeholder="0" 
            type="number"
            min="0"
            max="100"
            className="w-16 text-center text-sm"
          />
          <span className="text-sm text-white/70">%</span>
        </div>
        
        <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <p className="text-xs text-violet-300 mb-1">Recommended Bribe Amount</p>
          <p className="text-lg font-mono text-violet-100">
            {Number(formatUnits(shouldBribeWei as bigint, dec)).toLocaleString()} HONEY
          </p>
        </div>
      </div>
      
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
