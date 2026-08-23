'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { organizationsApi, tseApi } from '@/lib/api-client';
import { toast } from '@/components/shared/toast';

type TseProvider = 'fiskaly' | 'local';

export function OrganizationTseSection() {
  const t = useTranslations('settings.organizationTse');
  const tCommon = useTranslations('common');
  const { currentOrganization, setCurrentOrganization } = useAuthStore();
  const queryClient = useQueryClient();

  const organizationId = currentOrganization?.organizationId;
  const tseSettings = currentOrganization?.organization?.settings?.tse;

  const [enabled, setEnabled] = useState(tseSettings?.enabled ?? false);
  const [provider, setProvider] = useState<TseProvider>(tseSettings?.provider === 'local' ? 'local' : 'fiskaly');
  const [apiKey, setApiKey] = useState(tseSettings?.fiskaly?.apiKey || '');
  const [apiSecret, setApiSecret] = useState(tseSettings?.fiskaly?.apiSecret || '');
  const [tssId, setTssId] = useState(tseSettings?.fiskaly?.tssId || '');
  const [agentDeviceId, setAgentDeviceId] = useState(tseSettings?.local?.agentDeviceId || '');

  // Export (handover) form state
  const [exportClientId, setExportClientId] = useState('');
  const [exportStart, setExportStart] = useState('');
  const [exportEnd, setExportEnd] = useState('');

  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!currentOrganization) throw new Error('No organization');

      const settingsUpdate: Record<string, unknown> = {
        ...currentOrganization.organization?.settings,
        tse: {
          enabled,
          provider,
          ...(provider === 'fiskaly' ? { fiskaly: { apiKey, apiSecret, tssId } } : {}),
          ...(provider === 'local' ? { local: { agentDeviceId } } : {}),
        },
      };

      const response = await organizationsApi.update(currentOrganization.organizationId, {
        settings: settingsUpdate as unknown as import('@/types/organization').OrganizationSettings,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (currentOrganization?.organization) {
        setCurrentOrganization({
          ...currentOrganization,
          organization: data,
        });
      }
      toast.success(t('success'));
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
    onError: () => {
      toast.error(t('saveFailed'));
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      if (!currentOrganization) throw new Error('No organization');
      const response = await tseApi.testConnection(currentOrganization.organizationId);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(t('testSuccess'));
      } else {
        toast.error(data.message || t('testFailed'));
      }
    },
    onError: () => {
      toast.error(t('testFailed'));
    },
  });

  const isConfigured = !!tseSettings?.enabled;

  const clientsQuery = useQuery({
    queryKey: ['tse-clients', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await tseApi.listClients(organizationId);
      return response.data || [];
    },
    enabled: !!organizationId && isConfigured,
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('No organization');
      if (!exportStart || !exportEnd) throw new Error('Missing date range');
      const blob = await tseApi.exportData(
        organizationId,
        new Date(exportStart).toISOString(),
        new Date(exportEnd).toISOString(),
        exportClientId || undefined
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tse-export-${exportClientId || organizationId}-${exportStart}.tar`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('export.failed'));
    },
  });

  if (!currentOrganization) {
    return null;
  }

  const hasChanges =
    enabled !== (tseSettings?.enabled ?? false) ||
    provider !== (tseSettings?.provider === 'local' ? 'local' : 'fiskaly') ||
    apiKey !== (tseSettings?.fiskaly?.apiKey || '') ||
    apiSecret !== (tseSettings?.fiskaly?.apiSecret || '') ||
    tssId !== (tseSettings?.fiskaly?.tssId || '') ||
    agentDeviceId !== (tseSettings?.local?.agentDeviceId || '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="app-card">
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t('title')}</h3>
          <p style={{ fontSize: 13, color: 'color-mix(in oklab, var(--ink) 50%, transparent)' }}>
            {t('description')}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            {t('enabled')}
          </label>

          <div className="auth-field">
            <label className="auth-field__label">{t('provider')}</label>
            <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="radio"
                  name="tseProvider"
                  checked={provider === 'fiskaly'}
                  onChange={() => setProvider('fiskaly')}
                />
                {t('providerFiskaly')}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="radio"
                  name="tseProvider"
                  checked={provider === 'local'}
                  onChange={() => setProvider('local')}
                />
                {t('providerLocal')}
              </label>
            </div>
          </div>

          {provider === 'fiskaly' ? (
            <div style={{ paddingTop: 12, borderTop: '1px solid color-mix(in oklab, var(--ink) 6%, transparent)' }}>
              <p style={{ fontSize: 13, color: 'color-mix(in oklab, var(--ink) 50%, transparent)', marginBottom: 12 }}>
                {t('fiskalyDescription')}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="auth-field">
                  <label className="auth-field__label" htmlFor="tseApiKey">{t('apiKey')}</label>
                  <input
                    id="tseApiKey"
                    type="password"
                    className="input"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={t('apiKeyPlaceholder')}
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-field__label" htmlFor="tseApiSecret">{t('apiSecret')}</label>
                  <input
                    id="tseApiSecret"
                    type="password"
                    className="input"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder={t('apiSecretPlaceholder')}
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-field__label" htmlFor="tseTssId">{t('tssId')}</label>
                  <input
                    id="tseTssId"
                    className="input"
                    value={tssId}
                    onChange={(e) => setTssId(e.target.value)}
                    placeholder={t('tssIdPlaceholder')}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ paddingTop: 12, borderTop: '1px solid color-mix(in oklab, var(--ink) 6%, transparent)' }}>
              <p style={{ fontSize: 13, color: 'color-mix(in oklab, var(--ink) 50%, transparent)', marginBottom: 12 }}>
                {t('localDescription')}
              </p>

              <div className="auth-field">
                <label className="auth-field__label" htmlFor="tseAgentDeviceId">{t('agentDeviceId')}</label>
                <input
                  id="tseAgentDeviceId"
                  className="input"
                  value={agentDeviceId}
                  onChange={(e) => setAgentDeviceId(e.target.value)}
                  placeholder={t('agentDeviceIdPlaceholder')}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {provider === 'fiskaly' && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => testConnection.mutate()}
                disabled={!tseSettings?.fiskaly?.tssId || testConnection.isPending}
              >
                {testConnection.isPending ? (
                  <>
                    <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'spin 0.75s linear infinite' }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </>
                ) : t('testConnection')}
              </button>
            )}
            {provider === 'local' && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => testConnection.mutate()}
                disabled={!tseSettings?.local?.agentDeviceId || testConnection.isPending}
              >
                {testConnection.isPending ? (
                  <>
                    <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'spin 0.75s linear infinite' }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </>
                ) : t('testConnection')}
              </button>
            )}
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => saveSettings.mutate()}
              disabled={!hasChanges || saveSettings.isPending}
            >
              {saveSettings.isPending ? (
                <>
                  <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'spin 0.75s linear infinite' }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </>
              ) : tCommon('save')}
            </button>
          </div>
        </div>
      </div>

      {/* Handover export — weekend-rental tenant separation */}
      <div className="app-card">
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t('export.title')}</h3>
          <p style={{ fontSize: 13, color: 'color-mix(in oklab, var(--ink) 50%, transparent)' }}>
            {t('export.description')}
          </p>
        </div>

        {!isConfigured ? (
          <div className="empty-state">
            <p className="empty-state__sub">{t('export.notConfigured')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="tseExportClient">{t('export.client')}</label>
              <select
                id="tseExportClient"
                className="input"
                value={exportClientId}
                onChange={(e) => setExportClientId(e.target.value)}
              >
                <option value="">{t('export.clientOrgWide')}</option>
                {(clientsQuery.data || [])
                  .filter((id) => id !== organizationId)
                  .map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div className="auth-field" style={{ flex: 1 }}>
                <label className="auth-field__label" htmlFor="tseExportStart">{t('export.periodStart')}</label>
                <input
                  id="tseExportStart"
                  type="date"
                  className="input"
                  value={exportStart}
                  onChange={(e) => setExportStart(e.target.value)}
                />
              </div>
              <div className="auth-field" style={{ flex: 1 }}>
                <label className="auth-field__label" htmlFor="tseExportEnd">{t('export.periodEnd')}</label>
                <input
                  id="tseExportEnd"
                  type="date"
                  className="input"
                  value={exportEnd}
                  onChange={(e) => setExportEnd(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => exportMutation.mutate()}
                disabled={!exportStart || !exportEnd || exportMutation.isPending}
              >
                {exportMutation.isPending ? (
                  <>
                    <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'spin 0.75s linear infinite' }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </>
                ) : t('export.download')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
