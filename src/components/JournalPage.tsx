import { forwardRef } from "react";
import type { ClientJournalEntry } from "@/lib/types";

interface JournalPageProps {
  entry: ClientJournalEntry;
  authorLabel: string;
}

export const JournalPage = forwardRef<HTMLDivElement, JournalPageProps>(
  function JournalPage({ entry, authorLabel }, ref) {
    return (
      <div
        ref={ref}
        className="flex h-full w-full flex-col overflow-hidden bg-paper p-6"
      >
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft/60">
          {new Date(entry.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          {" — "}
          {authorLabel}
        </p>
        <p className="mt-3 flex-1 overflow-y-auto whitespace-pre-wrap font-display text-base leading-relaxed text-ink">
          {entry.content}
        </p>
        {entry.attachment_url && entry.attachment_type?.startsWith("image/") && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.attachment_url}
            alt="Attached photo"
            className="mt-3 max-h-32 w-full shrink-0 rounded-sm object-cover ring-1 ring-black/10"
          />
        )}
        {entry.attachment_url && entry.attachment_type === "application/pdf" && (
          <a
            href={entry.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 shrink-0 font-sans text-xs text-ink-soft underline decoration-ink-soft/40 underline-offset-2 hover:text-ink"
          >
            View attached PDF
          </a>
        )}
      </div>
    );
  }
);

interface JournalCoverProps {
  title: string;
  subtitle?: string;
}

export const JournalCover = forwardRef<HTMLDivElement, JournalCoverProps>(
  function JournalCover({ title, subtitle }, ref) {
    return (
      <div
        ref={ref}
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-wax p-6 text-center"
      >
        <p className="font-display text-2xl italic text-paper">{title}</p>
        {subtitle && (
          <p className="font-sans text-xs text-paper/70">{subtitle}</p>
        )}
      </div>
    );
  }
);
