"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabaseClient";

const COLOR_PRESETS = ["#CB181D", "#1D4ED8", "#047857", "#B45309", "#6D28D9", "#0F172A"];

export default function OnboardingForm({ businessName: initialName, logoUrl: initialLogoUrl, accentColor: initialColor }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [businessName, setBusinessName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [file, setFile] = useState(null);
  const [accentColor, setAccentColor] = useState(initialColor);
  const [status, setStatus] = useState("idle"); // idle | saving | error
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 6) {
      setStatus("error");
      setErrorMsg("Password needs to be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMsg("Passwords don't match.");
      return;
    }

    setStatus("saving");

    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw new Error(passwordError.message);

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
        if (uploadError) throw new Error(uploadError.message);
      }

      const updates = {
        business_name: businessName,
        accent_color: accentColor,
        onboarding_completed_at: new Date().toISOString(),
      };
      if (logoPath) updates.logo_path = logoPath;

      const { error: saveError } = await supabase
        .from("clients")
        .update(updates)
        .eq("auth_user_id", user.id);
      if (saveError) throw new Error(saveError.message);

      router.push("/dashboard");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong — try again.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <img src="/logo-full.png" alt="Flow Studio" className="w-full h-auto" />
        </div>

        <h1 className="text-xl font-medium mb-1">Finish setting up your account</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Set a password so you can skip the emailed code next time, and make the portal feel like yours.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-neutral-600">Password</p>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password"
              className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
            />
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-neutral-200 pt-5">
            <p className="text-xs font-medium text-neutral-600">Make it yours</p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-500">Business name</label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your business name"
                className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-500">Logo (optional)</label>
              {logoUrl && (
                <img src={logoUrl} alt="Your logo" className="h-14 w-14 object-contain border border-neutral-200 rounded mb-1" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-500">Portal color</label>
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
              <p className="text-xs text-neutral-400">Used for buttons and highlights across your portal.</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={status === "saving"}
            className="bg-brand-dark text-white text-sm font-medium rounded px-3 py-2.5 disabled:opacity-60"
          >
            {status === "saving" ? "Saving…" : "Complete setup"}
          </button>
          {status === "error" && <p className="text-sm text-red-600">{errorMsg}</p>}
        </form>
      </div>
    </main>
  );
}
