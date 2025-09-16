"use client";
import { useEffect, useMemo, useState } from "react";
import { Row, Button, Input } from "@/components/ui";
import { useRedeemYbgt } from "@/hooks/useRedeemYbgt";
import { getWberaPriceUsd } from "@/lib/pricing";

export default function RedeemYbgt() {
  const { input, setInput, expectedWberaOut, redeem, isPending } = useRedeemYbgt();
  const [wberaUsd, setWberaUsd] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Format large numbers to avoid scientific notation
  const formatLargeNumber = (num: number): string => {
    if (num === 0) return "0.000000";
    if (num < 0.000001) return num.toExponential(6);
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(6);
    if (num < 1000000) return num.toFixed(2);
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const usdEstimate = useMemo(() => {
    if (!wberaUsd) return null;
    return expectedWberaOut * wberaUsd;
  }, [expectedWberaOut, wberaUsd]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const p = await getWberaPriceUsd();
      if (mounted) setWberaUsd(p);
    })();
    const id = setInterval(async () => {
      const p = await getWberaPriceUsd();
      if (mounted) setWberaUsd(p);
    }, 30_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const onRedeem = async () => {
    try {
      setErr(null);
      await redeem(); // default 0.50% slippage
      setInput("");
    } catch (e: unknown) {
      const error = e as { shortMessage?: string; message?: string };
      setErr(error?.shortMessage || error?.message || "Redeem failed");
    }
  };

  return (
    <section className="border-b border-white/10">
      <Row>
        <div className="text-sm md:text-base">
          <div className="font-medium">Redeem yBGT → BERA</div>
          <div className="text-xs text-white/70">1 yBGT = {Number(process.env.NEXT_PUBLIC_YBGT_TO_WBERA_RATIO_BPS ?? 9000) / 10000} wBERA</div>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Amount yBGT"
            type="number"
            min="0"
            step="1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-40 flex-shrink-0"
          />
          <div className="text-right leading-tight pr-2 w-48 flex-shrink-0">
            <div className="text-sm md:text-base truncate">
              {formatLargeNumber(expectedWberaOut)} wBERA
            </div>
            <div className="text-xs text-white/70 truncate">
              ≈ {usdEstimate ? `$${formatLargeNumber(usdEstimate)}` : "—"}
            </div>
          </div>
          <Button onClick={onRedeem} isLoading={isPending} className="flex-shrink-0">Redeem</Button>
        </div>
      </Row>
      {err && <div className="text-xs text-red-400 mt-2">{err}</div>}
    </section>
  );
}
