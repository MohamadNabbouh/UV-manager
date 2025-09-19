'use client';

import { useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { isAdminAddress } from '@/lib/admins';

type GateStatus =
  | 'disconnected'
  | 'connecting'
  | 'wrong-network'
  | 'authorized'
  | 'unauthorized';

export function useAdminGate(opts?: { enforceChainId?: number }) {
  const { address, status: accountStatus } = useAccount();
  const chainId = useChainId();
  const enforceChainId = opts?.enforceChainId;

  const isAdmin = useMemo(() => isAdminAddress(address), [address]);

  const status: GateStatus = useMemo(() => {
    if (accountStatus === 'connecting' || accountStatus === 'reconnecting') return 'connecting';
    if (accountStatus !== 'connected') return 'disconnected';
    if (enforceChainId && chainId && chainId !== enforceChainId) return 'wrong-network';
    return isAdmin ? 'authorized' : 'unauthorized';
  }, [accountStatus, chainId, enforceChainId, isAdmin]);

  return { status, address, chainId, isAdmin };
}
