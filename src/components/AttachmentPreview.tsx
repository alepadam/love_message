interface AttachmentPreviewProps {
  url: string;
  type: string;
}

export function AttachmentPreview({ url, type }: AttachmentPreviewProps) {
  if (type === "application/pdf") {
    return (
      <div className="overflow-hidden rounded-sm ring-1 ring-black/10">
        <embed
          src={url}
          type="application/pdf"
          className="h-96 w-full"
          aria-label="Attached PDF"
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-paper-shade px-4 py-2 font-sans text-sm text-ink-soft underline decoration-ink-soft/40 underline-offset-2 hover:text-ink"
        >
          Open PDF in a new tab
        </a>
      </div>
    );
  }

  // image/jpeg or image/png
  return (
    // Signed URLs are per-view and short-lived, so a plain <img> is
    // used deliberately instead of next/image's remote optimizer cache.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Attached photo"
      className="max-h-96 w-full rounded-sm object-contain ring-1 ring-black/10"
    />
  );
}
