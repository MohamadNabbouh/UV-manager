'use client';

import { Card } from '@/components/ui';
import PerformanceFees from '@/components/PerformanceFees';
import Navbar from '@/components/Navbar';
import AddRewards from '@/components/AddRewards';
import RedeemYbgt from '@/components/RedeemYbgt';
import InfoSection from '@/components/InfoSection';
import BurnUvBgtCard from '@/components/BurnUvBgtCard';
import { useClaimBalances } from '@/hooks/useClaimBalances';
import SetValidatorPubkeyCard from '@/components/SetValidatorPubkeyCard';
import UnstakeSection from '@/components/UnstakeSection';
import MultisigHoldings from '@/components/MultisigHoldings';
import QueueDropBoostCard from '@/components/QueueDropBoostCard';
import AdminOnly from '@/components/AdminOnly';

export default function Page() {
  const { error: balancesError } = useClaimBalances();

  return (
    <AdminOnly>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 pb-16">

        <Card className="p-4 md:p-6">
          {/* Error Display */}
          {balancesError && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-sm">
              Error loading balances: {balancesError.message}
            </div>
          )}
          
          <PerformanceFees />
          
          <div className="grid md:grid-cols-2 gap-4">
            <InfoSection />
            <MultisigHoldings />
          </div>
          
          <AddRewards />
          <UnstakeSection />
          <RedeemYbgt />
          <BurnUvBgtCard />
          <SetValidatorPubkeyCard />
          <QueueDropBoostCard />
        </Card>
      </main>
    </AdminOnly>
  );
}
