"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface TabNavProps {
  slug: string;
}

const TABS = [
  { href: "message", label: "Message" },
  { href: "account", label: "Account" },
  { href: "journal", label: "Journal" },
] as const;

export function TabNav({ slug }: TabNavProps) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-10 border-b border-ink/10 bg-stone/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-center gap-1 px-6 py-3">
        {TABS.map((tab) => {
          const href = `/s/${slug}/${tab.href}`;
          const active = pathname === href;
          return (
            <Link
              key={tab.href}
              href={href}
              className={`rounded-sm px-4 py-1.5 font-sans text-sm transition-colors ${
                active
                  ? "bg-wax text-paper"
                  : "text-ink-soft hover:bg-paper-shade hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
