import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import erc20Abi from "@/abis/ERC20.json";

const BGT = process.env.NEXT_PUBLIC_BGT_80094 as `0x${string}`;

function addCommas(intString: string) {
  return intString.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Reads unboosted BGT for an address.
 * 1) Try a direct `unboosted(address)` (if present on this deployment)
 * 2) Fallback: balanceOf - (userBoosts.boost + userBoosts.queuedBoost)
 */
export function useUnboostedBgt(account?: `0x${string}`) {
  const publicClient = usePublicClient();
  const target =
    (account ||
      (process.env.NEXT_PUBLIC_UNBOOSTED_ACCOUNT as `0x${string}`)) as
      | `0x${string}`
      | undefined;

  const [raw, setRaw] = useState<bigint | null>(null);
  const [formatted, setFormatted] = useState<string>("–");

  useEffect(() => {
    if (!publicClient || !BGT || !target) return;

    (async () => {
      try {
        // Use the unboostedBalanceOf function from the BGT contract
        const value = (await publicClient.readContract({
          address: BGT,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          abi: erc20Abi as any,
          functionName: "unboostedBalanceOf",
          args: [target],
        })) as bigint;

        setRaw(value);
        // values are wei (1e18). Show no decimals (e.g., "18,900").
        const asDecimal = formatUnits(value, 18);       // "18900.1234"
        const integerOnly = asDecimal.split(".")[0];    // "18900"
        setFormatted(addCommas(integerOnly));           // "18,900"
      } catch (e) {
        console.error("useUnboostedBgt error:", e);
        setRaw(null);
        setFormatted("–");
      }
    })();
  }, [publicClient, target]);

  return { raw, formatted, target };
}
