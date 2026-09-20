'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Receipt, BankNote01, CreditCard01, Scissors01, Check } from '@untitledui/icons';
import { cx } from '@/utils/cx';
import { Button } from '@/components/ui/buttons/button';
import { DialogModal } from '@/components/ui/modal/dialog-modal';
import { useDeviceStore } from '@/stores/device-store';
import { deviceApi } from '@/lib/api-client';
import { formatCurrency } from '@/utils/format';
import { CashPaymentModal } from './cash-payment-modal';
import { SumUpCheckoutModal } from './sumup-checkout-modal';
import type { Order } from '@/types/order';
import type { PaymentMethod } from '@/types/payment';

interface OpenTabsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSplitPayment: () => void;
  currentUserId?: string;
}

interface TableGroup {
  key: string;
  tableLabel: string | null;
  orders: Order[];
  remaining: number;
}

export function OpenTabsDrawer({ isOpen, onClose, onSplitPayment, currentUserId }: OpenTabsDrawerProps) {
  const t = useTranslations('pos.openTabs');
  const queryClient = useQueryClient();

  const [showCashModal, setShowCashModal] = useState(false);
  const [showSumupModal, setShowSumupModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [paymentError, setPaymentError] = useState<string | null>(null);
  // TEMP diagnostic round 4 — captures selectedTotal at the exact moment the
  // Cash button is clicked, so we can tell "already 0 at click time" apart
  // from "was correct at click time, something reset it after".
  const [debugClickSnapshot, setDebugClickSnapshot] = useState<string | null>(null);
  const { settings } = useDeviceStore();
  const hasSumupReader = !!settings?.sumupReaderId;

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['device-open-tabs', currentUserId],
    queryFn: () => deviceApi.getOpenOrders(currentUserId),
    enabled: isOpen,
    refetchInterval: 10000,
  });

  const orders = ordersData?.data || [];

  const getRemainingAmount = (order: Order): number => {
    return Number(order.total) - Number(order.paidAmount || 0);
  };

  // Group by table so a cashier can pay one table off without touching every
  // other open tab (was: "pay all" was the only option, no per-table pick).
  const tableGroups = useMemo<TableGroup[]>(() => {
    const byKey = new Map<string, TableGroup>();
    for (const order of orders) {
      const key = order.tableNumber || `order:${order.id}`;
      const existing = byKey.get(key);
      const remaining = getRemainingAmount(order);
      if (existing) {
        existing.orders.push(order);
        existing.remaining += remaining;
      } else {
        byKey.set(key, {
          key,
          tableLabel: order.tableNumber || null,
          orders: [order],
          remaining,
        });
      }
    }
    return Array.from(byKey.values()).sort((a, b) => {
      if (a.tableLabel && b.tableLabel) return a.tableLabel.localeCompare(b.tableLabel, undefined, { numeric: true });
      if (a.tableLabel) return -1;
      if (b.tableLabel) return 1;
      return 0;
    });
  }, [orders]);

  useEffect(() => {
    if (!isOpen) {
      // TEMP diagnostic round 5 — proving/disproving the theory that tapping
      // Bar somehow causes the parent's isOpen (DialogModal) to flip false,
      // which would clear selectedKeys via THIS effect after the click but
      // before CashPaymentModal's own render reads selectedTotal.
      setDebugClickSnapshot((prev) => `${prev ?? ''} | isOpen-went-false-at=${new Date().toISOString()}`);
      setSelectedKeys(new Set());
      setPaymentError(null);
    }
  }, [isOpen]);

  // Drop selections for tables that just got fully paid / disappeared.
  useEffect(() => {
    setSelectedKeys((prev) => {
      const validKeys = new Set(tableGroups.map((g) => g.key));
      const next = new Set(Array.from(prev).filter((k) => validKeys.has(k)));
      return next.size === prev.size ? prev : next;
    });
  }, [tableGroups]);

  const selectedGroups = tableGroups.filter((g) => selectedKeys.has(g.key));
  const selectedOrders = selectedGroups.flatMap((g) => g.orders);
  const selectedTotal = selectedGroups.reduce((sum, g) => sum + g.remaining, 0);
  const allSelected = tableGroups.length > 0 && selectedKeys.size === tableGroups.length;

  const toggleGroup = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedKeys(allSelected ? new Set() : new Set(tableGroups.map((g) => g.key)));
  };

  const paySelectedOrders = async (paymentMethod: PaymentMethod) => {
    if (selectedOrders.length === 0) return;

    // Selection can go stale (a 10s refetchInterval, or another device
    // settling the same tab first) -- catch a payable amount of 0 here with
    // a clear message instead of silently no-op'ing through the success path
    // below, which used to close the sheet without ever telling the cashier
    // nothing was actually charged.
    if (selectedTotal <= 0) {
      setPaymentError(t('nothingToPay'));
      queryClient.invalidateQueries({ queryKey: ['device-open-tabs'] });
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);
    try {
      for (const order of selectedOrders) {
        const remainingAmount = getRemainingAmount(order);
        if (remainingAmount <= 0) continue;

        await deviceApi.createPayment({
          orderId: order.id,
          amount: remainingAmount,
          paymentMethod,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['device-open-tabs'] });
      queryClient.invalidateQueries({ queryKey: ['device-orders'] });
      queryClient.invalidateQueries({ queryKey: ['device-order-history'] });
      setSelectedKeys(new Set());
      setShowCashModal(false);
      setShowSumupModal(false);
    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentError(error instanceof Error && error.message ? error.message : t('paymentFailed'));
      // Selection may now be stale (a payment in the loop could have gone
      // through before a later one failed) -- refresh so the cashier sees
      // accurate remaining amounts on retry instead of the pre-failure state.
      queryClient.invalidateQueries({ queryKey: ['device-open-tabs'] });
    } finally {
      setIsProcessing(false);
    }
  };

  // The button guards this via isDisabled too, but a Button prop-name typo is
  // exactly what caused the "0€ payment popup" bug (isDisabled, not disabled,
  // is what actually gates this design-system Button) -- guard here as well so
  // that class of mistake can never again open a payment sheet with nothing selected.
  const handleCashPayment = () => {
    setDebugClickSnapshot(
      `clickTime: hasSelection=${hasSelection} selectedTotal=${selectedTotal} keys=[${Array.from(selectedKeys).join(',')}]`,
    );
    if (!hasSelection) return;
    setPaymentError(null);
    setShowCashModal(true);
  };

  const handleCashConfirm = () => {
    paySelectedOrders('cash');
  };

  // Only reachable when hasSumupReader is true — the button itself is hidden otherwise.
  const handleCardPayment = () => {
    if (!hasSelection) return;
    setPaymentError(null);
    setShowSumupModal(true);
  };

  const handleSplit = () => {
    onSplitPayment();
    onClose();
  };

  const hasSelection = selectedOrders.length > 0;

  return (
    <>
      <DialogModal
        isOpen={isOpen}
        onClose={onClose}
        title={t('title')}
        size="lg"
      >
        <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {isLoading ? (
            <div className="flex h-48 items-center justify-center p-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
            </div>
          ) : tableGroups.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center p-6">
              <Receipt className="h-12 w-12 text-tertiary mb-4" />
              <p className="text-lg font-medium text-primary">{t('noOpenTabs')}</p>
              <p className="text-sm text-tertiary">{t('noOpenTabsDescription')}</p>
            </div>
          ) : (
            <>
              {/* Select-all row */}
              <div className="px-6 pt-6 pb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-sm font-medium text-primary"
                >
                  <span
                    className={cx(
                      'flex h-5 w-5 items-center justify-center rounded border',
                      allSelected ? 'border-brand-primary bg-brand-primary' : 'border-secondary',
                    )}
                  >
                    {allSelected && <Check className="h-3.5 w-3.5 text-white" />}
                  </span>
                  {t('selectAll')}
                </button>
                <span className="text-sm text-tertiary">
                  {hasSelection ? t('selectedTables', { count: selectedGroups.length }) : t('selectHint')}
                </span>
              </div>

              {/* Scrollable table-group list */}
              <div className="flex-1 overflow-auto px-6 pb-3">
                <div className="space-y-3">
                  {tableGroups.map((group) => {
                    const selected = selectedKeys.has(group.key);
                    return (
                      <button
                        key={group.key}
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                        className={cx(
                          'w-full rounded-lg border p-4 text-left transition-colors',
                          selected
                            ? 'border-brand-primary bg-brand-primary/5'
                            : 'border-secondary bg-primary',
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={cx(
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                                selected ? 'border-brand-primary bg-brand-primary' : 'border-secondary',
                              )}
                            >
                              {selected && <Check className="h-3.5 w-3.5 text-white" />}
                            </span>
                            <span className="font-medium text-primary">
                              {group.tableLabel ? `${t('table')} ${group.tableLabel}` : t('noTable')}
                            </span>
                            <span className="text-sm text-tertiary">
                              {group.orders.length} {t('orders', { count: group.orders.length })}
                            </span>
                          </div>
                          <p className="text-lg font-bold text-brand-primary">
                            {formatCurrency(group.remaining)}
                          </p>
                        </div>

                        {group.orders.map((order) => (
                          <div key={order.id} className="mb-1.5 last:mb-0">
                            {order.customerName && (
                              <div className="text-xs text-tertiary mb-0.5">
                                #{order.dailyNumber || order.orderNumber} - {order.customerName}
                              </div>
                            )}
                            {order.items && order.items.length > 0 && (
                              <div className="space-y-0.5">
                                {order.items
                                  .filter((item) => item.status !== 'cancelled')
                                  .map((item, idx) => {
                                    const isFullyPaid = (item.paidQuantity || 0) >= item.quantity;
                                    return (
                                      <div
                                        key={idx}
                                        className={cx(
                                          'flex justify-between text-sm',
                                          isFullyPaid && 'line-through opacity-60'
                                        )}
                                      >
                                        <span className={cx(isFullyPaid ? 'text-error-primary' : 'text-tertiary')}>
                                          {item.quantity}x {item.productName}
                                        </span>
                                        <span className={cx(isFullyPaid ? 'text-error-primary' : 'text-primary')}>
                                          {formatCurrency(Number(item.totalPrice))}
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                            {Number(order.paidAmount) > 0 && (
                              <p className="text-xs text-tertiary mt-0.5">
                                {t('partlyPaid', { amount: formatCurrency(Number(order.paidAmount)) })}
                              </p>
                            )}
                          </div>
                        ))}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sticky footer — overview of what's about to be paid + payment actions */}
              <div className="border-t border-secondary px-6 py-4 space-y-3">
                {paymentError && !showCashModal && (
                  <div className="rounded-lg border border-error-primary bg-error-primary/10 px-3 py-2 text-sm font-medium text-error-primary">
                    {paymentError}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">
                    {hasSelection ? t('selectedTotal') : t('totalOpen')}
                  </span>
                  <span className="text-2xl font-bold text-brand-primary">
                    {formatCurrency(hasSelection ? selectedTotal : tableGroups.reduce((s, g) => s + g.remaining, 0))}
                  </span>
                </div>
                {/* TEMP diagnostic round 2 — round 1 (isDisabled fix) was real but
                    didn't resolve it. Read this back verbatim (footer AND popup
                    lines both), then this block can come back out. */}
                <div className="text-[10px] font-mono text-tertiary break-all">
                  debug: showCashModal={String(showCashModal)} isProcessing={String(isProcessing)} hasSelection={String(hasSelection)} keys=[{Array.from(selectedKeys).join(',')}] orders=[
                  {selectedOrders.map((o) => `${o.orderNumber}:t${o.total}-p${o.paidAmount}`).join(',')}
                  ] selectedTotal={selectedTotal} tableGroups={tableGroups.length} rawOrders={orders.length}
                </div>

                <div className={cx('grid gap-3', hasSumupReader ? 'grid-cols-2' : 'grid-cols-1')}>
                  <Button
                    color="secondary"
                    size="lg"
                    onClick={handleCashPayment}
                    isDisabled={isProcessing || !hasSelection}
                    iconLeading={BankNote01}
                  >
                    {t('payCash')}
                  </Button>
                  {/* Matches PosCart: no reader configured means there's nothing for this
                      button to actually charge, so it's hidden rather than silently
                      recording an unverified "card" payment with no terminal behind it. */}
                  {hasSumupReader && (
                    <Button
                      size="lg"
                      onClick={handleCardPayment}
                      isDisabled={isProcessing || !hasSelection}
                      iconLeading={CreditCard01}
                    >
                      {t('payCard')}
                    </Button>
                  )}
                </div>

                <Button
                  color="tertiary"
                  size="lg"
                  className="w-full"
                  onClick={handleSplit}
                  iconLeading={Scissors01}
                >
                  {t('splitBill')}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogModal>

      {/* Cash Payment Modal */}
      <CashPaymentModal
        isOpen={showCashModal}
        onClose={() => setShowCashModal(false)}
        total={selectedTotal}
        onConfirm={handleCashConfirm}
        isProcessing={isProcessing}
        error={paymentError}
        source="OpenTabsDrawer"
        debugExtra={debugClickSnapshot}
      />

      {/* SumUp Checkout Modal */}
      <SumUpCheckoutModal
        isOpen={showSumupModal}
        onClose={() => setShowSumupModal(false)}
        amount={selectedTotal}
        onSuccess={() => {
          setShowSumupModal(false);
          paySelectedOrders('sumup_terminal' as PaymentMethod);
        }}
      />
    </>
  );
}
