'use client';

import { useState, useMemo } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { parseUnits } from 'viem';
import treasuryDistributorAbi from '@/abis/TreasuryDistributor.json';

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_MAINNET_ID || 80094);
const DEFAULT_STAKING = (process.env.NEXT_PUBLIC_STAKING_80094 ||
  '0x214f9baf481fb5b4ffde1f7163100c1379102ff9') as `0x${string}`;

type UseUnstakeOpts = {
  staking?: `0x${string}`;
  chainId?: number;
  decimals?: number; // token decimals used for amount parsing; default 18
};

export function useUnstake(opts: UseUnstakeOpts = {}) {
  const staking = opts.staking ?? DEFAULT_STAKING;
  const chainId = opts.chainId ?? CHAIN_ID;
  const decimals = opts.decimals ?? 18;

  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [amount, setAmount] = useState<string>(''); // human string
  const [maxLoss, setMaxLoss] = useState<string>('0'); // max loss in basis points (e.g., "100" = 1%)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!address || !staking || isSubmitting) return false;
    const n = Number(amount);
    return Number.isFinite(n) && n > 0;
  }, [address, staking, amount, isSubmitting]);

  async function unstake() {
    setError(null);
    setTxHash(null);
    try {
      setIsSubmitting(true);
      const value = parseUnits(amount || '0', decimals);
      const maxLossValue = BigInt(maxLoss || '0');

      const hash = await writeContractAsync({
        address: staking,
        abi: treasuryDistributorAbi,
        functionName: 'unstake',
        args: [value, maxLossValue],
        chainId,
      });

      setTxHash(hash);
    } catch (e: unknown) {
      const error = e as { shortMessage?: string; message?: string };
      setError(error?.shortMessage || error?.message || 'Failed to unstake.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function unstakeAll() {
    setError(null);
    setTxHash(null);
    try {
      setIsSubmitting(true);

      const hash = await writeContractAsync({
        address: staking,
        abi: treasuryDistributorAbi,
        functionName: 'unstakeAll',
        args: [],
        chainId,
      });

      setTxHash(hash);
    } catch (e: unknown) {
      const error = e as { shortMessage?: string; message?: string };
      setError(error?.shortMessage || error?.message || 'Failed to unstake all.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    staking,
    chainId,
    decimals,
    amount,
    setAmount,
    maxLoss,
    setMaxLoss,
    unstake,
    unstakeAll,
    canSubmit,
    isSubmitting,
    txHash,
    error,
  };
}
