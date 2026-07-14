"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email"); // "email" | "code"
  const [status, setStatus] = useState("idle"); // idle | sending | error
  const router = useRouter();
  const supabase = createClient();

  async function handleSendCode(e) {
    e.preventDefault();
    setStatus("sending");

    // No emailRedirectTo — this sends a one-time code instead of a link.
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setStatus("error");
    } else {
      setStatus("idle");
      setStep("code");
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setStatus("sending");

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setStatus("error");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-6 h-6 rounded-md bg-brand-dark" />
          <span className="text-sm font-medium">Flow Studio</span>
        </div>

        <h1 className="text-xl font-medium mb-2">Client portal</h1>

        {step === "email" ? (
          <>
            <p className="text-sm text-neutral-500 mb-6">
              Enter your email and we'll send you a one-time code.
            </p>
            <form onSubmit={handleSendCode} className="flex flex-col gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="bg-brand-dark text-white text-sm font-medium rounded px-3 py-2 disabled:opacity-60"
              >
                {status === "sending" ? "Sending code…" : "Send code"}
              </button>
              {status === "error" && (
                <p className="text-sm text-red-600">
                  Couldn't send a code. Try again.
                </p>
              )}
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-500 mb-6">
              Enter the one-time code sent to {email}.
            </p>
            <form onSubmit={handleVerifyCode} className="flex flex-col gap-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="12345678"
                maxLength={8}
                className="border border-neutral-300 rounded px-3 py-2 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="bg-brand-dark text-white text-sm font-medium rounded px-3 py-2 disabled:opacity-60"
              >
                {status === "sending" ? "Verifying…" : "Verify & sign in"}
              </button>
              {status === "error" && (
                <p className="text-sm text-red-600">
                  That code didn't work. Check it and try again.
                </p>
              )}
              <button
                type="button"
                onClick={() => setStep("email")}
                className="text-xs text-neutral-400 mt-1"
              >
                Use a different email
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}