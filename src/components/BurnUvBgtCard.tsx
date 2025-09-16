'use client';

import { Card, Button, Input } from '@/components/ui';
import { useUvBgtBurn } from '@/hooks/useUvBgtBurn';

export default function BurnUvBgtCard() {
  const { amount, setAmount, isBurning, burn, txHash, error, display } = useUvBgtBurn();

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between py-6">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">total uvBGT supply − uvBGT @ 0x0000…0000</div>
          <div className="text-lg font-mono">{display?.totalMinusZero ?? '—'}</div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (uvBGT)"
            className="w-40"
          />
          <Button onClick={burn} isLoading={isBurning} disabled={!amount || isBurning}>
            Burn uvBGT
          </Button>
        </div>
      </div>

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
    </Card>
  );
}
