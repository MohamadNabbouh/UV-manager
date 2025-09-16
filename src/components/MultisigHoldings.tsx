'use client';

import { Card } from '@/components/ui';
import { useMultisigHoldings } from '@/hooks/useMultisigHoldings';

export default function MultisigHoldings() {
  const { loading, error, balances, totalUsd } = useMultisigHoldings();

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
        {balances.map((b) => (
          <div key={b.token.address} className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{b.token.symbol}</span>
              <span className="text-[11px] opacity-70 break-all">{b.token.address}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono">{Number(b.amount).toLocaleString()}</div>
              {b.usd !== undefined && (
                <div className="text-[11px] opacity-70">≈ ${b.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
