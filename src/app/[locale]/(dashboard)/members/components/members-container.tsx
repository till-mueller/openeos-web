'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useAuthStore } from '@/stores/auth-store';
import { useAnonymizeMember, useRemoveMember } from '@/hooks/use-members';
import { ListEmpty } from '@/components/shared/list-states';
import { toast } from '@/components/shared/toast';
import type { UserOrganization } from '@/types/auth';

import { EditPermissionsModal } from './edit-permissions-modal';
import { InvitationsList } from './invitations-list';
import { InviteMemberModal } from './invite-member-modal';
import { MembersList } from './members-list';

export function MembersContainer() {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const { currentOrganization } = useAuthStore();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<UserOrganization | null>(null);
  const [anonymizingMember, setAnonymizingMember] = useState<UserOrganization | null>(null);
  const [editingMember, setEditingMember] = useState<UserOrganization | null>(null);

  const organizationId = currentOrganization?.organizationId;
  const removeMember = useRemoveMember(organizationId || '');
  const anonymizeMember = useAnonymizeMember(organizationId || '');

  const handleInviteClick = () => {
    setIsInviteModalOpen(true);
  };

  const handleRemoveClick = (member: UserOrganization) => {
    setRemovingMember(member);
  };

  const handleAnonymizeClick = (member: UserOrganization) => {
    setAnonymizingMember(member);
  };

  const handleEditPermissionsClick = (member: UserOrganization) => {
    setEditingMember(member);
  };

  const handleRemoveConfirm = async () => {
    if (!removingMember) return;

    try {
      await removeMember.mutateAsync(removingMember.userId);
      setRemovingMember(null);
    } catch {
      // Error is handled by the mutation
    }
  };

  const handleAnonymizeConfirm = async () => {
    if (!anonymizingMember) return;

    try {
      await anonymizeMember.mutateAsync(anonymizingMember.userId);
      toast.success(t('notifications.anonymized'));
      setAnonymizingMember(null);
    } catch {
      // Error is handled by the mutation
    }
  };

  const handleModalClose = () => {
    setIsInviteModalOpen(false);
  };

  if (!organizationId) {
    return (
      <ListEmpty
        title="Keine Organisation ausgewählt"
        description="Bitte wählen Sie zuerst eine Organisation aus."
        icon={
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        }
      />
    );
  }

  return (
    <>
      <MembersList
        organizationId={organizationId}
        onInviteClick={handleInviteClick}
        onRemoveClick={handleRemoveClick}
        onAnonymizeClick={handleAnonymizeClick}
        onEditPermissionsClick={handleEditPermissionsClick}
      />

      <InvitationsList organizationId={organizationId} />

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        organizationId={organizationId}
        onClose={handleModalClose}
      />

      {editingMember && (
        <EditPermissionsModal
          isOpen={!!editingMember}
          organizationId={organizationId}
          member={editingMember as UserOrganization & { user?: { firstName: string; lastName: string; email: string } }}
          onClose={() => setEditingMember(null)}
        />
      )}

      {/* Remove confirmation modal */}
      {removingMember && (
        <div className="modal__overlay" style={{ display: 'flex' }}>
          <div className="modal__panel modal__panel--sm">
            <div className="modal__head">
              <h3 className="modal__title">{t('removeConfirm.title')}</h3>
            </div>
            <div className="modal__body">
              <p style={{ fontSize: 14, color: 'var(--ink-faint)', margin: 0 }}>{t('removeConfirm.message')}</p>
            </div>
            <div className="modal__foot">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setRemovingMember(null)}
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--red, var(--danger))', color: '#fff' }}
                onClick={handleRemoveConfirm}
                disabled={removeMember.isPending}
              >
                {removeMember.isPending ? tCommon('saving') : t('removeConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anonymize confirmation modal */}
      {anonymizingMember && (
        <div className="modal__overlay" style={{ display: 'flex' }}>
          <div className="modal__panel modal__panel--sm">
            <div className="modal__head">
              <h3 className="modal__title">{t('anonymizeConfirm.title')}</h3>
            </div>
            <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 14, color: 'var(--ink-faint)', margin: 0 }}>
                {t('anonymizeConfirm.message', {
                  name: `${anonymizingMember.user?.firstName || ''} ${anonymizingMember.user?.lastName || ''}`.trim(),
                })}
              </p>
              <p style={{ fontSize: 13, color: 'var(--warn-ink)', margin: 0, padding: 10, borderRadius: 8, background: 'color-mix(in oklab, var(--warn) 12%, transparent)' }}>
                {t('anonymizeConfirm.hint')}
              </p>
            </div>
            <div className="modal__foot">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setAnonymizingMember(null)}
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--red, var(--danger))', color: '#fff' }}
                onClick={handleAnonymizeConfirm}
                disabled={anonymizeMember.isPending}
              >
                {anonymizeMember.isPending ? tCommon('saving') : t('anonymizeConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
