import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import erc20Abi from "@/abis/ERC20.json";
import treasuryAbi from "@/abis/TreasuryDistributor.json";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_MAINNET_ID ?? 80094);
const HOLDER   = (process.env.NEXT_PUBLIC_CLAIM_CONTRACT_80094 || "").trim() as `0x${string}`;
const HONEY    = (process.env.NEXT_PUBLIC_HONEY_80094 || "").trim() as `0x${string}`;

export function useClaimBalances() {
  const contracts = useMemo(() => ([
    // 1) Read yBGT token address from the contract
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { address: HOLDER, abi: treasuryAbi as any, functionName: "yBGT", chainId: CHAIN_ID },

    // 2) HONEY (decimals, symbol, balanceOf(HOLDER))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { address: HONEY,  abi: erc20Abi as any, functionName: "decimals"  as const, chainId: CHAIN_ID },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { address: HONEY,  abi: erc20Abi as any, functionName: "symbol"    as const, chainId: CHAIN_ID },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { address: HONEY,  abi: erc20Abi as any, functionName: "balanceOf" as const, args: [HOLDER], chainId: CHAIN_ID },
  ]), []);

  const { data, isLoading, refetch, error } = useReadContracts({ contracts });

  // Once yBGT address arrives, read its details in a second pass
  const ybgtAddr = (data?.[0]?.result ?? null) as `0x${string}` | null;

  const ybgtContracts = useMemo(() => {
    if (!ybgtAddr) return [];
    return [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { address: ybgtAddr, abi: erc20Abi as any, functionName: "decimals"  as const, chainId: CHAIN_ID },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { address: ybgtAddr, abi: erc20Abi as any, functionName: "symbol"    as const, chainId: CHAIN_ID },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { address: ybgtAddr, abi: erc20Abi as any, functionName: "balanceOf" as const, args: [HOLDER], chainId: CHAIN_ID },
    ];
  }, [ybgtAddr]);

  const { data: ybgtData, isLoading: ybgtLoading, refetch: refetchY, error: ybgtError } =
    useReadContracts({ contracts: ybgtContracts, query: { enabled: !!ybgtAddr } });

  const balances = useMemo(() => {
    const honey = data ? {
      decimals: Number(data?.[1]?.result ?? 18),
      symbol:   String(data?.[2]?.result ?? "HONEY"),
      raw:      BigInt(String(data?.[3]?.result || 0)),
    } : null;

    const y = ybgtData ? {
      decimals: Number(ybgtData?.[0]?.result ?? 18),
      symbol:   String(ybgtData?.[1]?.result ?? "yBGT"),
      raw:      BigInt(String(ybgtData?.[2]?.result || 0)),
      address:  ybgtAddr!,
    } : null;

    return { honey, ybgt: y };
  }, [data, ybgtData, ybgtAddr]);

  return {
    balances,
    isLoading: isLoading || ybgtLoading,
    error: error || ybgtError,
    refetchAll: async () => { await Promise.all([refetch(), refetchY()]); }
  };
}
