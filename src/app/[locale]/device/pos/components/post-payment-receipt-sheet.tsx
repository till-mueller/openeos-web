'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Mail01, Monitor01, QrCode01, Printer, Check, X } from '@untitledui/icons';
import { deviceApi } from '@/lib/api-client';

interface PostPaymentReceiptSheetProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId: string | null;
  orderId: string | null;
}

type Mode = 'menu' | 'email' | 'qr';

/**
 * Shown right after a payment completes -- the customer wants SOME form of
 * receipt (or none); this offers all four without forcing a specific one.
 * "Display" opens the same PDF the customer would get, just on the POS's
 * own screen for the cashier to hand over/show. "QR" is for the customer's
 * OWN phone: a short-lived, unauthenticated link (see PaymentsService.
 * getReceiptLink on the API) that needs no login on their end at all.
 */
export function PostPaymentReceiptSheet({ isOpen, onClose, paymentId, orderId }: PostPaymentReceiptSheetProps) {
  const t = useTranslations('pos.receiptSheet');
  const [mode, setMode] = useState<Mode>('menu');
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode('menu');
      setEmail('');
      setEmailSent(false);
      setError(null);
      setIsClosing(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    window.setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const displayReceipt = useMutation({
    mutationFn: async () => {
      if (!paymentId) throw new Error('no payment');
      const blob = await deviceApi.getReceiptPdf(paymentId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    },
    onError: () => setError(t('displayFailed')),
  });

  const emailReceipt = useMutation({
    mutationFn: async () => {
      if (!paymentId) throw new Error('no payment');
      const response = await deviceApi.emailReceipt(paymentId, email);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.ok) {
        setEmailSent(true);
        setError(null);
      } else {
        setError(data.message || t('emailFailed'));
      }
    },
    onError: () => setError(t('emailFailed')),
  });

  const printReceipt = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error('no order');
      await deviceApi.reprintOrder(orderId, 'receipt');
    },
    onError: () => setError(t('printFailed')),
  });

  const receiptLink = useMutation({
    mutationFn: async () => {
      if (!paymentId) throw new Error('no payment');
      const response = await deviceApi.getReceiptLink(paymentId);
      return response.data;
    },
    onError: () => setError(t('qrFailed')),
  });

  const openQr = () => {
    setError(null);
    setMode('qr');
    receiptLink.mutate();
  };

  if (!isOpen) return null;

  const actionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '18px 8px',
    background: 'var(--pos-surface)',
    border: '1px solid var(--pos-line)',
    borderRadius: 'var(--pos-r-md)',
    cursor: 'pointer',
    color: 'var(--pos-ink)',
    fontSize: 13,
    fontWeight: 600,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(20,18,12,.45)',
          opacity: isClosing ? 0 : 1,
          transition: 'opacity .2s ease',
        }}
      />
      <div
        className="pos-sheet"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '85%',
          background: 'var(--pos-surface)',
          borderTopLeftRadius: 'var(--pos-r-lg)',
          borderTopRightRadius: 'var(--pos-r-lg)',
          boxShadow: 'var(--pos-sh-3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: isClosing ? 'translateY(100%)' : undefined,
          transition: 'transform .22s ease',
          animation: isClosing ? undefined : 'pos-slide-up-sheet .22s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 28, flexShrink: 0 }}>
          <div style={{ width: 48, height: 5, background: 'var(--pos-line-strong)', borderRadius: 999 }} />
        </div>

        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 18px 14px', borderBottom: '1px solid var(--pos-line)', flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 999, background: 'var(--pos-accent-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Check style={{ width: 18, height: 18, color: 'var(--pos-accent)' }} />
            </div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--pos-ink)' }}>
              {t('title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Schließen"
            style={{
              width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', background: 'transparent', color: 'var(--pos-ink-3)', borderRadius: 'var(--pos-r-sm)', cursor: 'pointer',
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div className="pos-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div
              role="alert"
              style={{
                padding: '10px 12px', borderRadius: 'var(--pos-r-md)',
                background: 'color-mix(in oklab, var(--pos-error, #dc2626) 12%, transparent)',
                border: '1px solid var(--pos-error, #dc2626)', color: 'var(--pos-error, #dc2626)',
                fontSize: 13, fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {mode === 'menu' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <button type="button" style={actionStyle} onClick={() => displayReceipt.mutate()} disabled={displayReceipt.isPending}>
                <Monitor01 style={{ width: 22, height: 22 }} />
                {displayReceipt.isPending ? '…' : t('display')}
              </button>
              <button type="button" style={actionStyle} onClick={() => { setError(null); setMode('email'); }}>
                <Mail01 style={{ width: 22, height: 22 }} />
                {t('email')}
              </button>
              <button type="button" style={actionStyle} onClick={openQr}>
                <QrCode01 style={{ width: 22, height: 22 }} />
                {t('qr')}
              </button>
              <button type="button" style={actionStyle} onClick={() => printReceipt.mutate()} disabled={printReceipt.isPending}>
                <Printer style={{ width: 22, height: 22 }} />
                {printReceipt.isPending ? '…' : t('print')}
              </button>
            </div>
          )}

          {mode === 'email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {emailSent ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--pos-ok)', fontSize: 14, fontWeight: 600 }}>
                  {t('emailSent', { email })}
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    autoFocus
                    style={{
                      width: '100%', padding: '12px 14px', fontSize: 15,
                      border: '1px solid var(--pos-line)', borderRadius: 'var(--pos-r-md)',
                      background: 'var(--pos-surface-2)', color: 'var(--pos-ink)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => emailReceipt.mutate()}
                    disabled={!email || emailReceipt.isPending}
                    style={{
                      width: '100%', padding: '13px', fontSize: 15, fontWeight: 700,
                      background: email ? 'var(--pos-accent)' : 'var(--pos-line-strong)',
                      color: email ? 'var(--pos-accent-contrast)' : 'var(--pos-ink-2)',
                      border: 'none', borderRadius: 'var(--pos-r-md)',
                      cursor: email ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {emailReceipt.isPending ? '…' : t('send')}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => { setMode('menu'); setError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--pos-ink-3)', fontSize: 13, cursor: 'pointer', padding: 4 }}
              >
                {t('back')}
              </button>
            </div>
          )}

          {mode === 'qr' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {receiptLink.isPending && (
                <div style={{ padding: '30px 0', fontSize: 13, color: 'var(--pos-ink-3)' }}>{t('qrLoading')}</div>
              )}
              {receiptLink.data && (
                <>
                  <div style={{ padding: 14, background: '#fff', borderRadius: 'var(--pos-r-md)', border: '1px solid var(--pos-line)' }}>
                    <QRCodeSVG value={receiptLink.data.url} size={176} />
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--pos-ink-3)', textAlign: 'center', margin: 0 }}>
                    {t('qrHint')}
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={() => { setMode('menu'); setError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--pos-ink-3)', fontSize: 13, cursor: 'pointer', padding: 4 }}
              >
                {t('back')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
