'use client';

/* eslint-disable @next/next/no-img-element */
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveLogoAction } from '@/app/actions/settings';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Field';
import { compressPhoto } from '@/lib/image';
import { createClient } from '@/lib/supabase/client';

/**
 * Uploads to the public company-logos bucket under the company's own folder;
 * storage policies keep one company out of another's. The file is downscaled
 * first so a 6 MB photo of a van does not end up at the top of every invoice.
 */
export function LogoUpload({ companyId, logoUrl }: { companyId: string; logoUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const prepared = await compressPhoto(file);
      const path = `${companyId}/logo-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(path, prepared.blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const {
        data: { publicUrl },
      } = supabase.storage.from('company-logos').getPublicUrl(path);

      const result = await saveLogoAction({ logoUrl: publicUrl });
      if (!result.ok) throw new Error(result.error);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That logo would not upload');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-3">
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-card border border-grey-200 bg-grey-50">
          {logoUrl ? (
            <img src={logoUrl} alt="Company logo" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-grey-500">No logo</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            id="logo"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <label
            htmlFor="logo"
            className="inline-flex h-11 cursor-pointer items-center rounded-btn border border-blue-200 bg-white px-4 font-semibold text-blue-700 hover:bg-blue-50"
          >
            {busy ? 'Uploading…' : logoUrl ? 'Change logo' : 'Upload logo'}
          </label>

          {logoUrl ? (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                startTransition(async () => {
                  await saveLogoAction({ logoUrl: null });
                  router.refresh();
                })
              }
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-sm text-grey-500">Shown at the top of every invoice you print.</p>
    </div>
  );
}
