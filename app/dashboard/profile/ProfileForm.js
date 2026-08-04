"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabaseClient";

const COLOR_PRESETS = ["#CB181D", "#1D4ED8", "#047857", "#B45309", "#6D28D9", "#0F172A"];

export default function ProfileForm({ currentBusinessName, currentLogoUrl, currentAccentColor }) {
  const [businessName, setBusinessName] = useState(currentBusinessName);
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
  const [file, setFile] = useState(null);
  const [accentColor, setAccentColor] = useState(currentAccentColor || "#CB181D");
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const router = useRouter();
  const supabase = createClient();

  async function handleSave(e) {
    e.preventDefault();
    setStatus("saving");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let logoPath = null;

      if (file) {
        const ext = file.name.split(".").pop();
        logoPath = `${user.id}/logo-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("client-logos")
          .upload(logoPath, file, { upsert: true });

        if (uploadError) throw uploadError;
      }

      const updates = { business_name: businessName, accent_color: accentColor };
      if (logoPath) updates.logo_path = logoPath;

      const { data: existing } = await supabase
        .from("clients")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      let saveError;
      if (existing) {
        const { error } = await supabase.from("clients").update(updates).eq("auth_user_id", user.id);
        saveError = error;
      } else {
        const { error } = await supabase.from("clients").insert({
          auth_user_id: user.id,
          email: user.email,
          client_type: "project",
          ...updates,
        });
        saveError = error;
      }

      if (saveError) throw saveError;

      if (logoPath) {
        const { data } = supabase.storage.from("client-logos").getPublicUrl(logoPath);
        setLogoUrl(data?.publicUrl ?? null);
      }

      setStatus("saved");
      setFile(null);
      router.refresh();
    } catch (err) {
      console.error("Profile save failed:", err);
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      <div>
        <label className="text-xs font-medium text-neutral-500 mb-1 block">Business name</label>
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Your business name"
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)]"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-500 mb-1 block">Logo</label>
        {logoUrl && (
          <img src={logoUrl} alt="Your logo" className="h-16 w-16 object-contain border border-neutral-200 rounded mb-2" />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <p className="text-xs text-neutral-400 mt-1">PNG, JPG, or SVG. Used to help us stay on-brand for your flyers.</p>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-500 mb-1 block">Portal color</label>
        <div className="flex items-center gap-2 flex-wrap">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setAccentColor(c)}
              aria-label={`Use ${c}`}
              className="w-7 h-7 rounded-full border-2"
              style={{
                backgroundColor: c,
                borderColor: accentColor === c ? "#111" : "transparent",
              }}
            />
          ))}
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="w-7 h-7 rounded-full border border-neutral-300 p-0 overflow-hidden"
            aria-label="Custom color"
          />
        </div>
        <p className="text-xs text-neutral-400 mt-1">Used for buttons and highlights across your portal.</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="bg-[var(--brand-color)] text-white text-sm font-medium rounded px-4 py-2 disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        {status === "saved" && <span className="text-xs text-green-700">Saved!</span>}
        {status === "error" && <span className="text-xs text-red-600">Something went wrong — try again.</span>}
      </div>
    </form>
  );
}