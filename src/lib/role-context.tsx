"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { RolePicker } from "@/components/RolePicker";
import { getStoredRole, setStoredRole, type Role } from "@/lib/role";

interface RoleContextValue {
  role: Role;
  slug: string;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}

interface RoleProviderProps {
  slug: string;
  children: React.ReactNode;
}

// Resolves (or asks for) which of the two people this device belongs to,
// once per space, and makes that choice available to every tab via
// context. Renders nothing but the RolePicker until a role is chosen —
// the nav bar and tab content (passed as children by the layout) only
// mount once that's settled.
export function RoleProvider({ slug, children }: RoleProviderProps) {
  const [role, setRole] = useState<Role | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    setRole(getStoredRole(slug));
    setResolved(true);
  }, [slug]);

  function handlePick(picked: Role) {
    setStoredRole(slug, picked);
    setRole(picked);
  }

  if (!resolved) {
    return null;
  }

  if (!role) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <RolePicker onPick={handlePick} />
      </main>
    );
  }

  return (
    <RoleContext.Provider value={{ role, slug }}>
      {children}
    </RoleContext.Provider>
  );
}
