import type { Metadata } from 'next';

import { ReceiptView } from './receipt-view';

export const metadata: Metadata = {
  title: 'Beleg',
};

interface ReceiptPageProps {
  params: Promise<{ token: string }>;
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { token } = await params;

  return <ReceiptView token={token} />;
}

