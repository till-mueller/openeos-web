'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { devicesApi, dsfinvkApi, eventsApi } from '@/lib/api-client';
import { toast } from '@/components/shared/toast';

export function OrganizationDsfinvkExportSection() {
  const t = useTranslations('settings.organizationDsfinvk');
  const { currentOrganization } = useAuthStore();
  const organizationId = currentOrganization?.organizationId;

  const [eventId, setEventId] = useState('');
  const [deviceId, setDeviceId] = useState('');

  const eventsQuery = useQuery({
    queryKey: ['events', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await eventsApi.list(organizationId);
      return response.data || [];
    },
    enabled: !!organizationId,
  });

  const devicesQuery = useQuery({
    queryKey: ['devices', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await devicesApi.list(organizationId);
      return response.data || [];
    },
    enabled: !!organizationId,
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !eventId || !deviceId) throw new Error('Missing event or device');
      const { blob, filename } = await dsfinvkApi.exportData(organizationId, eventId, deviceId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('failed'));
    },
  });

  if (!currentOrganization) {
    return null;
  }

  return (
    <div className="app-card">
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t('title')}</h3>
        <p style={{ fontSize: 13, color: 'color-mix(in oklab, var(--ink) 50%, transparent)' }}>{t('description')}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="auth-field">
          <label className="auth-field__label" htmlFor="dsfinvkEvent">{t('event')}</label>
          <select id="dsfinvkEvent" className="input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">{t('selectEvent')}</option>
            {(eventsQuery.data || []).map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>

        <div className="auth-field">
          <label className="auth-field__label" htmlFor="dsfinvkDevice">{t('device')}</label>
          <select id="dsfinvkDevice" className="input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            <option value="">{t('selectDevice')}</option>
            {(devicesQuery.data || []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => exportMutation.mutate()}
            disabled={!eventId || !deviceId || exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <>
                <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'spin 0.75s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </>
            ) : t('download')}
          </button>
        </div>
      </div>
    </div>
  );
}
