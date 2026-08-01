"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Envelope } from "@/components/Envelope";
import type { ClientMessage } from "@/lib/types";

interface EnvelopeModalProps {
  message: ClientMessage;
  onOpened: (messageId: string) => void;
  onClose: () => void;
}

export function EnvelopeModal({ message, onOpened, onClose }: EnvelopeModalProps) {
  const [revealed, setRevealed] = useState(Boolean(message.opened_at));

  function handleOpened(messageId: string) {
    setRevealed(true);
    onOpened(messageId);
  }

  return (
    // Not closable until revealed — the whole point is that opening it
    // is a deliberate click, not something that can be swiped away
    // before it's even been read.
    <Modal onClose={onClose} closable={revealed}>
      <div>
        <Envelope message={message} onOpened={handleOpened} />
        {revealed && (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-sm border border-paper/40 px-4 py-2 font-sans text-sm text-paper transition-colors hover:bg-paper/10"
          >
            Close
          </button>
        )}
      </div>
    </Modal>
  );
}
