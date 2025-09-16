import { useMemo, useState } from 'react';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits, zeroAddress } from 'viem';
import erc20Abi from '@/abis/ERC20.json';

// Prefer env, fall back to hardcoded address if someone forgets the env in dev
const UVBGT = ((process.env.NEXT_PUBLIC_UVBGT_80094 || '0xFa1EaB9Ca7c0E6Ba423561c8a1e156F69a9c8FC4').trim()) as `0x${string}`;
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_MAINNET_ID || 80094) as number;

// Minimal ABI for optional direct burn() fallback
const burnAbi = [
  {
    type: 'function',
    name: 'burn',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
] as const;

export function useUvBgtBurn() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [amount, setAmount] = useState('');
  const [isBurning, setIsBurning] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reads
  const { data: decimals } = useReadContract({
    address: UVBGT, abi: erc20Abi, functionName: 'decimals'
  });

  const { data: totalSupply } = useReadContract({
    address: UVBGT, abi: erc20Abi, functionName: 'totalSupply', query: { refetchInterval: 10_000 }
  });

  const { data: zeroBalance } = useReadContract({
    address: UVBGT, abi: erc20Abi, functionName: 'balanceOf', args: [zeroAddress], query: { refetchInterval: 10_000 }
  });

  const display = useMemo(() => {
    if (totalSupply == null || zeroBalance == null || decimals == null) return null;
    const circMinusZero = (totalSupply as bigint) - (zeroBalance as bigint);
    return {
      // EXACTLY what you asked for: totalSupply - balance(0x0000…)
      totalMinusZero: formatUnits(circMinusZero, Number(decimals)),
    };
  }, [totalSupply, zeroBalance, decimals]);

  const burn = async () => {
    setError(null);
    setTxHash(null);
    try {
      if (!amount) throw new Error('Enter an amount.');
      if (!decimals) throw new Error('Token decimals not loaded yet.');
      setIsBurning(true);

      const value = parseUnits(amount, Number(decimals));

      // Primary approach: transfer to zero address (what you requested)
      // Note: Many ERC-20s (OpenZeppelin) REJECT transfers to zero.
      // If it reverts with a known message, try a direct burn() fallback.
      let hash: `0x${string}` | undefined;
      try {
        hash = await writeContractAsync({
          address: UVBGT,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [zeroAddress, value],
          chainId: CHAIN_ID,
        });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        const msg = (e?.shortMessage || e?.message || '').toLowerCase();
        const mightBeZeroBlock = msg.includes('zero address') || msg.includes('revert') || msg.includes('invalid');
        if (!mightBeZeroBlock) throw e;

        // Fallback: try burn(amount)
        hash = await writeContractAsync({
          address: UVBGT,
          abi: burnAbi,
          functionName: 'burn',
          args: [value],
          chainId: CHAIN_ID,
        });
      }

      setTxHash(hash!);
      await publicClient?.waitForTransactionReceipt({ hash: hash! });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Burn failed');
    } finally {
      setIsBurning(false);
    }
  };

  return {
    address,
    amount, setAmount,
    isBurning, burn, txHash, error,
    display, // { totalMinusZero } or null
  };
}
