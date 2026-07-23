"use client";

import { useCallback, useEffect, useState } from "react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { useRole } from "@/lib/role-context";
import { computeAge } from "@/lib/age";
import { MAX_NAME_LENGTH } from "@/lib/validation";
import type { ProfilesResponse } from "@/lib/types";

export function AccountTab() {
  const { role, slug } = useRole();
  const [data, setData] = useState<ProfilesResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/profiles/${slug}`);
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Could not load profiles.");
      }
      setData(body);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Something went wrong.");
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const mine = data?.profiles.find((profile) => profile.role === role) ?? null;
  const theirs = data?.profiles.find((profile) => profile.role !== role) ?? null;

  // Populate the edit form from the loaded profile exactly once — if a
  // background refresh re-ran this on every load, it would overwrite
  // text you're actively typing.
  useEffect(() => {
    if (formInitialized || !data) return;
    if (mine) {
      setName(mine.name ?? "");
      setBirthday(mine.birthday ?? "");
    }
    setFormInitialized(true);
  }, [data, mine, formInitialized]);

  useEffect(() => {
    if (!justSaved) return;
    const timeout = window.setTimeout(() => setJustSaved(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [justSaved]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setJustSaved(false);

    try {
      let avatarPath = mine?.avatar_path ?? null;

      if (avatarFile) {
        const formData = new FormData();
        formData.set("slug", slug);
        formData.set("file", avatarFile);
        formData.set("purpose", "avatar");
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadBody = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadBody.error ?? "Could not upload the photo.");
        }
        avatarPath = uploadBody.path;
      }

      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          role,
          name,
          birthday: birthday || null,
          avatarPath,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Could not save your profile.");
      }

      setAvatarFile(null);
      setJustSaved(true);
      load();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="mx-auto max-w-sm rounded-sm bg-paper p-8 text-center shadow-xl ring-1 ring-black/5">
          <p className="font-display text-lg text-ink">Couldn&apos;t load profiles.</p>
          <p className="mt-2 font-sans text-sm text-ink-soft">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="font-sans text-sm text-ink-soft">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-12">
      <section className="rounded-sm bg-paper p-6 shadow-md ring-1 ring-black/5 sm:p-8">
        <h2 className="mb-4 font-display text-lg text-ink">Your profile</h2>

        <AvatarUpload
          previewUrl={mine?.avatar_url ?? null}
          onChange={(file, error) => {
            setAvatarFile(file);
            setAvatarError(error);
          }}
        />

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label
              htmlFor="profile-name"
              className="mb-1 block font-sans text-xs uppercase tracking-wide text-ink-soft/70"
            >
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder="Your name"
              className="w-full rounded-sm border border-ink/10 bg-white/40 px-3 py-2 font-sans text-ink placeholder:text-ink-soft/50 focus:border-wax focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="profile-birthday"
              className="mb-1 block font-sans text-xs uppercase tracking-wide text-ink-soft/70"
            >
              Birthday
            </label>
            <input
              id="profile-birthday"
              type="date"
              value={birthday}
              onChange={(event) => setBirthday(event.target.value)}
              className="w-full rounded-sm border border-ink/10 bg-white/40 px-3 py-2 font-sans text-ink focus:border-wax focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div>
            {avatarError && (
              <p className="font-sans text-sm text-wax">{avatarError}</p>
            )}
            {saveError && <p className="font-sans text-sm text-wax">{saveError}</p>}
            {justSaved && !saveError && (
              <p className="font-sans text-sm text-wax">Saved ✓</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-sm bg-wax px-5 py-2 font-sans text-sm font-medium text-paper transition-colors hover:bg-wax-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </section>

      <section className="rounded-sm bg-paper-shade p-6 shadow-inner ring-1 ring-black/5 sm:p-8">
        <h2 className="mb-4 font-display text-lg text-ink">Their profile</h2>
        {theirs && theirs.name ? (
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper ring-1 ring-black/10">
              {theirs.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={theirs.avatar_url}
                  alt={theirs.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-display text-xl text-ink-soft/50">
                  {theirs.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-display text-lg text-ink">{theirs.name}</p>
              {theirs.birthday && (
                <p className="font-sans text-sm text-ink-soft">
                  {computeAge(theirs.birthday)} years old
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="font-sans text-sm text-ink-soft">
            They haven&apos;t set up their profile yet.
          </p>
        )}
      </section>
    </div>
  );
}
