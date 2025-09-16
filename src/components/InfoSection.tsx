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
    <div className="py-4 space-y-2">
      <div className="space-y-1">
        <p className="text-sm text-white/60">HS: HONEY — <span className="text-white/90">Balance: {showBal}</span></p>
        <div className="space-y-1 pl-2">
          <p className="text-base text-white/80">
            Multisig: {multisigBalanceFormatted}
          </p>
          <p className="text-base text-white/80">
            50% Performance Fees: {performanceFeesFormatted}
          </p>
        </div>
      </div>
      
      {/* Percentage input */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/60">Keep:</span>
        <Input 
          value={bribePercentage} 
          onChange={(e) => setBribePercentage(e.target.value)} 
          placeholder="0" 
          type="number"
          min="0"
          max="100"
          className="w-12 text-center text-xs"
        />
        <span className="text-xs text-white/60">%</span>
      </div>
      
      <p className="text-sm text-white/60">
        Based on data above you should bribe: <span className="text-white/90">
          {formatUnits(shouldBribeWei as bigint, dec)} HONEY
        </span>
      </p>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
