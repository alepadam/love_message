"use client";

import type { Role } from "@/lib/role";

interface RolePickerProps {
  onPick: (role: Role) => void;
}

export function RolePicker({ onPick }: RolePickerProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 rounded-sm bg-paper p-10 text-center shadow-xl ring-1 ring-black/5">
      <h1 className="font-display text-2xl text-ink">Who&apos;s opening this?</h1>
      <p className="font-sans text-sm text-ink-soft">
        This device will remember your answer, so you only need to say it once.
      </p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => onPick("a")}
          className="rounded-sm border border-wax px-6 py-2 font-sans text-sm font-medium text-wax transition-colors hover:bg-wax hover:text-paper"
        >
          I&apos;m the first person
        </button>
        <button
          type="button"
          onClick={() => onPick("b")}
          className="rounded-sm border border-wax px-6 py-2 font-sans text-sm font-medium text-wax transition-colors hover:bg-wax hover:text-paper"
        >
          I&apos;m the second person
        </button>
      </div>
    </div>
  );
}
