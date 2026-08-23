'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { organizationsApi, tseApi } from '@/lib/api-client';
import { toast } from '@/components/shared/toast';

export function OrganizationTseSection() {
  const t = useTranslations('settings.organizationTse');
  const tCommon = useTranslations('common');
  const { currentOrganization, setCurrentOrganization } = useAuthStore();
  const queryClient = useQueryClient();

  const tseSettings = currentOrganization?.organization?.settings?.tse;

  const [enabled, setEnabled] = useState(tseSettings?.enabled ?? false);
  const [apiKey, setApiKey] = useState(tseSettings?.fiskaly?.apiKey || '');
  const [apiSecret, setApiSecret] = useState(tseSettings?.fiskaly?.apiSecret || '');
  const [tssId, setTssId] = useState(tseSettings?.fiskaly?.tssId || '');

  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!currentOrganization) throw new Error('No organization');

      const settingsUpdate: Record<string, unknown> = {
        ...currentOrganization.organization?.settings,
        tse: {
          enabled,
          provider: 'fiskaly',
          fiskaly: { apiKey, apiSecret, tssId },
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

  if (!currentOrganization) {
    return null;
  }

  const hasChanges =
    enabled !== (tseSettings?.enabled ?? false) ||
    apiKey !== (tseSettings?.fiskaly?.apiKey || '') ||
    apiSecret !== (tseSettings?.fiskaly?.apiSecret || '') ||
    tssId !== (tseSettings?.fiskaly?.tssId || '');

  return (
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

        <div style={{ display: 'flex', gap: 8 }}>
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
  );
}
