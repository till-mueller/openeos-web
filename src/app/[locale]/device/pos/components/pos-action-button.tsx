'use client';

import type { CSSProperties, ComponentType, ReactNode } from 'react';

interface PosActionButtonProps {
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'solid' | 'outline' | 'ghost';
  fullWidth?: boolean;
}

const variantStyles: Record<NonNullable<PosActionButtonProps['variant']>, CSSProperties> = {
  solid: {
    background: 'var(--pos-accent)',
    color: 'var(--pos-accent-contrast)',
    border: '1px solid transparent',
  },
  outline: {
    background: 'var(--pos-surface)',
    color: 'var(--pos-ink)',
    border: '1px solid var(--pos-line)',
    boxShadow: 'var(--pos-sh-1)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--pos-ink-2)',
    border: '1px solid transparent',
  },
};

const disabledStyle: CSSProperties = {
  background: 'var(--pos-line-strong)',
  color: 'var(--pos-ink-2)',
  border: '1px solid var(--pos-line-strong)',
  boxShadow: 'none',
  cursor: 'not-allowed',
};

/** POS-styled action button — uses --pos-* tokens so it stays legible
 *  regardless of system dark mode, matching PosNumpad/CashPaymentModal. */
export function PosActionButton({ icon: Icon, children, onClick, disabled, variant = 'outline', fullWidth }: PosActionButtonProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        borderRadius: 'var(--pos-r-md)',
        fontSize: 15,
        fontWeight: 600,
        width: fullWidth ? '100%' : undefined,
        transition: 'background .12s, border-color .12s, opacity .12s',
        ...variantStyles[variant],
        ...(disabled ? disabledStyle : {}),
      }}
    >
      {Icon && <Icon className="h-5 w-5" />}
      {children}
    </button>
  );
}
