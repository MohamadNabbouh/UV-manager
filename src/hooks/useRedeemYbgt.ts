import { useMemo, useState } from "react";
import { useAccount, useSwitchChain, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import erc20Abi from "@/abis/ERC20.json";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_MAINNET_ID ?? 80094);
const YBGT = (process.env.NEXT_PUBLIC_YBGT_80094 || "").trim() as `0x${string}`;
const RATIO_BPS = Number(process.env.NEXT_PUBLIC_YBGT_TO_WBERA_RATIO_BPS ?? 9000); // 1 yBGT = 0.9 wBERA

// Two possible function signatures
const ABI_REDEEM_AMOUNT_ONLY = [
  { type: "function", name: "redeem", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
] as const;

const ABI_REDEEM_WITH_MINOUT = [
  { type: "function", name: "redeem", stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }, { name: "minOut", type: "uint256" }], outputs: [] },
] as const;

export function useRedeemYbgt() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending } = useWriteContract();
  const pc = usePublicClient();

  const { data: ybgtDecimalsData } = useReadContract({
    address: YBGT,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: erc20Abi as any,
    functionName: "decimals",
    chainId: CHAIN_ID,
    query: { enabled: !!YBGT },
  });

  const ybgtDecimals = Number(ybgtDecimalsData ?? 18);
  const [input, setInput] = useState<string>("");

  const parsed = useMemo(() => {
    try {
      const v = (input || "0").trim();
      if (!v || Number(v) <= 0) return { wei: BigInt(0), pretty: "0" };
      const wei = parseUnits(v, ybgtDecimals);
      return { wei, pretty: formatUnits(wei, ybgtDecimals) };
    } catch {
      return { wei: BigInt(0), pretty: "0" };
    }
  }, [input, ybgtDecimals]);

  const expectedWberaOut = useMemo(() => {
    const amt = Number(input || "0");
    if (!amt || amt <= 0) return 0;
    return amt * (RATIO_BPS / 10_000); // 0.9 by default
  }, [input]);

  const redeem = async (slippageBps = 50 /* 0.50% */) => {
    if (!address) throw new Error("Connect wallet");
    if (!YBGT) throw new Error("yBGT address missing");
    if (!parsed.wei || parsed.wei <= BigInt(0)) throw new Error("Enter a positive amount");
    if (chainId !== CHAIN_ID) await switchChainAsync({ chainId: CHAIN_ID });

    // minOut = amount * ratio * (1 - slippage)
    const minOutFloat =
      Number(formatUnits(parsed.wei, ybgtDecimals)) * (RATIO_BPS / 10_000) * (1 - slippageBps / 10_000);
    const minOutWei = parseUnits(minOutFloat.toFixed(18), 18); // wBERA assumes 18d

    // Prefer (amount, minOut); fallback to (amount)
    try {
      await pc!.simulateContract({
        address: YBGT,
        abi: ABI_REDEEM_WITH_MINOUT,
        functionName: "redeem",
        args: [parsed.wei, minOutWei],
        account: address,
      });
      const hash = await writeContractAsync({
        address: YBGT,
        abi: ABI_REDEEM_WITH_MINOUT,
        functionName: "redeem",
        args: [parsed.wei, minOutWei],
      });
      return hash;
    } catch {
      const hash = await writeContractAsync({
        address: YBGT,
        abi: ABI_REDEEM_AMOUNT_ONLY,
        functionName: "redeem",
        args: [parsed.wei],
      });
      return hash;
    }
  };

  return {
    input,
    setInput,
    ybgtDecimals,
    expectedWberaOut,
    redeem,
    isPending,
  };
}
