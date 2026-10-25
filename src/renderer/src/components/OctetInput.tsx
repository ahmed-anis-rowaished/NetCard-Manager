import React, { useRef } from 'react';

interface OctetInputProps {
  value: [string, string, string, string];
  onChange: (val: [string, string, string, string]) => void;
  disabled?: boolean;
}

export const OctetInput: React.FC<OctetInputProps> = ({ value, onChange, disabled }) => {
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleOctetChange = (index: number, val: string) => {
    // Only digits
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 3) return;

    // Validate 0-255 if not empty
    if (cleaned !== '' && parseInt(cleaned, 10) > 255) return;

    const newValues: [string, string, string, string] = [...value];
    newValues[index] = cleaned;
    onChange(newValues);

    // Auto advance if 3 digits or max reached
    if (cleaned.length === 3 && index < 3) {
      inputRefs[index + 1].current?.focus();
      inputRefs[index + 1].current?.select();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '.' || e.key === 'Decimal') {
      e.preventDefault();
      if (index < 3) {
        inputRefs[index + 1].current?.focus();
        inputRefs[index + 1].current?.select();
      }
    } else if (e.key === 'Backspace' && value[index] === '' && index > 0) {
      e.preventDefault();
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowLeft' && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').trim();
    const parts = text.split('.');
    if (parts.length === 4) {
      const valid = parts.map((p) => {
        const num = parseInt(p.replace(/\D/g, ''), 10);
        return isNaN(num) ? '0' : Math.min(255, Math.max(0, num)).toString();
      }) as [string, string, string, string];
      onChange(valid);
      inputRefs[3].current?.focus();
    }
  };

  return (
    <div
      dir="ltr"
      className="flex items-center justify-between bg-space-darkest/70 border border-space-border hover:border-space-accent focus-within:border-space-accent focus-within:ring-2 focus-within:ring-space-accent/40 rounded-lg px-3 py-1.5 transition-all text-white font-mono"
      onPaste={handlePaste}
    >
      {value.map((octet, idx) => (
        <React.Fragment key={idx}>
          <input
            ref={inputRefs[idx]}
            type="text"
            inputMode="numeric"
            maxLength={3}
            disabled={disabled}
            value={octet}
            onChange={(e) => handleOctetChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            className="w-12 text-center bg-transparent focus:outline-none text-space-cyan font-bold text-base tracking-wider disabled:opacity-50"
            placeholder={idx === 0 ? '192' : idx === 1 ? '168' : idx === 2 ? '88' : '1'}
          />
          {idx < 3 && <span className="text-space-accent font-black select-none text-lg">.</span>}
        </React.Fragment>
      ))}
    </div>
  );
};
