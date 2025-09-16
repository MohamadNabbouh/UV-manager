'use client';

import { Card, Button, Input } from '@/components/ui';
import { useSetValidatorPubKey } from '@/hooks/useSetValidatorPubKey';

export default function SetValidatorPubkeyCard() {
  const { pubkeys, addPubkey, removePubkey, updatePubkey, submit, isSubmitting, txHash, error } = useSetValidatorPubKey();

  return (
    <section className="border-b border-white/10">
      <div className="space-y-2">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Set Validator Public Keys</div>
          <div className="text-[11px] text-muted-foreground">
            Paste your BLS pubkeys (hex). Typically 48 bytes (96 hex chars).
          </div>
        </div>

        <div className="space-y-2">
          {pubkeys.map((pubkey, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={pubkey}
                onChange={(e) => updatePubkey(index, e.target.value.trim())}
                placeholder="0x… (validator pubkey)"
                className="flex-1"
              />
              {pubkeys.length > 1 && (
                <Button 
                  onClick={() => removePubkey(index)} 
                  className="px-2 text-red-400 hover:bg-red-400/10"
                >
                  ×
                </Button>
              )}
            </div>
          ))}
          
          <div className="flex items-center gap-2">
            <Button onClick={addPubkey} >
              + Add PubKey
            </Button>
            <Button 
              onClick={submit} 
              isLoading={isSubmitting} 
              disabled={pubkeys.every(pk => !pk.trim()) || isSubmitting}
            >
              Set PubKeys
            </Button>
          </div>
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
    </section>
  );
}
