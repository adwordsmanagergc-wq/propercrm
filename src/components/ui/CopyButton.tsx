'use client';

import { useState } from 'react';
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/Button';

export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied',
  variant = 'secondary',
  size = 'md',
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers, and Safari without a user gesture. Fall back to a
      // hidden textarea so the button still does something useful.
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <Button type="button" variant={copied ? 'success' : variant} size={size} onClick={copy}>
      {copied ? copiedLabel : label}
    </Button>
  );
}
