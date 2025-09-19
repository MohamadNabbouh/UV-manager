'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui';
import { useMultisigHoldings } from '@/hooks/useMultisigHoldings';
import { getWberaPriceUsd } from '@/lib/pricing';

export default function MultisigHoldings() {
  const { loading, error, balances, totalUsd } = useMultisigHoldings();
  const [wberaUsd, setWberaUsd] = useState<number | null>(null);

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

  return (
    <Card className="w-full p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Multisig Holdings</h3>
        {Number.isFinite(totalUsd) && totalUsd > 0 ? (
          <div className="text-xs opacity-70">≈ ${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        ) : null}
      </div>

      {loading && <div className="text-xs opacity-70">Loading balances…</div>}
      {error && <div className="text-xs text-red-500">Error: {error}</div>}
      {!loading && !error && balances.length === 0 && (
        <div className="text-xs opacity-70">No token balances found.</div>
      )}

      <div className="space-y-2">
        {balances.map((b) => {
          // Calculate USD value - use live WBERA price for WBERA tokens
          let usdValue = b.usd;
          if (b.token.symbol?.toUpperCase() === 'WBERA' && wberaUsd !== null) {
            usdValue = Number(b.amount) * wberaUsd;
          }

          return (
            <div key={b.token.address} className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{b.token.symbol}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono">{Number(b.amount).toLocaleString()}</div>
                {usdValue !== undefined && (
                  <div className="text-[11px] opacity-70">≈ ${usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
