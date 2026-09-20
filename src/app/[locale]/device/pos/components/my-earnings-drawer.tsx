'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { deviceApi } from '@/lib/api-client';
import { formatCurrency } from '@/utils/format';
import { PlainModal } from '@/components/ui/modal/plain-modal';

interface MyEarningsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
  firstName: string;
  lastName: string;
}

function getTodayRange(): { startDate: string; endDate: string } {
  const today = new Date().toISOString().split('T')[0];
  return { startDate: today, endDate: `${today}T23:59:59` };
}

/**
 * "My earnings" — what the PIN-authenticated server themselves sold today,
 * split cash/card, plus their commission. Read-only self-service view so a
 * server can check their own numbers without dashboard/admin access.
 */
export function MyEarningsDrawer({ isOpen, onClose, userId, firstName, lastName }: MyEarningsDrawerProps) {
  const t = useTranslations('pos');

  const { data, isLoading, error } = useQuery({
    queryKey: ['device-server-earnings', userId],
    queryFn: () => deviceApi.getServerEarnings(userId!, getTodayRange()),
    enabled: isOpen && !!userId,
  });

  const earnings = data?.data;

  return (
    <PlainModal isOpen={isOpen} onClose={onClose} title={t('myEarnings.title')} size="sm" theme="pos">
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--pos-ink)' }}>{firstName} {lastName}</div>
          <div style={{ fontSize: 12, color: 'var(--pos-ink-3)' }}>{t('myEarnings.today')}</div>
        </div>

        {isLoading && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--pos-ink-3)', fontSize: 13 }}>
            {t('myEarnings.loading')}
          </div>
        )}

        {error && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--pos-danger)', fontSize: 13 }}>
            {t('myEarnings.error')}
          </div>
        )}

        {earnings && (
          <>
            <div
              style={{
                background: 'var(--pos-accent-soft)',
                borderRadius: 'var(--pos-r-md)',
                padding: '16px 18px',
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--pos-ink-2)', marginBottom: 4 }}>{t('myEarnings.totalSold')}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--pos-accent)' }}>{formatCurrency(earnings.totalSold)}</div>
              <div style={{ fontSize: 12, color: 'var(--pos-ink-2)', marginTop: 4 }}>
                {t('myEarnings.orders', { count: earnings.ordersCount })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, border: '1px solid var(--pos-line)', borderRadius: 'var(--pos-r-md)', padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--pos-ink-3)', marginBottom: 2 }}>{t('myEarnings.cash')}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--pos-ink)' }}>{formatCurrency(earnings.cashTotal)}</div>
              </div>
              <div style={{ flex: 1, border: '1px solid var(--pos-line)', borderRadius: 'var(--pos-r-md)', padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--pos-ink-3)', marginBottom: 2 }}>{t('myEarnings.card')}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--pos-ink)' }}>{formatCurrency(earnings.cardTotal)}</div>
              </div>
            </div>

            {earnings.commissionPercent > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--pos-line)',
                  borderRadius: 'var(--pos-r-md)',
                  padding: '12px 14px',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: 'var(--pos-ink-3)' }}>
                    {t('myEarnings.commission', { percent: earnings.commissionPercent.toFixed(1) })}
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--pos-ink)' }}>{formatCurrency(earnings.commissionEarned)}</div>
              </div>
            )}
          </>
        )}
      </div>
    </PlainModal>
  );
}
