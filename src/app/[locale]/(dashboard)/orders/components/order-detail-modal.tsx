'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { DialogCloseButton } from '@/components/shared/dialog-close-button';
import { paymentsApi } from '@/lib/api-client';
import { toast } from '@/components/shared/toast';
import {
  getOrderChannel,
  getOrderTseStatus,
  type Order,
  type OrderChannel,
  type OrderItem,
  type OrderPaymentStatus,
  type OrderStatus,
  type OrderTseStatus,
} from '@/types/order';
import type { Payment } from '@/types/payment';

const statusBadge: Record<OrderStatus, string> = {
  open: 'badge badge--neutral',
  in_progress: 'badge badge--warning',
  ready: 'badge badge--info',
  completed: 'badge badge--success',
  cancelled: 'badge badge--error',
};

const paymentBadge: Record<OrderPaymentStatus, string> = {
  unpaid: 'badge badge--error',
  partly_paid: 'badge badge--warning',
  paid: 'badge badge--success',
  refunded: 'badge badge--neutral',
};

const tseBadge: Record<Exclude<OrderTseStatus, 'none'>, string> = {
  signed: 'badge badge--success',
  unsigned: 'badge badge--warning',
  failed: 'badge badge--error',
};

const channelBadge: Record<OrderChannel, string> = {
  service: 'badge badge--info',
  counter: 'badge badge--neutral',
  online: 'badge badge--success',
};

interface OrderDetailModalProps {
  order: Order | null;
  creatorLabel: string | null;
  organizationId: string;
  onClose: () => void;
}

export function OrderDetailModal({ order, creatorLabel, organizationId, onClose }: OrderDetailModalProps) {
  const t = useTranslations();

  if (!order) return null;

  const channel = getOrderChannel(order);
  const tseStatus = getOrderTseStatus(order);
  const discount = Number(order.discountAmount || 0);
  const pfand = Number(order.pfandTotal || 0);
  const tip = Number(order.tipAmount || 0);

  return (
    <div className="modal__overlay" onClick={onClose}>
      <div className="modal__panel modal__panel--md" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div>
            <h2 style={{ margin: 0 }}>{t('orders.detail.title', { number: order.dailyNumber })}</h2>
            <div style={{ fontSize: 12, color: 'color-mix(in oklab, var(--ink) 45%, transparent)', fontFamily: 'var(--f-mono)', marginTop: 2 }}>
              {order.orderNumber}
            </div>
          </div>
          <DialogCloseButton onClick={onClose} />
        </div>

        <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className={channelBadge[channel]}>{t(`orders.channel.${channel}`)}</span>
            <span className={statusBadge[order.status]}>{t(`orders.status.${order.status}`)}</span>
            <span className={paymentBadge[order.paymentStatus]}>{t(`orders.paymentStatus.${order.paymentStatus}`)}</span>
            {tseStatus !== 'none' && (
              <span className={tseBadge[tseStatus]} title={t(`orders.tseStatus.${tseStatus}Hint`)}>
                {t(`orders.tseStatus.${tseStatus}`)}
              </span>
            )}
          </div>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <MetaRow label={t('orders.detail.createdAt')} value={formatDateTime(order.createdAt)} />
            {creatorLabel && <MetaRow label={t('orders.detail.createdBy')} value={creatorLabel} />}
            {order.tableNumber && <MetaRow label={t('orders.columns.table')} value={order.tableNumber} />}
            {order.customerName && <MetaRow label={t('orders.customer')} value={order.customerName} />}
            {order.customerPhone && <MetaRow label={t('orders.detail.phone')} value={order.customerPhone} />}
          </div>

          {order.notes && (
            <div style={{ fontSize: 13, padding: '10px 12px', borderRadius: 8, background: 'color-mix(in oklab, var(--ink) 4%, transparent)' }}>
              <span style={{ color: 'color-mix(in oklab, var(--ink) 45%, transparent)' }}>{t('orders.detail.notes')}: </span>
              {order.notes}
            </div>
          )}

          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(order.items ?? []).map((item) => (
              <ItemRow key={item.id} item={item} refillLabel={t('orders.detail.refill')} />
            ))}
          </div>

          {/* Totals */}
          <div style={{ borderTop: '1px solid color-mix(in oklab, var(--ink) 10%, transparent)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <TotalRow label={t('orders.detail.subtotal')} value={formatCurrency(order.subtotal)} />
            {discount > 0 && (
              <TotalRow
                label={order.discountReason ? `${t('orders.detail.discount')} (${order.discountReason})` : t('orders.detail.discount')}
                value={`−${formatCurrency(discount)}`}
              />
            )}
            {pfand > 0 && <TotalRow label={t('orders.detail.pfand')} value={formatCurrency(pfand)} />}
            {tip > 0 && <TotalRow label={t('orders.detail.tip')} value={formatCurrency(tip)} />}
            <TotalRow label={t('orders.detail.total')} value={formatCurrency(order.total)} strong />
            {Number(order.paidAmount) > 0 && (
              <TotalRow label={t('orders.paid')} value={formatCurrency(order.paidAmount)} />
            )}
          </div>

          {/* Receipts — view/email independent of receipt-printing/printer config */}
          {order.payments && order.payments.length > 0 && (
            <div style={{ borderTop: '1px solid color-mix(in oklab, var(--ink) 10%, transparent)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'color-mix(in oklab, var(--ink) 55%, transparent)' }}>
                {t('orders.detail.receipts')}
              </div>
              {order.payments.map((payment) => (
                <PaymentReceiptRow key={payment.id} payment={payment} organizationId={organizationId} />
              ))}
            </div>
          )}
        </div>

        <div className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'color-mix(in oklab, var(--ink) 45%, transparent)' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function ItemRow({ item, refillLabel }: { item: OrderItem; refillLabel: string }) {
  const options = item.options?.selected ?? [];
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>
          {item.quantity}× {item.productName}
        </div>
        {options.length > 0 && (
          <div style={{ fontSize: 12, color: 'color-mix(in oklab, var(--ink) 50%, transparent)' }}>
            {options
              .map((o) => (o.excluded ? `− ${o.option}` : o.option))
              .join(', ')}
          </div>
        )}
        {item.isRefill && (
          <div style={{ fontSize: 12, color: 'var(--green-ink)' }}>{refillLabel}</div>
        )}
        {item.notes && (
          <div style={{ fontSize: 12, color: 'color-mix(in oklab, var(--ink) 50%, transparent)', fontStyle: 'italic' }}>
            {item.notes}
          </div>
        )}
      </div>
      <div className="mono" style={{ flexShrink: 0, fontWeight: 600 }}>
        {formatCurrency(item.totalPrice)}
      </div>
    </div>
  );
}

function PaymentReceiptRow({ payment, organizationId }: { payment: Payment; organizationId: string }) {
  const t = useTranslations();
  // Which document the open email-input row (if any) is composing for --
  // one shared input instead of two separate toggle states.
  const [emailMode, setEmailMode] = useState<'receipt' | 'bewirtungsbeleg' | null>(null);
  const [email, setEmail] = useState('');

  const openBlob = async (fetchBlob: () => Promise<Blob>, failedMessage: string) => {
    try {
      const blob = await fetchBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Revoke after a delay rather than immediately — the new tab needs
      // time to actually load the blob URL before it's freed.
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      toast.error((error as Error).message || failedMessage);
    }
  };

  const viewReceipt = useMutation({
    mutationFn: () => openBlob(() => paymentsApi.getReceiptPdf(organizationId, payment.id), t('orders.detail.receiptFailed')),
  });

  const viewBewirtungsbeleg = useMutation({
    mutationFn: () =>
      openBlob(() => paymentsApi.getBewirtungsbelegPdf(organizationId, payment.id), t('orders.detail.bewirtungsbelegFailed')),
  });

  const emailReceipt = useMutation({
    mutationFn: async () => {
      const response = await paymentsApi.emailReceipt(organizationId, payment.id, email);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(t('orders.detail.receiptEmailSent', { email }));
        setEmailMode(null);
        setEmail('');
      } else {
        toast.error(data.message || t('orders.detail.receiptFailed'));
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t('orders.detail.receiptFailed'));
    },
  });

  const emailBewirtungsbeleg = useMutation({
    mutationFn: async () => {
      const response = await paymentsApi.emailBewirtungsbeleg(organizationId, payment.id, email);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(t('orders.detail.bewirtungsbelegEmailSent', { email }));
        setEmailMode(null);
        setEmail('');
      } else {
        toast.error(data.message || t('orders.detail.bewirtungsbelegFailed'));
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t('orders.detail.bewirtungsbelegFailed'));
    },
  });

  const activeEmailMutation = emailMode === 'bewirtungsbeleg' ? emailBewirtungsbeleg : emailReceipt;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13, flexWrap: 'wrap' }}>
        <span>
          {formatCurrency(payment.amount)} · {t(`orders.paymentMethod.${payment.paymentMethod}`)}
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => viewReceipt.mutate()}
            disabled={viewReceipt.isPending}
          >
            {t('orders.detail.viewReceipt')}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setEmailMode((m) => (m === 'receipt' ? null : 'receipt'))}
          >
            {t('orders.detail.emailReceipt')}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => viewBewirtungsbeleg.mutate()}
            disabled={viewBewirtungsbeleg.isPending}
          >
            {t('orders.detail.viewBewirtungsbeleg')}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setEmailMode((m) => (m === 'bewirtungsbeleg' ? null : 'bewirtungsbeleg'))}
          >
            {t('orders.detail.emailBewirtungsbeleg')}
          </button>
        </div>
      </div>
      {emailMode && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="email"
            className="input"
            style={{ flex: 1 }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('orders.detail.emailPlaceholder')}
          />
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => activeEmailMutation.mutate()}
            disabled={!email || activeEmailMutation.isPending}
          >
            {activeEmailMutation.isPending ? '…' : t('orders.detail.send')}
          </button>
        </div>
      )}
    </div>
  );
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: strong ? 16 : 13 }}>
      <span style={{ color: strong ? 'var(--ink)' : 'color-mix(in oklab, var(--ink) 55%, transparent)', fontWeight: strong ? 700 : 400 }}>
        {label}
      </span>
      <span className="mono" style={{ fontWeight: strong ? 700 : 500 }}>{value}</span>
    </div>
  );
}
