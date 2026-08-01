"use client";

import { useState } from "react";
import { AttachmentUpload } from "@/components/AttachmentUpload";
import { MAX_MESSAGE_LENGTH } from "@/lib/validation";
import type { Direction } from "@/lib/types";

interface MessageComposerProps {
  slug: string;
  direction: Direction;
  initialContent: string;
  onSent: () => void;
}

export function MessageComposer({
  slug,
  direction,
  initialContent,
  onSent,
}: MessageComposerProps) {
  const [content, setContent] = useState(initialContent);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleSend() {
    if (content.trim().length === 0) {
      setSendError("Write something before sending.");
      return;
    }
    setSending(true);
    setSendError(null);

    try {
      let attachmentPath: string | null = null;
      let attachmentType: string | null = null;

      if (file) {
        const formData = new FormData();
        formData.set("slug", slug);
        formData.set("file", file);
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadBody = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadBody.error ?? "Could not upload the attachment.");
        }
        attachmentPath = uploadBody.path;
        attachmentType = uploadBody.type;
      }

      const messageResponse = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          direction,
          content,
          attachmentPath,
          attachmentType,
        }),
      });
      const messageBody = await messageResponse.json();
      if (!messageResponse.ok) {
        throw new Error(messageBody.error ?? "Could not send the message.");
      }

      setFile(null);
      onSent();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  const remaining = MAX_MESSAGE_LENGTH - content.length;

  return (
    <div className="rounded-sm bg-paper p-6 shadow-md ring-1 ring-black/5 sm:p-8">
      <h2 className="mb-3 font-display text-lg text-ink">Your letter</h2>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        maxLength={MAX_MESSAGE_LENGTH}
        rows={6}
        placeholder="Write what you want them to open to..."
        className="w-full resize-none rounded-sm border border-ink/10 bg-white/40 p-4 font-display text-lg text-ink placeholder:text-ink-soft/50 focus:border-wax focus:outline-none"
      />
      <div className="mt-1 text-right font-mono text-xs text-ink-soft/60">
        {remaining} characters left
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <AttachmentUpload
          file={file}
          onChange={(selected, error) => {
            setFile(selected);
            setFileError(error);
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="rounded-sm bg-wax px-5 py-2 font-sans text-sm font-medium text-paper transition-colors hover:bg-wax-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending…" : "Seal and send"}
        </button>
      </div>

      {fileError && (
        <p className="mt-2 font-sans text-sm text-wax">{fileError}</p>
      )}
      {sendError && (
        <p className="mt-2 font-sans text-sm text-wax">{sendError}</p>
      )}
    </div>
  );
}
