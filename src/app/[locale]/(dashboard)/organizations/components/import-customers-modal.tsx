'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useImportCustomers } from '@/hooks/use-organizations';
import { DialogCloseButton } from '@/components/shared/dialog-close-button';
import { toast } from '@/components/shared/toast';
import type { CustomerImportResult } from '@/types/admin';

interface ImportCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportCustomersModal({ isOpen, onClose }: ImportCustomersModalProps) {
  const t = useTranslations('organizations');
  const tCommon = useTranslations('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<CustomerImportResult[] | null>(null);

  const importCustomers = useImportCustomers();

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList) return;
    setFiles(Array.from(fileList));
    setResults(null);
  };

  const handleImport = async () => {
    if (files.length === 0) return;
    try {
      const data = await importCustomers.mutateAsync(files);
      setResults(data);
      const created = data.filter((r) => r.action === 'created').length;
      const updated = data.filter((r) => r.action === 'updated').length;
      const failed = data.filter((r) => r.action === 'error').length;
      if (failed === 0) {
        toast.success(t('import.summarySuccess', { created, updated }));
      } else {
        toast.error(t('import.summaryPartial', { created, updated, failed }));
      }
    } catch {
      toast.error(t('import.failed'));
    }
  };

  const handleClose = () => {
    setFiles([]);
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal__overlay" style={{ display: 'flex' }} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="modal__panel modal__panel--md">
        <div className="modal__head">
          <h2 className="modal__title">{t('import.title')}</h2>
          <DialogCloseButton onClick={handleClose} />
        </div>

        <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: 0 }}>{t('import.description')}</p>

          <label className="auth-field">
            <span>{t('import.filesLabel')}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".yaml,.yml"
              multiple
              className="input"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
          </label>

          {files.length > 0 && !results && (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--ink-faint)' }}>
              {files.map((file) => (
                <li key={file.name}>{file.name}</li>
              ))}
            </ul>
          )}

          {results && (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('import.table.file')}</th>
                    <th>{t('import.table.result')}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.filename}>
                      <td className="mono" style={{ fontSize: 12 }}>{result.filename}</td>
                      <td style={{ fontSize: 12 }}>
                        {result.action === 'error' ? (
                          <span style={{ color: 'var(--red, var(--danger))' }}>{result.error}</span>
                        ) : (
                          <span>{t(`import.table.action.${result.action}`)} ({result.organizationSlug})</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={handleClose}>
            {results ? tCommon('close') : tCommon('cancel')}
          </button>
          {!results && (
            <button
              type="button"
              className="btn btn--primary"
              disabled={files.length === 0 || importCustomers.isPending}
              onClick={handleImport}
            >
              {importCustomers.isPending ? tCommon('saving') : t('import.submit')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
