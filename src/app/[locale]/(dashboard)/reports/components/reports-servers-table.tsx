'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import type { ServerReport } from '@/types/report';
import type { UserOrganization } from '@/types/auth';
import { useUpdateMember } from '@/hooks/use-members';
import { formatCurrency } from '@/utils/format';
import { downloadCsv } from './csv-export';
import { generateServerPayslipPdf } from './server-payslip-pdf';
import type { ReportsFilter } from './reports-filter-bar';

interface ReportsServersTableProps {
  organizationId: string;
  organizationName?: string;
  eventName?: string;
  filter: ReportsFilter;
  data: ServerReport[] | undefined;
  isLoading: boolean;
  /** userId -> membership, so an inline commission edit can resolve the membership id the PATCH endpoint needs. */
  membershipByUserId: Map<string, UserOrganization>;
}

function CommissionCell({ organizationId, server, membershipId }: { organizationId: string; server: ServerReport; membershipId: string | undefined }) {
  const t = useTranslations('reports');
  const updateMember = useUpdateMember(organizationId);
  const [value, setValue] = useState(server.commissionPercent.toFixed(1));
  const [saved, setSaved] = useState(false);

  if (!server.userId || !membershipId) {
    return <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>—</span>;
  }

  const commit = async () => {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100 || parsed === server.commissionPercent) {
      setValue(server.commissionPercent.toFixed(1));
      return;
    }
    try {
      await updateMember.mutateAsync({ userId: membershipId, commissionPercent: parsed });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setValue(server.commissionPercent.toFixed(1));
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={100}
        step={0.5}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="input"
        style={{ width: 64, fontSize: 12, padding: '4px 6px', textAlign: 'right' }}
        aria-label={t('servers.columns.commissionPercent')}
      />
      <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>%</span>
      {saved && <span style={{ fontSize: 11, color: 'var(--green-ink)' }}>✓</span>}
    </div>
  );
}

export function ReportsServersTable({
  organizationId,
  organizationName,
  eventName,
  filter,
  data,
  isLoading,
  membershipByUserId,
}: ReportsServersTableProps) {
  const t = useTranslations('reports');
  const [exportingId, setExportingId] = useState<string | null>(null);

  const handleCsvExport = () => {
    if (!data?.length) return;
    const headers = [
      t('servers.columns.server'),
      t('servers.columns.orders'),
      t('servers.columns.totalSold'),
      t('servers.columns.cash'),
      t('servers.columns.card'),
      t('servers.columns.commissionPercent'),
      t('servers.columns.commissionEarned'),
    ];
    const rows = data.map((s) => [
      s.name,
      s.ordersCount,
      s.totalSold,
      s.cashTotal,
      s.cardTotal,
      s.commissionPercent,
      s.commissionEarned,
    ]);
    downloadCsv('abrechnung-mitarbeiter.csv', headers, rows);
  };

  const handlePrint = async (server: ServerReport) => {
    const key = server.userId ?? 'hauptkasse';
    setExportingId(key);
    try {
      await generateServerPayslipPdf({ organizationName, eventName, filter, server });
    } catch (error) {
      console.error('Server payslip export failed', error);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="app-card app-card--flat">
      <div className="app-card__head">
        <div>
          <h2 className="app-card__title">{t('servers.title')}</h2>
          <p className="app-card__sub">{t('servers.subtitle')}</p>
        </div>
        <button
          type="button"
          className="btn btn--ghost"
          style={{ fontSize: 13 }}
          onClick={handleCsvExport}
          disabled={!data?.length}
        >
          {t('export.csv')}
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
          <div style={{ color: 'var(--ink)', opacity: 0.5 }}>{t('loading')}</div>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="empty-state">
          <h3 className="empty-state__title">{t('servers.empty')}</h3>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('servers.columns.server')}</th>
                <th className="text-right">{t('servers.columns.orders')}</th>
                <th className="text-right">{t('servers.columns.totalSold')}</th>
                <th className="text-right">{t('servers.columns.cash')}</th>
                <th className="text-right">{t('servers.columns.card')}</th>
                <th className="text-right">{t('servers.columns.commissionPercent')}</th>
                <th className="text-right">{t('servers.columns.commissionEarned')}</th>
                <th className="text-right">{t('servers.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((server) => {
                const membership = server.userId ? membershipByUserId.get(server.userId) : undefined;
                const isMainRegister = !server.userId;
                return (
                  <tr key={server.userId ?? 'hauptkasse'}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{server.name}</span>
                        {isMainRegister && (
                          <span className="badge badge--neutral" style={{ fontSize: 10 }}>{t('servers.mainRegister')}</span>
                        )}
                        {!isMainRegister && server.role === 'admin' && (
                          <span className="badge badge--info" style={{ fontSize: 10 }}>{t('servers.admin')}</span>
                        )}
                      </div>
                    </td>
                    <td className="mono text-right">{server.ordersCount}</td>
                    <td className="mono text-right">{formatCurrency(server.totalSold)}</td>
                    <td className="mono text-right">{formatCurrency(server.cashTotal)}</td>
                    <td className="mono text-right">{formatCurrency(server.cardTotal)}</td>
                    <td>
                      <CommissionCell organizationId={organizationId} server={server} membershipId={membership?.id} />
                    </td>
                    <td className="mono text-right">{formatCurrency(server.commissionEarned)}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => handlePrint(server)}
                        disabled={exportingId === (server.userId ?? 'hauptkasse')}
                      >
                        {exportingId === (server.userId ?? 'hauptkasse') ? t('export.pdfPending') : t('servers.printPayslip')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
