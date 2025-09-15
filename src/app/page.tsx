'use client';

import { Card, Button, Row, Input } from '@/components/ui';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect, useMemo } from 'react';
import { useClaimBalances } from '@/hooks/useClaimBalances';
import { useClaimTokens } from '@/hooks/useClaimTokens';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import erc20Abi from '@/abis/ERC20.json';
import treasuryDistributorAbi from '@/abis/TreasuryDistributor.json';

// Environment variables
const HONEY  = process.env.NEXT_PUBLIC_HONEY_80094!.trim() as `0x${string}`;
const VAULT  = process.env.NEXT_PUBLIC_UV_REWARD_VAULT_UVBGT_SWBERA_CONTRACT!.trim() as `0x${string}`;
 const SHOW   = process.env.NEXT_PUBLIC_CLAIM_DESTINATION!.trim() as `0x${string}`;
const CHAIN  = Number(process.env.NEXT_PUBLIC_MAINNET_ID || 80094);

export default function Page() {
  const [rewardAmt, setRewardAmt] = useState<string>('0');
  const [rewardToken, setRewardToken] = useState<'HONEY' | 'YBGT'>('HONEY');
  const [claimingFees, setClaimingFees] = useState(false);
  
  // Funding state
  const [amt, setAmt] = useState('');
  const [dec, setDec] = useState(18);
  const [count, setCount] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  
  // Percentage input for bribe calculation
  const [bribePercentage, setBribePercentage] = useState('0');

  // Use the custom hooks
  const { balances, isLoading: balancesLoading, error: balancesError, refetchAll } = useClaimBalances();
  const { claimHoney, claimYBGT} = useClaimTokens();
  
  // Wagmi hooks
  const { address, chainId } = useAccount();
  const pc = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  
  // Contract reads
  const { data: dDec } = useReadContract({ address: HONEY, abi: erc20Abi, functionName: 'decimals' });
  useEffect(() => { if (typeof dDec === 'number') setDec(dDec); }, [dDec]);

  // Multisig balance (SHOW is the multisig)
  const { data: multisigBalRaw } = useReadContract({ address: HONEY, abi: erc20Abi, functionName: 'balanceOf', args: [SHOW] });
  
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

  // Staker count (try common names; if none found, keep null)
  useEffect(() => {
    let ok = true;
    (async () => {
      for (const fn of ['stakersLength', 'numStakers', 'getStakersLength'] as const) {
        try {
          const v = await pc!.readContract({ address: VAULT, abi: treasuryDistributorAbi, functionName: fn });
          if (ok && typeof v === 'bigint') { setCount(v as bigint); return; }
        } catch { }
      }
      if (ok) setCount(null);
    })();
    return () => { ok = false; };
  }, [pc]);

  // Format token amounts for display
  const formatTokenAmount = (raw: bigint | undefined, decimals: number = 18): string => {
    if (!raw) return '0';
    const formatted = formatUnits(raw, decimals);
    return Number(formatted).toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // Helper function to ensure allowance
  const ensureAllowance = async (owner: `0x${string}`, spender: `0x${string}`, value: bigint) => {
    const cur = await pc!.readContract({ address: HONEY, abi: erc20Abi, functionName: 'allowance', args: [owner, spender] }) as bigint;
    if (cur >= value) return;
    const tx = await writeContractAsync({ address: HONEY, abi: erc20Abi, functionName: 'approve', args: [spender, value] });
    await pc!.waitForTransactionReceipt({ hash: tx as `0x${string}` });
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

  // Funding handler
  const onFund = async () => {
    try {
      setErr(null);
      setBusy(true);
      if (!address) throw new Error('Connect wallet');
      if (chainId && chainId !== CHAIN) throw new Error('Wrong network');
      if (count === null) throw new Error('Staker count unavailable yet');
      const value = parseUnits((amt || '0').trim(), dec);
      if (value <= BigInt(0)) throw new Error('Enter a positive amount');

      await ensureAllowance(address as `0x${string}`, VAULT, value);
      const hash = await writeContractAsync({
        address: VAULT, abi: treasuryDistributorAbi, functionName: 'fundRewardVault',
        args: [HONEY, value, count, BigInt(0)],
      });
      await pc!.waitForTransactionReceipt({ hash });
      setAmt('');
    } catch (e: unknown) {
      const error = e as { shortMessage?: string; message?: string };
      setErr(error?.shortMessage || error?.message || 'Funding failed');
    } finally {
      setBusy(false);
    }
  };

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

        {/* Info lines */}
        <div className="py-6 space-y-3">
          <p className="text-xs text-white/60">HS: HONEY — <span className="text-white/90">Balance: {showBal}</span></p>
          
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
          
          <p className="text-xs text-white/60">
            Based on data above you should bribe: <span className="text-white/90">
              {formatUnits(shouldBribeWei as bigint, dec)} HONEY
            </span>
          </p>
          {err && <p className="text-xs text-red-300">{err}</p>}
        </div>

        {/* Fund RV */}
        <section className="space-y-3 pt-2">
          <div className="text-sm font-medium">Fund RV</div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input 
              value={amt} 
              onChange={(e) => setAmt(e.target.value)} 
              placeholder="0.0" 
            />
            <Button className="md:w-28" onClick={onFund} disabled={busy || count === null}>
              {busy ? 'Funding…' : 'Fund'}
            </Button>
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
