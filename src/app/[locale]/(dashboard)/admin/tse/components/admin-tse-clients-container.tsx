'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { ListLoading, ListError, ListEmpty } from '@/components/shared/list-states';

export function AdminTseClientsContainer() {
  const t = useTranslations('admin.tse');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-tse-clients'],
    queryFn: async () => {
      const response = await adminApi.getTseClients();
      return response.data || [];
    },
  });

  if (isLoading) return <ListLoading />;
  if (isError) return <ListError onRetry={() => refetch()} />;
  if (!data || data.length === 0) {
    return <ListEmpty title={t('empty.title')} description={t('empty.description')} />;
  }

  const totalClients = data.reduce((sum, row) => sum + row.clientCount, 0);

  return (
    <div className="app-card">
      <p style={{ fontSize: 13, color: 'color-mix(in oklab, var(--ink) 50%, transparent)', marginBottom: 16 }}>
        {t('totalClients', { count: totalClients })}
      </p>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 12px' }}>{t('columns.organization')}</th>
            <th style={{ textAlign: 'left', padding: '8px 12px' }}>{t('columns.provider')}</th>
            <th style={{ textAlign: 'left', padding: '8px 12px' }}>{t('columns.source')}</th>
            <th style={{ textAlign: 'left', padding: '8px 12px' }}>{t('columns.activatedAt')}</th>
            <th style={{ textAlign: 'right', padding: '8px 12px' }}>{t('columns.clients')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.organizationId} style={{ borderTop: '1px solid color-mix(in oklab, var(--ink) 6%, transparent)' }}>
              <td style={{ padding: '8px 12px' }}>{row.organizationName}</td>
              <td style={{ padding: '8px 12px' }}>{row.provider}</td>
              <td style={{ padding: '8px 12px' }}>
                <span className={row.reseller ? 'badge badge--info' : 'badge badge--neutral'}>
                  {row.reseller ? t('source.reseller') : t('source.ownAccount')}
                </span>
              </td>
              <td style={{ padding: '8px 12px' }}>
                {row.activatedAt ? new Date(row.activatedAt).toLocaleDateString() : '–'}
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.clientCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
