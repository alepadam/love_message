"use client";

import { Modal } from "@/components/Modal";
import { MessageComposer } from "@/components/MessageComposer";
import type { Direction } from "@/lib/types";

interface ComposeModalProps {
  slug: string;
  direction: Direction;
  initialContent: string;
  onClose: () => void;
  onSent: () => void;
}

export function ComposeModal({
  slug,
  direction,
  initialContent,
  onClose,
  onSent,
}: ComposeModalProps) {
  return (
    <Modal onClose={onClose}>
      <MessageComposer
        slug={slug}
        direction={direction}
        initialContent={initialContent}
        onSent={onSent}
      />
    </Modal>
  );
}
