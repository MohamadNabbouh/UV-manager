'use client';

import { Card } from '@/components/ui';
import UVRewards from '@/components/UVRewards';
import AdminOnly from '@/components/AdminOnly';
import Navbar from '@/components/Navbar';

export default function UVPremPage() {
  return (
    <AdminOnly>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 pb-16">

        <Card className="p-4 md:p-6">
          <UVRewards />
        </Card>
      </main>
    </AdminOnly>
  );
}
