'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download01, X, FileCheck02 } from '@untitledui/icons';
import { API_URL } from '@/lib/api-client';

interface ReceiptViewProps {
  token: string;
}

/**
 * Public, unauthenticated -- reached by scanning the QR code the POS shows
 * after a payment. The token itself (verified server-side, see
 * PaymentsService.getReceiptPdfByToken) is the only authorization; no
 * login, no device, nothing else is checked here.
 */
export function ReceiptView({ token }: ReceiptViewProps) {
  const t = useTranslations('receiptLink');
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const pdfUrl = `${API_URL}/public/receipts/${token}`;

  useEffect(() => {
    let cancelled = false;
    fetch(pdfUrl, { method: 'HEAD' })
      .then((res) => {
        if (!cancelled) setStatus(res.ok ? 'ok' : 'error');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  if (status === 'loading') {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-tertiary">{t('loading')}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-error-secondary">
          <X className="size-6 text-error-primary" />
        </div>
        <h1 className="text-lg font-semibold text-primary">{t('errorTitle')}</h1>
        <p className="text-sm text-tertiary">{t('errorMessage')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-brand-secondary">
          <FileCheck02 className="size-6 text-brand-primary" />
        </div>
        <h1 className="text-lg font-semibold text-primary">{t('title')}</h1>
        <p className="mt-1 text-sm text-tertiary">{t('subtitle')}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-secondary" style={{ height: 420 }}>
        <embed src={pdfUrl} type="application/pdf" className="h-full w-full" />
      </div>

      <a
        href={pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-solid px-4 py-2.5 text-sm font-semibold text-white shadow-xs-skeuomorphic hover:bg-brand-solid_hover"
      >
        <Download01 className="h-4 w-4" />
        {t('download')}
      </a>
    </div>
  );
}
