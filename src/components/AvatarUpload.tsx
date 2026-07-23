"use client";

import { useRef, useState } from "react";
import { validateAvatar } from "@/lib/validation";

interface AvatarUploadProps {
  previewUrl: string | null; // existing avatar URL, shown until a new file is chosen
  onChange: (file: File | null, error: string | null) => void;
}

export function AvatarUpload({ previewUrl, onChange }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      onChange(null, null);
      setLocalPreview(null);
      return;
    }
    const result = validateAvatar(file);
    if (!result.ok) {
      onChange(null, result.error ?? "That image can't be used.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setLocalPreview(URL.createObjectURL(file));
    onChange(file, null);
  }

  const displaySrc = localPreview ?? previewUrl;

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper-shade ring-1 ring-black/10">
        {displaySrc ? (
          // Local object URLs and short-lived signed URLs both change
          // often enough that next/image's remote cache isn't a good
          // fit here — a plain <img> is the right call.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displaySrc}
            alt="Profile"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-display text-2xl text-ink-soft/50">?</span>
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleSelect}
          className="hidden"
          id="avatar-input"
        />
        <label
          htmlFor="avatar-input"
          className="cursor-pointer rounded-sm border border-ink/15 px-3 py-1.5 font-sans text-sm text-ink-soft transition-colors hover:border-wax hover:text-wax"
        >
          Change photo
        </label>
      </div>
    </div>
  );
}
