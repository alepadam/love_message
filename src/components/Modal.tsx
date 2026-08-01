"use client";

import { useEffect } from "react";

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  // When false, backdrop click and Escape do nothing — used to force
  // the envelope to actually be opened before it can be dismissed.
  closable?: boolean;
}

export function Modal({ onClose, children, closable = true }: ModalProps) {
  useEffect(() => {
    if (!closable) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closable, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-sm"
      onClick={closable ? onClose : undefined}
    >
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
