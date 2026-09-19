'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { toast } from '@/components/shared/toast';

export function AdminFiskalyCredentialForm() {
  const t = useTranslations('admin.tse.credential');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const statusQuery = useQuery({
    queryKey: ['admin-fiskaly-credential-status'],
    queryFn: async () => {
      const response = await adminApi.getFiskalyCredentialStatus();
      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await adminApi.setFiskalyCredential(apiKey, apiSecret);
      return response.data;
    },
    onSuccess: () => {
      setApiKey('');
      setApiSecret('');
      toast.success(t('saved'));
      queryClient.invalidateQueries({ queryKey: ['admin-fiskaly-credential-status'] });
    },
    onError: () => {
      toast.error(t('saveFailed'));
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await adminApi.clearFiskalyCredential();
    },
    onSuccess: () => {
      toast.success(t('cleared'));
      queryClient.invalidateQueries({ queryKey: ['admin-fiskaly-credential-status'] });
    },
    onError: () => {
      toast.error(t('clearFailed'));
    },
  });

  const configured = statusQuery.data?.configured ?? false;

  return (
    <div className="app-card" style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t('title')}</h3>
        <p style={{ fontSize: 13, color: 'color-mix(in oklab, var(--ink) 50%, transparent)' }}>{t('description')}</p>
      </div>

      {configured && (
        <p style={{ fontSize: 13, marginBottom: 16 }}>
          <span className="badge badge--success">{t('configuredBadge', { last4: statusQuery.data?.apiKeyLast4 || '????' })}</span>
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="auth-field">
          <label className="auth-field__label" htmlFor="fiskalyPlatformApiKey">{t('apiKey')}</label>
          <input
            id="fiskalyPlatformApiKey"
            type="password"
            className="input"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={configured ? t('apiKeyPlaceholderConfigured') : t('apiKeyPlaceholder')}
          />
        </div>

        <div className="auth-field">
          <label className="auth-field__label" htmlFor="fiskalyPlatformApiSecret">{t('apiSecret')}</label>
          <input
            id="fiskalyPlatformApiSecret"
            type="password"
            className="input"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder={configured ? t('apiSecretPlaceholderConfigured') : t('apiSecretPlaceholder')}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => saveMutation.mutate()}
            disabled={!apiKey || !apiSecret || saveMutation.isPending}
          >
            {saveMutation.isPending ? tCommon('saving') : tCommon('save')}
          </button>
          {configured && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
            >
              {t('clear')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
