'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, EyeOff, ImageOff, Link2, Loader2, RotateCcw, Upload, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { PHOTO_SLOTS, type PhotoSlotDef } from '@/lib/photos';
import type { AdminPhotosPayload, PhotoSettings } from '@/lib/types';
import { useRemote } from '@/hooks/useRemote';
import { useToast } from './Toast';

const MAX_MB = 20;
// Hosts like Vercel reject request bodies over ~4.5 MB, so photos are shrunk in the browser before upload.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Downscale to 2000px and re-encode as WebP in the browser. Phone photos (5 to 10 MB) become a few hundred KB. */
async function shrinkImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.\w+$/, '')}.webp`, { type: 'image/webp' });
  } catch {
    return file; // e.g. a format this browser can't decode: let the server try
  }
}

type Staged = { kind: 'file'; file: File; preview: string } | { kind: 'url'; url: string; preview: string };

function SlotCard({ def, photo, resolved, onUpdated }: { def: PhotoSlotDef; photo: PhotoSettings; resolved: string | null; onUpdated: (p: AdminPhotosPayload) => void }) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<Staged | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [alt, setAlt] = useState(photo.alt);
  const [caption, setCaption] = useState(photo.caption);
  const [focus, setFocus] = useState({ x: photo.focusX, y: photo.focusY });
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  // Keep local fields in sync when the saved settings change (after save / reset).
  useEffect(() => {
    setAlt(photo.alt);
    setCaption(photo.caption);
    setFocus({ x: photo.focusX, y: photo.focusY });
  }, [photo.alt, photo.caption, photo.focusX, photo.focusY]);

  useEffect(() => setImgFailed(false), [resolved, staged]);

  // Free the temporary preview URL for a dropped file.
  useEffect(() => {
    return () => {
      if (staged?.kind === 'file') URL.revokeObjectURL(staged.preview);
    };
  }, [staged]);

  const dirty = alt !== photo.alt || caption !== photo.caption || focus.x !== photo.focusX || focus.y !== photo.focusY;
  const shownSrc = staged?.preview ?? resolved;
  const isGallery = def.id.startsWith('gallery-');

  function stageFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('That file is not an image. Use a JPG, PNG, WebP or AVIF.');
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`That photo is over ${MAX_MB} MB. Try a smaller one.`);
    setStaged({ kind: 'file', file, preview: URL.createObjectURL(file) });
  }

  function stageUrl() {
    const url = urlInput.trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) return toast.error('Paste a full web address that starts with https://');
    setStaged({ kind: 'url', url, preview: url });
  }

  async function call(fn: () => Promise<AdminPhotosPayload>, message: string) {
    setBusy(true);
    try {
      onUpdated(await fn());
      toast.success(message);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const meta = { alt, caption, focusX: focus.x, focusY: focus.y };
  const put = (patch: Record<string, unknown>) => api<AdminPhotosPayload>('/api/photos', { method: 'PUT', json: { slot: def.id, ...patch } });

  async function savePhoto() {
    if (!staged) return;
    const ok = await call(async () => {
      if (staged.kind === 'file') {
        const toSend = await shrinkImage(staged.file);
        if (toSend.size > MAX_UPLOAD_BYTES) {
          throw new Error('That photo is too large to upload. Export it as a JPG or PNG and try again.');
        }
        const form = new FormData();
        form.set('slot', def.id);
        form.set('file', toSend);
        await api<AdminPhotosPayload>('/api/photos/upload', { method: 'POST', body: form });
        return put(meta);
      }
      return put({ src: staged.url, ...meta });
    }, `${def.label} updated. It's live on the site.`);
    if (ok) {
      setStaged(null);
      setUrlInput('');
    }
  }

  const saveDetails = () => call(() => put(meta), 'Saved.');
  const reset = () => call(() => put({ src: null, hidden: false }), `${def.label} is back to the file at ${def.filePath}.`);
  const setHidden = (hidden: boolean) => call(() => put({ hidden }), hidden ? 'Hidden from the site.' : 'Showing on the site again.');

  async function copyPath() {
    try {
      await navigator.clipboard.writeText(def.filePath);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.info(def.filePath);
    }
  }

  return (
    <article className="flex flex-col rounded-2xl border border-sand-300 bg-white p-4 sm:p-5" data-testid={`slot-${def.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="display-md text-xl">{def.label}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">{def.hint}</p>
        </div>
        {photo.hidden && <span className="shrink-0 rounded-full bg-sand-200 px-2.5 py-1 text-xs font-bold text-ink-mute">Hidden</span>}
      </div>

      {/* Drop zone + preview */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          stageFile(e.dataTransfer.files?.[0]);
        }}
        className={cn('relative mt-4 overflow-hidden rounded-xl border-2 border-dashed bg-sand-100 transition-colors', def.aspect, dragging ? 'border-sunset bg-sunset-50' : 'border-sand-400')}
      >
        {shownSrc && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shownSrc} alt="" onError={() => setImgFailed(true)} className={cn('h-full w-full object-cover', photo.hidden && !staged && 'opacity-40 grayscale')} style={{ objectPosition: `${focus.x}% ${focus.y}%` }} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-ink-mute">
            <ImageOff className="h-8 w-8" aria-hidden />
            <p className="font-semibold">{isGallery ? 'Empty slot' : 'No photo yet'}</p>
            <p className="text-sm">Drop a photo here, or use the buttons below.</p>
          </div>
        )}
        {staged && <span className="absolute left-2 top-2 rounded-full bg-sunset px-2.5 py-1 text-xs font-bold text-river-950">Preview, not saved yet</span>}
        {dragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-sunset/25 text-lg font-bold text-river-900">Drop to preview</div>
        )}
      </div>

      {/* Replace controls */}
      <div className="mt-3 flex flex-wrap gap-2">
        <input ref={fileInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => { stageFile(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" onClick={() => fileInput.current?.click()} className="btn-dark btn-sm">
          <Upload className="h-4 w-4" aria-hidden /> {resolved ? 'Replace photo' : 'Upload photo'}
        </button>
        {(photo.src || photo.hidden) && (
          <button type="button" disabled={busy} onClick={() => void reset()} className="btn-outline btn-sm">
            <RotateCcw className="h-4 w-4" aria-hidden /> Use default file
          </button>
        )}
        {isGallery && (
          <button type="button" disabled={busy} onClick={() => void setHidden(!photo.hidden)} className="btn-outline btn-sm">
            <EyeOff className="h-4 w-4" aria-hidden /> {photo.hidden ? 'Show on site' : 'Hide from site'}
          </button>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" aria-hidden />
          <input
            type="url"
            inputMode="url"
            aria-label={`${def.label}: paste an image web address`}
            placeholder="Or paste an image URL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), stageUrl())}
            className="field !min-h-[44px] !py-2 pl-9"
          />
        </div>
        <button type="button" disabled={!urlInput.trim()} onClick={stageUrl} className="btn-outline btn-sm shrink-0">
          Preview
        </button>
      </div>

      {staged && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-sunset-50 p-3">
          <p className="mr-auto text-sm font-semibold text-sunset-700">{staged.kind === 'file' ? staged.file.name : 'Image from web address'}</p>
          <button type="button" disabled={busy} onClick={() => void savePhoto()} className="btn-primary btn-sm">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />} Save to site
          </button>
          <button type="button" disabled={busy} onClick={() => setStaged(null)} className="btn-outline btn-sm">
            <X className="h-4 w-4" aria-hidden /> Cancel
          </button>
        </div>
      )}

      {/* Framing + text */}
      <div className="mt-4 grid gap-3 border-t border-sand-200 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold">
            Focus left to right
            <input type="range" min={0} max={100} value={focus.x} onChange={(e) => setFocus((f) => ({ ...f, x: +e.target.value }))} className="mt-1 h-8 w-full accent-[#1B3B2B]" />
          </label>
          <label className="text-sm font-semibold">
            Focus top to bottom
            <input type="range" min={0} max={100} value={focus.y} onChange={(e) => setFocus((f) => ({ ...f, y: +e.target.value }))} className="mt-1 h-8 w-full accent-[#1B3B2B]" />
          </label>
        </div>
        {isGallery && (
          <div>
            <label htmlFor={`cap-${def.id}`} className="label">
              Caption
            </label>
            <input id={`cap-${def.id}`} value={caption} maxLength={120} onChange={(e) => setCaption(e.target.value)} className="field !min-h-[44px] !py-2" />
          </div>
        )}
        <div>
          <label htmlFor={`alt-${def.id}`} className="label">
            Description for screen readers
          </label>
          <input id={`alt-${def.id}`} value={alt} maxLength={240} onChange={(e) => setAlt(e.target.value)} className="field !min-h-[44px] !py-2" />
        </div>
        <button type="button" disabled={!dirty || busy} onClick={() => void saveDetails()} className="btn-outline btn-sm self-start">
          Save framing and text
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-sand-100 px-3 py-2 text-sm">
        <p className="min-w-0 text-ink-soft">
          <span className="block text-xs font-semibold text-ink-mute">Drop-in file path</span>
          <code className="break-all font-semibold">{def.filePath}</code>
        </p>
        <button type="button" onClick={() => void copyPath()} aria-label={`Copy path ${def.filePath}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-sand-200">
          {copied ? <Check className="h-4 w-4 text-river" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </article>
  );
}

export function PhotoManager() {
  const { data, error, setData } = useRemote<AdminPhotosPayload>('/api/photos');
  const main = PHOTO_SLOTS.filter((s) => !s.id.startsWith('gallery-'));
  const gallery = PHOTO_SLOTS.filter((s) => s.id.startsWith('gallery-'));

  return (
    <div>
      <div className="max-w-3xl">
        <h2 className="display-md text-3xl">Photos</h2>
        <p className="prose-serif mt-2 text-lg text-ink-soft">
          Upload, drop or paste a link to swap any photo. Changes go live the moment you save, with no code and no rebuild. You can also copy files
          straight into <code className="font-sans font-semibold">public/images/boaz/</code> using the file names shown on each card.
        </p>
      </div>

      {error && !data && <p role="alert" className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 font-medium text-red-800">{error}</p>}
      {!data && !error && <div className="mt-6 h-64 animate-pulse rounded-2xl bg-sand-200" />}

      {data && (
        <>
          <h3 className="display-md mt-8 text-2xl">Top of the site</h3>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {main.map((def) => (
              <SlotCard key={def.id} def={def} photo={data.photos[def.id]} resolved={data.resolved[def.id]} onUpdated={setData} />
            ))}
          </div>

          <h3 className="display-md mt-10 text-2xl">Summer catch gallery</h3>
          <p className="mt-1 text-ink-soft">Six slots. Empty or hidden slots simply don’t appear on the site.</p>
          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {gallery.map((def) => (
              <SlotCard key={def.id} def={def} photo={data.photos[def.id]} resolved={data.resolved[def.id]} onUpdated={setData} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
