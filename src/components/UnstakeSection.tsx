'use client';

import { Card, Button, Input } from '@/components/ui';
import { useUnstake } from '@/hooks/useUnstake';

const EXPLORER = (process.env.NEXT_PUBLIC_MAINNET_EXPLORER ||
  'https://berascan.com') as string;

type Props = {
  staking?: `0x${string}`;
  decimals?: number; // if your staked token ≠ 18, pass it in
};

export default function UnstakeSection(props: Props) {
  const {
    amount, setAmount, maxLoss, setMaxLoss, unstake, unstakeAll, canSubmit,
    isSubmitting, txHash, error, staking,
  } = useUnstake({ staking: props.staking, decimals: props.decimals });

  return (
    <Card className="p-4 gap-4 flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Unstake</h3>
        <div className="text-xs opacity-70">Contract: {staking}</div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
          <Input
            placeholder="Max Loss (basis points)"
            value={maxLoss}
            onChange={(e) => setMaxLoss(e.target.value)}
            inputMode="numeric"
            className="w-40"
          />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={unstake} disabled={!canSubmit} isLoading={isSubmitting}>
            Unstake
          </Button>
          <Button 
            onClick={unstakeAll} 
            disabled={!canSubmit || isSubmitting} 
            isLoading={isSubmitting}
            className="bg-red-600 hover:bg-red-500"
          >
            Unstake All
          </Button>
        </div>
      </div>

      {txHash && (
        <div className="text-sm">
          Tx:&nbsp;
          <a
            className="underline"
            href={`${EXPLORER}/tx/${txHash}`}
            target="_blank" rel="noreferrer"
          >
            View on Explorer
          </a>
        </div>
      )}

      {error && <div className="text-sm text-red-500">{error}</div>}
    </Card>
  );
}
