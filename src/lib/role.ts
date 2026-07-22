export type Role = "a" | "b";

// The shared link has no login, so each device just remembers locally
// which of the two people is using it. This is a convenience label,
// not a security boundary — access control is the slug itself.
function storageKey(slug: string): string {
  return `sealed:role:${slug}`;
}

export function getStoredRole(slug: string): Role | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(storageKey(slug));
  return value === "a" || value === "b" ? value : null;
}

export function setStoredRole(slug: string, role: Role): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(slug), role);
}

export function outgoingDirection(role: Role): "a_to_b" | "b_to_a" {
  return role === "a" ? "a_to_b" : "b_to_a";
}

export function incomingDirection(role: Role): "a_to_b" | "b_to_a" {
  return role === "a" ? "b_to_a" : "a_to_b";
}
