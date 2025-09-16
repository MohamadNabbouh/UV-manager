import { useState } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { isHex, hexToBytes } from 'viem';
import treasuryDistributorAbi from '@/abis/TreasuryDistributor.json';

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_MAINNET_ID || 80094);
const VALIDATOR = (process.env.NEXT_PUBLIC_VALIDATOR_CONTRACT_80094 || '').trim() as `0x${string}`;

export function useSetValidatorPubKey() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [pubkeys, setPubkeys] = useState<string[]>(['']);   // array of hex strings (0x…)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    try {
      setError(null);
      setTxHash(null);

      if (!VALIDATOR) throw new Error('Validator contract address missing in env.');
      
      // Filter out empty strings and validate
      const validPubkeys = pubkeys.filter(pk => pk.trim() !== '');
      if (validPubkeys.length === 0) throw new Error('Enter at least one validator public key (hex).');

      // Normalize and validate each public key
      const normalizedPubkeys = validPubkeys.map(pubkey => {
        const normalized = pubkey.startsWith('0x') ? pubkey : (`0x${pubkey}`);
        if (!isHex(normalized)) throw new Error(`Public key "${pubkey}" must be a valid hex string.`);
        
        // (optional) quick length hint: BLS compressed pubkey is 48 bytes -> 96 hex chars
        const hexLen = normalized.slice(2).length;
        if (hexLen !== 96) {
          console.warn(`Pubkey "${normalized}" hex length is ${hexLen}, expected 96 for a 48-byte BLS key.`);
        }
        
        return normalized;
      });

      setIsSubmitting(true);

      // Convert to bytes arrays
      const pubkeyHexes = normalizedPubkeys as `0x${string}`[];

      const hash = await writeContractAsync({
        address: VALIDATOR,
        abi: treasuryDistributorAbi,
        functionName: 'setValidatorPubkeys',
        args: [pubkeyHexes], // Array of bytes arrays
        chainId: CHAIN_ID,
      });

      setTxHash(hash);
      await publicClient?.waitForTransactionReceipt({ hash });
    } catch (e: unknown) {
      const error = e as { shortMessage?: string; message?: string };
      setError(error?.shortMessage || error?.message || 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper functions for managing pubkeys array
  const addPubkey = () => {
    setPubkeys([...pubkeys, '']);
  };

  const removePubkey = (index: number) => {
    if (pubkeys.length > 1) {
      setPubkeys(pubkeys.filter((_, i) => i !== index));
    }
  };

  const updatePubkey = (index: number, value: string) => {
    const newPubkeys = [...pubkeys];
    newPubkeys[index] = value;
    setPubkeys(newPubkeys);
  };

  return { 
    address, 
    pubkeys, 
    setPubkeys, 
    addPubkey, 
    removePubkey, 
    updatePubkey, 
    submit, 
    isSubmitting, 
    txHash, 
    error 
  };
}
