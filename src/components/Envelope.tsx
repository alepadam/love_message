"use client";

import { useState } from "react";
import type { ClientMessage } from "@/lib/types";
import { AttachmentPreview } from "@/components/AttachmentPreview";

interface EnvelopeProps {
  message: ClientMessage;
  onOpened: (messageId: string) => void;
}

// A sealed envelope sits closed until tapped. Tapping cracks the wax
// seal and the letter rises out — the one orchestrated animation
// moment in the app (see README "Design direction"). Everything else
// stays quiet and disciplined by comparison.
export function Envelope({ message, onOpened }: EnvelopeProps) {
  const [stage, setStage] = useState<"sealed" | "opening" | "open">(
    message.opened_at ? "open" : "sealed"
  );

  function handleOpen() {
    if (stage !== "sealed") return;
    setStage("opening");
    window.setTimeout(() => setStage("open"), 420);
    onOpened(message.id);
  }

  if (stage !== "open") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Open the sealed letter"
          className="group relative flex h-28 w-28 items-center justify-center rounded-full bg-wax shadow-lg transition-transform hover:scale-[1.03] focus-visible:scale-[1.03]"
        >
          <span
            className={`absolute inset-0 rounded-full bg-wax-light ${
              stage === "opening" ? "animate-seal-crack" : ""
            }`}
          />
          <span className="relative font-display text-3xl italic text-paper">
            &amp;
          </span>
        </button>
        <p className="font-sans text-sm text-ink-soft">
          A letter is waiting. Tap the seal to open it.
        </p>
      </div>
    );
  }

  return (
    <article className="animate-letter-rise rounded-sm bg-paper p-8 shadow-xl ring-1 ring-black/5 sm:p-10">
      <p className="mb-6 whitespace-pre-wrap font-display text-xl leading-relaxed text-ink sm:text-2xl">
        {message.content}
      </p>
      {message.attachment_url && message.attachment_type && (
        <AttachmentPreview
          url={message.attachment_url}
          type={message.attachment_type}
        />
      )}
      <p className="mt-8 font-mono text-xs uppercase tracking-wide text-ink-soft/70">
        {new Date(message.created_at).toLocaleString()}
      </p>
    </article>
  );
}
