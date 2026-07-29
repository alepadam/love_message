"use client";

import { useEffect, useState } from "react";

interface PairingCodeDisplayProps {
  code: string;
  expiresAt: string;
  onRegenerate: () => void;
  regenerating: boolean;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function PairingCodeDisplay({
  code,
  expiresAt,
  onRegenerate,
  regenerating,
}: PairingCodeDisplayProps) {
  const [remainingMs, setRemainingMs] = useState(() =>
    new Date(expiresAt).getTime() - Date.now()
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemainingMs(new Date(expiresAt).getTime() - Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  const expired = remainingMs <= 0;

  async function handleCopy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copy silently failed — the code is still visible to copy by hand.
    }
  }

  if (expired) {
    return (
      <div className="w-full max-w-xs rounded-sm bg-paper-shade p-4 text-center ring-1 ring-black/5">
        <p className="font-sans text-sm text-ink-soft">This code has expired.</p>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="mt-2 rounded-sm border border-ink/15 px-3 py-1.5 font-sans text-sm text-ink-soft transition-colors hover:border-wax hover:text-wax disabled:cursor-not-allowed disabled:opacity-50"
        >
          {regenerating ? "Generating…" : "Get a new code"}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xs rounded-sm bg-paper-shade p-4 text-center ring-1 ring-black/5">
      <p className="font-mono text-2xl tracking-[0.3em] text-ink">
        {code.slice(0, 3)} {code.slice(3)}
      </p>
      <p className="mt-1 font-sans text-xs text-ink-soft/70">
        Expires in {formatRemaining(remainingMs)}
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-2 rounded-sm border border-ink/15 px-3 py-1.5 font-sans text-sm text-ink-soft transition-colors hover:border-wax hover:text-wax"
      >
        {copied ? "Copied" : "Copy code"}
      </button>
    </div>
  );
}
