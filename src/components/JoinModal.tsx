"use client";

import { Modal } from "@/components/Modal";
import { RedeemCodeForm } from "@/components/RedeemCodeForm";

interface JoinModalProps {
  onClose: () => void;
}

export function JoinModal({ onClose }: JoinModalProps) {
  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center gap-4 rounded-sm bg-paper p-6 text-center shadow-xl">
        <h2 className="font-display text-lg text-ink">Join with a code</h2>
        <p className="font-sans text-sm text-ink-soft">
          Enter the 6-digit code someone shared with you.
        </p>
        <RedeemCodeForm />
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm border border-ink/15 px-4 py-1.5 font-sans text-sm text-ink-soft transition-colors hover:border-wax hover:text-wax"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
