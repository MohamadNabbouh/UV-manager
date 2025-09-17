'use client';

import { Button, Input } from '@/components/ui';
import { formatUnits } from 'viem';
import { useQueueDropBoost } from '@/hooks/useQueueDropBoost';

export default function QueueDropBoostCard() {
  const {
    pubkey, setPubkey,
    amount, setAmount,
    decimals,
    boosted,
    validPubkey,
    isSubmitting,
    error,
    txHash,
    queueDropBoost,
  } = useQueueDropBoost();

  const boostedFmt = (() => {
    try { return formatUnits(boosted, decimals ?? 18); } catch { return '0'; }
  })();

  return (
    <section className="border-b border-white/10">
      <div className="flex items-center justify-between py-6">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Queue Drop Boost</div>
          <div className="text-sm">BGT Balance: {boostedFmt} BGT</div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={pubkey}
            onChange={(e) => setPubkey(e.target.value as `0x${string}`)}
            placeholder="0x… (validator pubkey)"
            className="w-64"
          />
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (BGT)"
            className="w-32"
          />
          <Button
            onClick={queueDropBoost}
            isLoading={isSubmitting}
            disabled={!validPubkey || !amount || isSubmitting}
          >
            Queue Drop
          </Button>
        </div>
      </div>

      {!validPubkey && pubkey !== '0x' && (
        <div className="text-xs text-red-500 mb-2">
          Pubkey must be 48 bytes (0x + 96 hex chars).
        </div>
      )}

      {txHash && (
        <div className="text-xs">
          <a
            href={`${process.env.NEXT_PUBLIC_MAINNET_EXPLORER}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            View transaction
          </a>
        </div>
      )}
      {error && <div className="text-xs text-red-500">{error}</div>}
    </section>
  );
}
