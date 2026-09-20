'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';
import { useDeleteMyAccount, useExportMyData } from '@/hooks/use-user-settings';
import { toast } from '@/components/shared/toast';
import { DialogCloseButton } from '@/components/shared/dialog-close-button';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DataRightsSection() {
  const t = useTranslations('settings.account.dataRights');
  const tCommon = useTranslations('common');
  const { logout } = useAuthStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');

  const exportMyData = useExportMyData();
  const deleteMyAccount = useDeleteMyAccount();

  const handleExport = async () => {
    try {
      const { blob, filename } = await exportMyData.mutateAsync();
      downloadBlob(blob, filename);
      toast.success(t('exported'));
    } catch {
      toast.error(t('exportFailed'));
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteMyAccount.mutateAsync(password || undefined);
      toast.success(t('deleted'));
      // Logout clears the httpOnly cookie server-side and hard-redirects to
      // /login — same post-logout destination as every other sign-out.
      await logout();
    } catch {
      toast.error(t('deleteFailed'));
    }
  };

  return (
    <div className="app-card">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t('title')}</h2>
        <p style={{ fontSize: 13, color: 'color-mix(in oklab, var(--ink) 50%, transparent)' }}>
          {t('description')}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'color-mix(in oklab, var(--ink) 55%, transparent)', margin: 0 }}>
            {t('exportHint')}
          </p>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleExport}
            disabled={exportMyData.isPending}
            style={{ flexShrink: 0 }}
          >
            {exportMyData.isPending ? t('exporting') : t('export')}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingTop: 16, borderTop: '1px solid color-mix(in oklab, var(--ink) 6%, transparent)' }}>
          <p style={{ fontSize: 13, color: 'var(--danger)', margin: 0, fontWeight: 600 }}>
            {t('deleteHint')}
          </p>
          <button
            type="button"
            className="btn btn--ghost"
            style={{ color: 'var(--red, var(--danger))', flexShrink: 0 }}
            onClick={() => setShowDeleteModal(true)}
          >
            {t('delete')}
          </button>
        </div>
      </div>

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="modal__backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="modal__box modal__panel--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <div className="modal__title">{t('deleteModalTitle')}</div>
              <DialogCloseButton onClick={() => setShowDeleteModal(false)} />
            </div>
            <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 12, borderRadius: 8, background: 'color-mix(in oklab, var(--warn) 12%, transparent)', display: 'flex', gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                <p style={{ fontSize: 13, color: 'var(--warn-ink)' }}>{t('deleteWarning')}</p>
              </div>
              <div className="auth-field">
                <label className="auth-field__label" htmlFor="deleteAccountPassword">{t('passwordPrompt')}</label>
                <input
                  id="deleteAccountPassword"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="modal__foot">
              <button className="btn btn--ghost" onClick={() => setShowDeleteModal(false)}>{tCommon('cancel')}</button>
              <button className="btn btn--primary" style={{ background: 'var(--red, var(--danger))' }} onClick={handleDeleteConfirm} disabled={deleteMyAccount.isPending}>
                {deleteMyAccount.isPending ? t('deleteConfirming') : t('deleteConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}