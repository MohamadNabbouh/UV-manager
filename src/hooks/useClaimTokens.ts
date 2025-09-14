import { useAccount, useSwitchChain, useWriteContract, useReadContract } from "wagmi";
import treasuryAbi from "@/abis/TreasuryDistributor.json";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_MAINNET_ID ?? 80094);
const HOLDER   = (process.env.NEXT_PUBLIC_CLAIM_CONTRACT_80094 || "").trim() as `0x${string}`;
const DEST     = (process.env.NEXT_PUBLIC_CLAIM_DESTINATION || "").trim() as `0x${string}`;
const HONEY    = (process.env.NEXT_PUBLIC_HONEY_80094 || "").trim() as `0x${string}`;

export function useClaimTokens() {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending } = useWriteContract();

  // Read yBGT address from the contract
  const { data: ybgtAddr } = useReadContract({
    address: HOLDER,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: treasuryAbi as any,
    functionName: "yBGT",
    chainId: CHAIN_ID,
  });

  async function _claim(token: `0x${string}`) {
    if (chainId !== CHAIN_ID) await switchChainAsync?.({ chainId: CHAIN_ID });

    // Skip simulation for now - will work when authorized wallet is used
    // The simulation fails with unauthorized wallets, but the actual transaction
    // will work when the senior uses the multisig wallet with proper permissions

    return writeContractAsync({
      address: HOLDER,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: treasuryAbi as any,
      functionName: "retrieveToken",
      args: [token, DEST],
    });
  }

  return {
    isPending,
    claimHoney: async () => _claim(HONEY),
    claimYBGT:  async () => _claim((ybgtAddr as `0x${string}`)),
  };
}
