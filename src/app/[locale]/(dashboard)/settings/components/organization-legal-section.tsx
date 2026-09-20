'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { organizationsApi } from '@/lib/api-client';
import { toast } from '@/components/shared/toast';

interface LegalFormState {
  imprint: string;
  privacy: string;
  terms: string;
  cancellation: string;
}

export function OrganizationLegalSection() {
  const t = useTranslations('settings.legal');
  const tCommon = useTranslations('common');
  const { currentOrganization, setCurrentOrganization } = useAuthStore();
  const queryClient = useQueryClient();

  const legal = currentOrganization?.organization?.settings?.legal;
  const [form, setForm] = useState<LegalFormState>({
    imprint: legal?.imprint ?? '',
    privacy: legal?.privacy ?? '',
    terms: legal?.terms ?? '',
    cancellation: legal?.cancellation ?? '',
  });

  const saveLegal = useMutation({
    mutationFn: async () => {
      if (!currentOrganization) throw new Error('No organization');
      const response = await organizationsApi.update(currentOrganization.organizationId, {
        settings: {
          ...currentOrganization.organization?.settings,
          legal: form,
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (currentOrganization?.organization) {
        setCurrentOrganization({ ...currentOrganization, organization: data });
      }
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success(t('saved'));
    },
    onError: () => {
      toast.error(tCommon('saveFailed'));
    },
  });

  if (!currentOrganization) {
    return null;
  }

  const fieldEntries: { key: keyof LegalFormState; label: string }[] = [
    { key: 'imprint', label: t('imprint') },
    { key: 'privacy', label: t('privacy') },
    { key: 'terms', label: t('terms') },
    { key: 'cancellation', label: t('cancellation') },
  ];

  const onlineOrdering = currentOrganization.organization?.settings?.onlineOrdering;
  const missingImprintOrPrivacy = !form.imprint.trim() || !form.privacy.trim();

  return (
    <div className="app-card">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t('title')}</h2>
        <p style={{ fontSize: 13, color: 'color-mix(in oklab, var(--ink) 50%, transparent)' }}>
          {t('description')}
        </p>
      </div>

      {onlineOrdering?.enabled && missingImprintOrPrivacy && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            padding: '10px 12px',
            marginBottom: 16,
            borderRadius: 8,
            background: 'color-mix(in oklab, var(--warn) 12%, transparent)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p style={{ fontSize: 13, color: 'var(--warn-ink)', margin: 0 }}>{t('missingWarning')}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {fieldEntries.map(({ key, label }) => (
          <div className="auth-field" key={key}>
            <label className="auth-field__label" htmlFor={`org-legal-${key}`}>{label}</label>
            <textarea
              id={`org-legal-${key}`}
              className="textarea"
              rows={6}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
            <p style={{ fontSize: 12, color: 'color-mix(in oklab, var(--ink) 50%, transparent)', marginTop: 4 }}>
              {t('markdownHint')}
            </p>
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        paddingTop: 16,
        marginTop: 16,
        borderTop: '1px solid color-mix(in oklab, var(--ink) 6%, transparent)',
      }}>
        <button type="button" className="btn btn--primary" disabled={saveLegal.isPending} onClick={() => saveLegal.mutate()}>
          {saveLegal.isPending ? tCommon('saving') : t('save')}
        </button>
      </div>
    </div>
  );
}