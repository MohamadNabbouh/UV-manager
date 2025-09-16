'use client';
import { useEffect, useMemo, useState } from 'react';
import { Address, formatUnits } from 'viem';
import { usePublicClient } from 'wagmi';
import erc20Abi from '@/abis/ERC20.json';

type PricingHint = 'usd-pegged' | 'bera' | undefined;

type TokenMeta = {
  address: Address;
  symbol?: string;
  name?: string;
  decimals?: number;
  logoURI?: string;
  pricingHint?: PricingHint;
  priceUsd?: number; // optional hardcoded price
};

type TokenBalance = {
  token: Required<Omit<TokenMeta, 'priceUsd' | 'pricingHint' | 'logoURI'>> & {
    logoURI?: string;
    pricingHint?: PricingHint;
  };
  raw: bigint;
  amount: string;
  usd?: number;
};

const DEST = (process.env.NEXT_PUBLIC_CLAIM_DESTINATION || '').trim() as Address;
const DEXSCREENER_PAIR = (process.env.NEXT_PUBLIC_WBERA_DEXSCREENER_PAIR_80094 || '').trim();
const HONEY = (process.env.NEXT_PUBLIC_HONEY_80094 || '').trim() as Address;
const YBGT  = (process.env.NEXT_PUBLIC_YBGT_80094 || '').trim() as Address;

/** Try to learn WBERA address + price from Dexscreener pair (public, no key) */
async function loadWberaFromDexscreener(pair: string): Promise<{ address?: Address; priceUsd?: number }>{
  if (!pair) return {};
  try {
    // Dexscreener URL shape for most EVM chains: /latest/dex/pairs/<chain>/<pairAddress>
    const res = await fetch(`https://api.dexscreener.com/latest/dex/pairs/bera/${pair}`, { cache: 'no-store' });
    const json = await res.json();
    const pairData = json?.pairs?.[0];
    if (!pairData) return {};

    const t0 = pairData.baseToken || pairData.token0 || {};
    const t1 = pairData.quoteToken || pairData.token1 || {};
    const priceUsd = Number(pairData.priceUsd || pairData.priceUsd?.toString?.());

    const pick = (t0.symbol?.toUpperCase?.() === 'WBERA') ? t0 : (t1.symbol?.toUpperCase?.() === 'WBERA') ? t1 : null;
    const address = pick?.address as Address | undefined;
    return { address, priceUsd: isFinite(priceUsd) ? priceUsd : undefined };
  } catch {
    return {};
  }
}

export function useMultisigHoldings() {
  const publicClient = usePublicClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<TokenBalance[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!publicClient || !DEST) { setLoading(false); return; }
      setLoading(true); setError(null);

      try {
        // Build initial list from known envs
        const list: TokenMeta[] = [];
        if (HONEY) list.push({ address: HONEY, symbol: 'HONEY', name: 'Honey', decimals: 18 });
        if (YBGT)  list.push({ address: YBGT,  symbol: 'yBGT',  name: 'Yield BGT', decimals: 18 });

        // Try to auto-add WBERA from Dexscreener pair
        const { address: wberaAddr, priceUsd: wberaUsd } = await loadWberaFromDexscreener(DEXSCREENER_PAIR);
        if (wberaAddr) list.push({ address: wberaAddr, symbol: 'WBERA', name: 'Wrapped BERA', decimals: 18, pricingHint: 'bera', priceUsd: wberaUsd });

        // (Optional) If you know USDC.e address, add it here with usd-pegged:
        // list.push({ address: '0x...USDCe' as Address, symbol: 'USDC.e', name: 'Bridged USDC', decimals: 6, pricingHint: 'usd-pegged' });

        // Fetch token data individually (Berachain doesn't support multicall3)
        const enriched = await Promise.all(
          list.map(async (token) => {
            try {
              const enrichedToken = { ...token } as Required<TokenMeta> & { __raw?: bigint };

              // Get balance
              const balance = await publicClient.readContract({
                address: token.address,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [DEST],
              });
              enrichedToken.__raw = balance as bigint;

              // Get decimals if not provided
              if (token.decimals === undefined) {
                try {
                  const decimals = await publicClient.readContract({
                    address: token.address,
                    abi: erc20Abi,
                    functionName: 'decimals',
                  });
                  enrichedToken.decimals = Number(decimals);
                } catch {
                  enrichedToken.decimals = 18; // fallback
                }
              }

              // Get symbol if not provided
              if (token.symbol === undefined) {
                try {
                  const symbol = await publicClient.readContract({
                    address: token.address,
                    abi: erc20Abi,
                    functionName: 'symbol',
                  });
                  enrichedToken.symbol = String(symbol);
                } catch {
                  enrichedToken.symbol = 'UNKNOWN';
                }
              }

              // Get name if not provided
              if (token.name === undefined) {
                try {
                  const name = await publicClient.readContract({
                    address: token.address,
                    abi: erc20Abi,
                    functionName: 'name',
                  });
                  enrichedToken.name = String(name);
                } catch {
                  enrichedToken.name = 'Unknown Token';
                }
              }

              return enrichedToken;
            } catch (error) {
              console.warn(`Failed to fetch data for token ${token.address}:`, error);
              // Return token with zero balance if fetch fails
              return {
                ...token,
                decimals: token.decimals || 18,
                symbol: token.symbol || 'UNKNOWN',
                name: token.name || 'Unknown Token',
                __raw: BigInt(0),
              } as Required<TokenMeta> & { __raw?: bigint };
            }
          })
        );

        const withBalances: TokenBalance[] = enriched.map(t => {
          const raw = t.__raw || BigInt(0);
          const amount = formatUnits(raw, t.decimals);
          // simple pricing: explicit price, usd-pegged, or wbera
          let usd: number | undefined;
          if (t.priceUsd !== undefined) usd = Number(amount) * Number(t.priceUsd);
          else if (t.pricingHint === 'usd-pegged') usd = Number(amount) * 1;
          return {
            token: { address: t.address, symbol: t.symbol, name: t.name, decimals: t.decimals, logoURI: t.logoURI, pricingHint: t.pricingHint },
            raw,
            amount,
            usd,
          };
        }).filter(x => x.raw > BigInt(0));

        // Sort by usd desc if available, else by amount
        withBalances.sort((a, b) => {
          const au = a.usd ?? -1; const bu = b.usd ?? -1;
          if (au !== bu) return bu - au;
          const ad = Number(a.amount); const bd = Number(b.amount);
          return bd - ad;
        });

        if (!cancelled) setBalances(withBalances);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load balances');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [publicClient]);

  const totalUsd = useMemo(() => balances.reduce((s, b) => s + (b.usd ?? 0), 0), [balances]);

  return { loading, error, balances, totalUsd };
}
