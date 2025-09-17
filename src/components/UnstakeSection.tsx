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
    amount, setAmount, maxLoss, setMaxLoss, unstake, unstakeAll, canSubmit, canSubmitUnstakeAll,
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
            placeholder="Amount (e.g., 0.1)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
          <Input
            placeholder="Max Loss BP (e.g., 100 = 1%)"
            value={maxLoss}
            onChange={(e) => setMaxLoss(e.target.value)}
            inputMode="numeric"
            className="w-40"
          />
        </div>
        
        <div className="text-xs text-muted-foreground opacity-70">
          <p><strong>What to enter:</strong> Amount in token units (decimals handled automatically) + Max loss in basis points (100 = 1%)</p>        </div>
        
        <div className="flex gap-2">
          <Button onClick={unstake} disabled={!canSubmit} isLoading={isSubmitting}>
            Unstake
          </Button>
          <Button 
            onClick={unstakeAll} 
            disabled={!canSubmitUnstakeAll || isSubmitting} 
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

      {error && (
        <div className="space-y-2">
          <div className="text-sm text-red-500">{error}</div>
          {error.includes('0x6e6c2928') && (
            <div className="text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded">
              💡 This error might indicate insufficient staked balance or minimum amount requirements. 
              Try a smaller amount or check your staked balance.
            </div>
          )}
          {error.includes('Contract error') && (
            <div className="text-xs text-blue-400 bg-blue-900/20 p-2 rounded">
              💡 Try different amounts: 0.01, 0.001, or use &quot;Unstake All&quot; if you have any staked tokens.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
