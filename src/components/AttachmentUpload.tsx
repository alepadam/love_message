"use client";

import { useRef } from "react";
import { validateAttachment } from "@/lib/validation";

interface AttachmentUploadProps {
  file: File | null;
  onChange: (file: File | null, error: string | null) => void;
}

export function AttachmentUpload({ file, onChange }: AttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) {
      onChange(null, null);
      return;
    }
    const result = validateAttachment(selected);
    if (!result.ok) {
      onChange(null, result.error ?? "That file can't be attached.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    onChange(selected, null);
  }

  function handleRemove() {
    onChange(null, null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
        id="attachment-input"
      />
      <label
        htmlFor="attachment-input"
        className="cursor-pointer rounded-sm border border-ink/15 px-3 py-1.5 font-sans text-sm text-ink-soft transition-colors hover:border-wax hover:text-wax"
      >
        {file ? "Change attachment" : "Attach a photo or PDF"}
      </label>
      {file && (
        <span className="flex items-center gap-2 font-sans text-sm text-ink-soft">
          {file.name}
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove attachment"
            className="text-ink-soft/60 hover:text-wax"
          >
            ×
          </button>
        </span>
      )}
    </div>
  );
}
