import { isAddress, getAddress } from 'viem';

const raw = (process.env.NEXT_PUBLIC_ADMIN_ADDRESSES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Normalize to checksummed lowercase for reliable comparison
const normalized = raw
  .filter((a) => isAddress(a))
  .map((a) => getAddress(a).toLowerCase());

export const ADMIN_SET = new Set(normalized);

export function isAdminAddress(addr?: string | null) {
  if (!addr) return false;
  try {
    const checksum = getAddress(addr);
    return ADMIN_SET.has(checksum.toLowerCase());
  } catch {
    return false;
  }
}
