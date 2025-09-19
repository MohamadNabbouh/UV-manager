'use client';

import { useMemo, useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { isHex, hexToBytes, parseUnits } from 'viem';
import erc20Abi from '@/abis/ERC20.json';
import treasuryDistributorAbi from '@/abis/TreasuryDistributor.json'; 

const BGT = (process.env.NEXT_PUBLIC_BGT_80094 || '').trim() as `0x${string}`;
const EXPLORER = (process.env.NEXT_PUBLIC_MAINNET_EXPLORER || 'https://berascan.com').trim();

export function useQueueDropBoost() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [pubkey, setPubkey] = useState<`0x${string}`>('0x');
  const [amount, setAmount] = useState('');            // human-readable BGT (e.g., "1.5")
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  // BGT decimals (likely 18, but read it to be safe)
  const { data: decimals } = useReadContract({
    address: BGT,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: !!BGT },
  });

  // Current boosted balance on this validator for the caller
  const validPubkey =
    isHex(pubkey) && (() => { try { return hexToBytes(pubkey).length === 48; } catch { return false; } })();

  const { data: boosted } = useReadContract({
    address: BGT,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!BGT },
  });

  const parsedAmount = useMemo(() => {
    if (!amount || decimals == null) return null;
    try { 
      const parsed = parseUnits(amount, Number(decimals));
      // Convert to uint128 (max value is 2^128 - 1)
      const maxUint128 = BigInt('340282366920938463463374607431768211455');
      return parsed > maxUint128 ? null : parsed;
    } catch { return null; }
  }, [amount, decimals]);

  async function queueDropBoost() {
    setError(null);
    setTxHash(null);
    setIsSubmitting(true);
    try {
      if (!BGT) throw new Error('BGT address is missing.');
      if (!validPubkey) throw new Error('Invalid pubkey: must be 48-byte hex (0x + 96 hex chars).');
      if (!parsedAmount || parsedAmount <= BigInt(0)) throw new Error('Enter a valid amount.');

      const hash = await writeContractAsync({
        address: BGT,
        abi: treasuryDistributorAbi,
        functionName: 'queueDropBoost',
        args: [pubkey, parsedAmount],
      });

      setTxHash(hash);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      // wagmi/viem surfaces .shortMessage when available
      setError(e?.shortMessage ?? e?.message ?? String(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    pubkey, setPubkey,
    amount, setAmount,
    decimals: decimals as number | undefined,
    boosted: (boosted as bigint | undefined) ?? BigInt(0),
    validPubkey,
    parsedAmount,
    isSubmitting,
    error,
    txHash,
    explorerTxUrl: txHash ? `${EXPLORER}/tx/${txHash}` : null,
    queueDropBoost,
  };
}
