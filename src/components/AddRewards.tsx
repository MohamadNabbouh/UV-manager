"use client";
import { useState, useEffect } from "react";
import { Row, Button } from "@/components/ui";
import { useAccount, usePublicClient, useWriteContract, useReadContract } from "wagmi";
import { parseUnits } from "viem";
import erc20Abi from "@/abis/ERC20.json";
import treasuryDistributorAbi from "@/abis/TreasuryDistributor.json";

// Environment variables
const HONEY = process.env.NEXT_PUBLIC_HONEY_80094!.trim() as `0x${string}`;
const YBGT = process.env.NEXT_PUBLIC_YBGT_80094!.trim() as `0x${string}`;
const VAULT = process.env.NEXT_PUBLIC_UV_REWARD_VAULT_UVBGT_SWBERA_CONTRACT!.trim() as `0x${string}`;
const CHAIN = Number(process.env.NEXT_PUBLIC_MAINNET_ID || 80094);

export default function AddRewards() {
  const [rewardAmt, setRewardAmt] = useState<string>('0');
  const [rewardToken, setRewardToken] = useState<'HONEY' | 'YBGT'>('HONEY');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<bigint | null>(null);
  const [decimals, setDecimals] = useState(18);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wagmi hooks
  const { address, chainId } = useAccount();
  const pc = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // Hydration check
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Get token address based on selection
  const tokenAddress = rewardToken === 'HONEY' ? HONEY : YBGT;

  // Get token decimals
  const { data: tokenDecimals } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals'
  });

  useEffect(() => {
    if (typeof tokenDecimals === 'number') {
      setDecimals(tokenDecimals);
    }
  }, [tokenDecimals]);

  // Get staker count from vault
  useEffect(() => {
    let ok = true;
    (async () => {
      if (!pc) return;
      for (const fn of ['stakersLength', 'numStakers', 'getStakersLength'] as const) {
        try {
          const v = await pc.readContract({ 
            address: VAULT, 
            abi: treasuryDistributorAbi, 
            functionName: fn 
          });
          if (ok && typeof v === 'bigint') { 
            console.log('Staker count loaded:', v.toString());
            setCount(v as bigint); 
            return; 
          }
        } catch (e) {
          console.log(`Failed to call ${fn}:`, e);
        }
      }
      if (ok) {
        console.log('No staker count function found, using default value of 1');
        setCount(BigInt(1)); // Use default value instead of null
      }
    })();
    return () => { ok = false; };
  }, [pc]);

  // Helper function to ensure allowance
  const ensureAllowance = async (owner: `0x${string}`, spender: `0x${string}`, value: bigint) => {
    if (!pc) throw new Error("No public client");
    const cur = await pc.readContract({ 
      address: tokenAddress, 
      abi: erc20Abi, 
      functionName: 'allowance', 
      args: [owner, spender] 
    }) as bigint;
    if (cur >= value) return;
    const tx = await writeContractAsync({ 
      address: tokenAddress, 
      abi: erc20Abi, 
      functionName: 'approve', 
      args: [spender, value] 
    });
    await pc.waitForTransactionReceipt({ hash: tx as `0x${string}` });
  };

  async function addRewards() {
    try {
      setError(null);
      setBusy(true);
      
      if (!isHydrated) throw new Error('Please wait for page to load');
      if (!address) throw new Error('Connect wallet');
      if (chainId && chainId !== CHAIN) throw new Error('Wrong network');
      
      const value = parseUnits((rewardAmt || '0').trim(), decimals);
      if (value <= BigInt(0)) throw new Error('Enter a positive amount');

      // Ensure token allowance
      await ensureAllowance(address as `0x${string}`, VAULT, value);
      
      // Fund the reward vault
      const hash = await writeContractAsync({
        address: VAULT,
        abi: treasuryDistributorAbi,
        functionName: 'fundRewardVault',
        args: [tokenAddress, value, count, BigInt(0)],
      });
      
      if (!pc) throw new Error("No public client");
      await pc.waitForTransactionReceipt({ hash });
      
      setRewardAmt('0');
      console.log('Rewards added successfully', { rewardAmt, rewardToken });
    } catch (e: unknown) {
      const error = e as { shortMessage?: string; message?: string };
      setError(error?.shortMessage || error?.message || 'Adding rewards failed');
      console.error('Error adding rewards:', e);
    } finally {
      setBusy(false);
    }
  }

  return (
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
            onChange={(e) => setRewardToken(e.target.value as 'HONEY' | 'YBGT')}
            className="rounded-lg bg-purple-800/30 px-3 py-2 text-sm outline-none ring-1 ring-purple-400/30"
          >
            <option>HONEY</option>
            <option>YBGT</option>
          </select>
          <Button 
            onClick={addRewards} 
            disabled={busy || (isHydrated && !address)}
          >
            {busy ? 'Adding...' : 'Bribe'}
          </Button>
          <div className="hidden text-xs text-white/70 md:block">Signer : Multisig 1</div>
        </div>
      </Row>
      {error && (
        <Row>
          <div></div>
          <div className="text-xs text-red-300 mt-2">{error}</div>
        </Row>
      )}
    </section>
  );
}
