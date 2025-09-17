'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount, useWriteContract, usePublicClient, useSwitchChain } from 'wagmi';
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

  const { address, chainId: currentChainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();

  const [amount, setAmount] = useState<string>(''); // human string
  const [maxLoss, setMaxLoss] = useState<string>('0'); // max loss in basis points (e.g., "100" = 1%)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use state to handle hydration mismatch
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const canSubmit = useMemo(() => {
    if (!isClient) return false; // During SSR and initial hydration
    if (!address || !staking || isSubmitting) return false;
    const n = Number(amount);
    return Number.isFinite(n) && n > 0;
  }, [isClient, address, staking, amount, isSubmitting]);

  const canSubmitUnstakeAll = useMemo(() => {
    if (!isClient) return false; // During SSR and initial hydration
    return !(!address || !staking || isSubmitting);
  }, [isClient, address, staking, isSubmitting]);

  async function unstake() {
    console.log('🚀 [UNSTAKE] Starting unstake process', {
      address,
      staking,
      chainId,
      currentChainId,
      amount,
      maxLoss,
      decimals,
      timestamp: new Date().toISOString()
    });

    setError(null);
    setTxHash(null);
    
    try {
      // Validation
      if (!address) {
        throw new Error('Wallet not connected');
      }
      if (!staking) {
        throw new Error('Staking contract address not provided');
      }
      if (!amount || Number(amount) <= 0) {
        throw new Error('Invalid amount: must be greater than 0');
      }

      setIsSubmitting(true);

      // Switch chain if needed
      if (currentChainId !== chainId) {
        console.log('🔄 [UNSTAKE] Switching chain', { from: currentChainId, to: chainId });
        await switchChainAsync({ chainId });
        console.log('✅ [UNSTAKE] Chain switched successfully');
      }

      const value = parseUnits(amount || '0', decimals);
      const maxLossValue = BigInt(maxLoss || '0');

      console.log('📊 [UNSTAKE] Parsed values', {
        amount,
        value: value.toString(),
        maxLoss,
        maxLossValue: maxLossValue.toString(),
        decimals
      });

      // Simulate the transaction first (optional, helps catch errors early)
      // Note: Like useClaimTokens, simulation may fail due to authorization but actual tx might work
      try {
        console.log('🧪 [UNSTAKE] Simulating transaction...');
        await publicClient?.simulateContract({
          address: staking,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          abi: treasuryDistributorAbi as any,
          functionName: 'unstake',
          args: [value, maxLossValue],
          account: address,
        });
        console.log('✅ [UNSTAKE] Simulation successful');
      } catch (simError: unknown) {
        const error = simError as { shortMessage?: string; message?: string; code?: string };
        const errorMsg = error?.shortMessage || error?.message || '';
        console.warn('⚠️ [UNSTAKE] Simulation failed, continuing with actual transaction', {
          error: errorMsg,
          code: error?.code,
          details: simError
        });
        
        // Check for various error types
        const isAuthError = errorMsg.toLowerCase().includes('unauthorized') || 
                           errorMsg.toLowerCase().includes('access') ||
                           errorMsg.toLowerCase().includes('permission') ||
                           errorMsg.includes('#1002'); // Previous error code
        
        // Check for the new error signature
        const hasErrorSignature = errorMsg.includes('0x6e6c2928') || 
                                 errorMsg.includes('reverted with the following signature');
        
        // Check for common contract errors that might be fixable
        const isContractError = errorMsg.toLowerCase().includes('insufficient') ||
                               errorMsg.toLowerCase().includes('balance') ||
                               errorMsg.toLowerCase().includes('amount') ||
                               hasErrorSignature;
        
        if (isAuthError || hasErrorSignature) {
          // Continue with transaction for auth errors or unknown signatures
          console.warn('⚠️ [UNSTAKE] Continuing despite simulation failure (likely auth/permission issue)');
        } else if (isContractError) {
          // These are likely real contract issues
          console.error('🚨 [UNSTAKE] Contract error detected:', simError);
          throw new Error(`Contract error: ${errorMsg}. Check your balance and amount.`);
        } else {
          // Unknown error type
          console.error('🚨 [UNSTAKE] Unknown simulation error:', simError);
          throw new Error(`Simulation failed: ${errorMsg}`);
        }
      }

      console.log('📝 [UNSTAKE] Executing transaction...');
      const hash = await writeContractAsync({
        address: staking,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        abi: treasuryDistributorAbi as any,
        functionName: 'unstake',
        args: [value, maxLossValue],
        chainId,
      });

      console.log('🎯 [UNSTAKE] Transaction submitted', { hash });
      setTxHash(hash);

      // Wait for transaction confirmation
      if (publicClient) {
        console.log('⏳ [UNSTAKE] Waiting for transaction confirmation...');
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log('✅ [UNSTAKE] Transaction confirmed', { 
          hash, 
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          status: receipt.status
        });
        
        if (receipt.status === 'reverted') {
          throw new Error('Transaction reverted');
        }
      }

    } catch (e: unknown) {
      const error = e as { shortMessage?: string; message?: string; code?: string };
      const errorMessage = error?.shortMessage || error?.message || 'Failed to unstake';
      
      console.error('❌ [UNSTAKE] Transaction failed', {
        error: errorMessage,
        code: error?.code,
        fullError: e,
        timestamp: new Date().toISOString()
      });
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
      console.log('🏁 [UNSTAKE] Process completed', { timestamp: new Date().toISOString() });
    }
  }

  async function unstakeAll() {
    console.log('🚀 [UNSTAKE_ALL] Starting unstake all process', {
      address,
      staking,
      chainId,
      currentChainId,
      timestamp: new Date().toISOString()
    });

    setError(null);
    setTxHash(null);
    
    try {
      // Validation
      if (!address) {
        throw new Error('Wallet not connected');
      }
      if (!staking) {
        throw new Error('Staking contract address not provided');
      }

      setIsSubmitting(true);

      // Switch chain if needed
      if (currentChainId !== chainId) {
        console.log('🔄 [UNSTAKE_ALL] Switching chain', { from: currentChainId, to: chainId });
        await switchChainAsync({ chainId });
        console.log('✅ [UNSTAKE_ALL] Chain switched successfully');
      }

      // Simulate the transaction first (optional, helps catch errors early)
      // Note: Like useClaimTokens, simulation may fail due to authorization but actual tx might work
      try {
        console.log('🧪 [UNSTAKE_ALL] Simulating transaction...');
        await publicClient?.simulateContract({
          address: staking,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          abi: treasuryDistributorAbi as any,
          functionName: 'unstakeAll',
          args: [],
          account: address,
        });
        console.log('✅ [UNSTAKE_ALL] Simulation successful');
      } catch (simError: unknown) {
        const error = simError as { shortMessage?: string; message?: string; code?: string };
        const errorMsg = error?.shortMessage || error?.message || '';
        console.warn('⚠️ [UNSTAKE_ALL] Simulation failed, continuing with actual transaction', {
          error: errorMsg,
          code: error?.code,
          details: simError
        });
        
        // Check for various error types
        const isAuthError = errorMsg.toLowerCase().includes('unauthorized') || 
                           errorMsg.toLowerCase().includes('access') ||
                           errorMsg.toLowerCase().includes('permission') ||
                           errorMsg.includes('#1002'); // Previous error code
        
        // Check for the new error signature
        const hasErrorSignature = errorMsg.includes('0x6e6c2928') || 
                                 errorMsg.includes('reverted with the following signature');
        
        // Check for common contract errors that might be fixable
        const isContractError = errorMsg.toLowerCase().includes('insufficient') ||
                               errorMsg.toLowerCase().includes('balance') ||
                               errorMsg.toLowerCase().includes('amount') ||
                               hasErrorSignature;
        
        if (isAuthError || hasErrorSignature) {
          // Continue with transaction for auth errors or unknown signatures
          console.warn('⚠️ [UNSTAKE_ALL] Continuing despite simulation failure (likely auth/permission issue)');
        } else if (isContractError) {
          // These are likely real contract issues
          console.error('🚨 [UNSTAKE_ALL] Contract error detected:', simError);
          throw new Error(`Contract error: ${errorMsg}. Check your balance.`);
        } else {
          // Unknown error type
          console.error('🚨 [UNSTAKE_ALL] Unknown simulation error:', simError);
          throw new Error(`Simulation failed: ${errorMsg}`);
        }
      }

      console.log('📝 [UNSTAKE_ALL] Executing transaction...');
      const hash = await writeContractAsync({
        address: staking,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        abi: treasuryDistributorAbi as any,
        functionName: 'unstakeAll',
        args: [],
        chainId,
      });

      console.log('🎯 [UNSTAKE_ALL] Transaction submitted', { hash });
      setTxHash(hash);

      // Wait for transaction confirmation
      if (publicClient) {
        console.log('⏳ [UNSTAKE_ALL] Waiting for transaction confirmation...');
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log('✅ [UNSTAKE_ALL] Transaction confirmed', { 
          hash, 
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          status: receipt.status
        });
        
        if (receipt.status === 'reverted') {
          throw new Error('Transaction reverted');
        }
      }

    } catch (e: unknown) {
      const error = e as { shortMessage?: string; message?: string; code?: string };
      const errorMessage = error?.shortMessage || error?.message || 'Failed to unstake all';
      
      console.error('❌ [UNSTAKE_ALL] Transaction failed', {
        error: errorMessage,
        code: error?.code,
        fullError: e,
        timestamp: new Date().toISOString()
      });
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
      console.log('🏁 [UNSTAKE_ALL] Process completed', { timestamp: new Date().toISOString() });
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
    canSubmitUnstakeAll,
    isSubmitting,
    txHash,
    error,
  };
}
