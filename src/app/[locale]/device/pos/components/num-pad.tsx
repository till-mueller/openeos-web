'use client';

import { Delete } from '@untitledui/icons';
import { cx } from '@/utils/cx';

interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  maxLength?: number;
  className?: string;
}

/** Uses --pos-* tokens (not the generic dashboard bg-primary/text-primary
 *  classes) so it always matches the POS kiosk's own light theme instead of
 *  following the device's system dark-mode setting, which previously left
 *  the digits nearly unreadable (dark text on a dark button background). */
export function NumPad({ value, onChange, onSubmit, maxLength = 10, className }: NumPadProps) {
  const handlePress = (digit: string) => {
    if (value.length < maxLength) {
      onChange(value + digit);
    }
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  const keyStyle: React.CSSProperties = {
    height: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--pos-surface)',
    border: '1px solid var(--pos-line)',
    borderRadius: 'var(--pos-r-md)',
    fontSize: 22,
    fontWeight: 600,
    color: 'var(--pos-ink)',
    cursor: 'pointer',
    transition: 'background .12s, border-color .12s',
  };

  const auxStyle: React.CSSProperties = {
    ...keyStyle,
    background: 'var(--pos-surface-2)',
    color: 'var(--pos-ink-2)',
    fontSize: 17,
  };

  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', 'DEL'],
  ];

  return (
    <div className={cx('grid grid-cols-3 gap-2', className)}>
      {buttons.flat().map((btn) => {
        if (btn === 'DEL') {
          return (
            <button key={btn} type="button" onClick={handleBackspace} style={auxStyle} aria-label="Löschen">
              <Delete className="h-6 w-6" />
            </button>
          );
        }

        if (btn === 'C') {
          return (
            <button key={btn} type="button" onClick={handleClear} style={auxStyle}>
              C
            </button>
          );
        }

        return (
          <button key={btn} type="button" onClick={() => handlePress(btn)} style={keyStyle}>
            {btn}
          </button>
        );
      })}
    </div>
  );
}
