export type DexPairResponse = {
  pairs?: Array<{ priceUsd?: string }>;
};

export async function getWberaPriceUsd(): Promise<number | null> {
  const pair = process.env.NEXT_PUBLIC_WBERA_DEXSCREENER_PAIR_80094 ||
               "0x1127f801cb3ab7bdf8923272949aa7dba94b5805";
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/pairs/berachain/${pair}`);
    const json = (await res.json()) as DexPairResponse;
    const price = json?.pairs?.[0]?.priceUsd;
    const n = Number(price);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
