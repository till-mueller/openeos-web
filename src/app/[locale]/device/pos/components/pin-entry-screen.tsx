'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Lock01, LogOut01 } from '@untitledui/icons';
import { Button } from '@/components/ui/buttons/button';
import { Logo } from '@/components/foundations/logo/logo';
import { NumPad } from './num-pad';
import { deviceApi } from '@/lib/api-client';
import { cx } from '@/utils/cx';

interface PinEntryScreenProps {
  deviceName: string;
  onSuccess: (user: { userId: string; firstName: string; lastName: string }) => void;
  onLogout: () => void;
}

const MAX_PIN_LENGTH = 6;
const MIN_PIN_LENGTH = 4;

export function PinEntryScreen({ deviceName, onSuccess, onLogout }: PinEntryScreenProps) {
  const t = useTranslations('pos');
  const tCommon = useTranslations('common');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [shake, setShake] = useState(false);

  const handleVerify = useCallback(async (pinValue: string) => {
    if (pinValue.length < MIN_PIN_LENGTH || isVerifying) return;

    setIsVerifying(true);
    setError(null);

    try {
      const response = await deviceApi.verifyPin(pinValue);
      const { userId, firstName, lastName } = response.data;
      onSuccess({ userId, firstName, lastName });
    } catch {
      setError(t('pin.error'));
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  }, [isVerifying, onSuccess, t]);

  const handlePinChange = useCallback((value: string) => {
    setPin(value);
    setError(null);

    // Auto-submit when max length reached
    if (value.length === MAX_PIN_LENGTH) {
      handleVerify(value);
    }
  }, [handleVerify]);

  const handleSubmit = useCallback(() => {
    handleVerify(pin);
  }, [handleVerify, pin]);

  return (
    <div className="pos-root" style={{ display: 'flex', height: '100dvh', flexDirection: 'column', background: 'var(--pos-surface-2)' }}>
      {/* Header */}
      <header
        style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', background: 'var(--pos-surface)', borderBottom: '1px solid var(--pos-line)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo width={100} height={25} />
          <div style={{ height: 20, width: 1, background: 'var(--pos-line)' }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--pos-ink)' }}>{deviceName}</span>
        </div>
        <Button color="tertiary" size="sm" onClick={onLogout}>
          <LogOut01 className="h-4 w-4" />
        </Button>
      </header>

      {/* PIN Entry */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{
            background: 'var(--pos-surface)', borderRadius: 'var(--pos-r-lg)',
            border: '1px solid var(--pos-line)', boxShadow: 'var(--pos-sh-2)',
            padding: 24, textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 999,
              background: 'var(--pos-accent-soft)', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock01 className="h-7 w-7" style={{ color: 'var(--pos-accent)' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--pos-ink)', marginBottom: 4 }}>
              {t('pin.title')}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--pos-ink-3)', marginBottom: 16 }}>
              {t('pin.description')}
            </p>

            {/* PIN Dots */}
            <div
              className={cx('mb-4', shake && 'animate-shake')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                borderRadius: 'var(--pos-r-md)', border: '1px solid var(--pos-line)',
                background: 'var(--pos-surface-2)', padding: '16px 0',
              }}
            >
              {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 14, width: 14, borderRadius: 999,
                    background: i < pin.length ? 'var(--pos-accent)' : 'var(--pos-line-strong)',
                    transition: 'background .12s',
                  }}
                />
              ))}
            </div>

            {/* NumPad */}
            <NumPad
              value={pin}
              onChange={handlePinChange}
              maxLength={MAX_PIN_LENGTH}
              className="mb-4"
            />

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              className="w-full"
              size="lg"
              isDisabled={pin.length < MIN_PIN_LENGTH || isVerifying}
              isLoading={isVerifying}
            >
              {isVerifying ? t('pin.verifying') : tCommon('confirm')}
            </Button>

            {/* Error */}
            {error && (
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--pos-error, #dc2626)' }}>{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
