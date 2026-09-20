'use client';

import type { ReactNode } from 'react';
import { XClose } from '@untitledui/icons';
import { cx } from '@/utils/cx';

interface PlainModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 'pos' pins the chrome to the fixed --pos-* palette so it stays legible
   *  regardless of system dark mode -- use for anything opened from the POS
   *  kiosk route, which is meant to never follow dashboard theming. */
  theme?: 'default' | 'pos';
}

const sizes = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
};

/**
 * Drop-in, non-react-aria replacement for DialogModal -- same markup/classes,
 * so it's visually identical, but with none of react-aria's own dismiss
 * machinery (outside-press/escape/blur-within). Use this instead of
 * DialogModal for any dialog whose own content opens a FURTHER overlay (a
 * payment sheet, etc): react-aria's Modal was found to call onClose from
 * somewhere in its own internals when a sibling fixed-position overlay
 * mounted in the same click, even with isDismissable={false} -- confirmed by
 * a captured stack trace pointing into the react-aria-components chunk, not
 * our own code, and neither outside-press nor escape-key nor blur-within
 * (the three documented dismiss paths) should have been reachable with that
 * prop off. Rather than keep chasing which internal path it actually was,
 * this sidesteps the whole conflicting overlay system for these dialogs.
 * No backdrop-click-to-close by design (same reasoning) -- use the X button.
 */
export function PlainModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
  theme = 'default',
}: PlainModalProps) {
  if (!isOpen) return null;

  const isPos = theme === 'pos';

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-dvh w-full items-end justify-center overflow-y-auto bg-overlay/70 px-4 pt-4 pb-[clamp(16px,8vh,64px)] backdrop-blur-[6px] sm:items-center sm:justify-center sm:p-8"
    >
      <div className={cx('max-h-full w-full align-middle', sizes[size], className)}>
        <div className="flex w-full items-center justify-center">
          <div
            className={cx('w-full rounded-xl shadow-xl', !isPos && 'bg-primary border border-secondary')}
            style={isPos ? { background: 'var(--pos-surface)', border: '1px solid var(--pos-line)' } : undefined}
          >
            {/* Header */}
            {(title || description) && (
              <div
                className={cx('flex items-start justify-between gap-4 px-6 py-4', !isPos && 'border-b border-secondary')}
                style={isPos ? { borderBottom: '1px solid var(--pos-line)' } : undefined}
              >
                <div>
                  {title && (
                    <h2
                      className={cx('text-lg font-semibold', !isPos && 'text-primary')}
                      style={isPos ? { color: 'var(--pos-ink)' } : undefined}
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      className={cx('mt-1 text-sm', !isPos && 'text-tertiary')}
                      style={isPos ? { color: 'var(--pos-ink-3)' } : undefined}
                    >
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className={cx(
                    'rounded-lg p-2 transition-colors',
                    !isPos && 'text-secondary hover:bg-secondary hover:text-primary'
                  )}
                  style={isPos ? { color: 'var(--pos-ink-2)' } : undefined}
                  aria-label="Close"
                >
                  <XClose className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Content */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
