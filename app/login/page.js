"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "staff"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("form"); // "form" | "code"
  const [status, setStatus] = useState("idle"); // idle | sending | error
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();
  const supabase = createClient();

  function switchMode(next) {
    setMode(next);
    setStep("form");
    setStatus("idle");
    setErrorMsg("");
    setPassword("");
    setCode("");
  }

  // Sign in with a password (fast path for returning users and staff).
  async function handlePasswordSignIn(e) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      setErrorMsg("Wrong email or password.");
    } else {
      router.push(mode === "staff" ? "/staff" : "/dashboard");
    }
  }

  // Sign up (or "forgot password" sign-in fallback) - send an emailed code.
  async function handleSendCode(e) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setStatus("error");
      setErrorMsg("Couldn't send a code. Try again.");
    } else {
      setStatus("idle");
      setStep("code");
    }
  }

  // Verify the emailed code. New client accounts land on /onboarding
  // automatically (the dashboard gate redirects them there) to set a
  // password and customize their portal — no separate step needed here.
  async function handleVerifyCode(e) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setStatus("error");
      setErrorMsg("That code didn't work. Check it and try again.");
      return;
    }

    router.push(mode === "staff" ? "/staff" : "/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <img src="/logo-full.png" alt="Flow Studio" className="w-full h-auto" />
        </div>

        <h1 className="text-xl font-medium mb-2">Client portal</h1>

        {step === "form" && (
          <div className="flex gap-1 mb-6 border border-neutral-200 rounded p-1 w-fit">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`text-sm px-3 py-1.5 rounded ${
                mode === "signin" ? "bg-brand-dark text-white" : "text-neutral-500"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`text-sm px-3 py-1.5 rounded ${
                mode === "signup" ? "bg-brand-dark text-white" : "text-neutral-500"
              }`}
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={() => switchMode("staff")}
              className={`text-sm px-3 py-1.5 rounded ${
                mode === "staff" ? "bg-brand-dark text-white" : "text-neutral-500"
              }`}
            >
              Staff
            </button>
          </div>
        )}

        {step === "form" && mode === "staff" && (
          <>
            <p className="text-sm text-neutral-500 mb-6">Staff login.</p>
            <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-3">
              <label htmlFor="staff-email" className="sr-only">Email</label>
              <input
                id="staff-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@flowstudiogrfx.com"
                className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
              <label htmlFor="staff-password" className="sr-only">Password</label>
              <input
                id="staff-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="bg-brand-dark text-white text-sm font-medium rounded px-3 py-2 disabled:opacity-60"
              >
                {status === "sending" ? "Signing in…" : "Sign in"}
              </button>
              {status === "error" && <p className="text-sm text-red-600">{errorMsg}</p>}
              <button
                type="button"
                onClick={handleSendCode}
                className="text-xs text-neutral-400 mt-1"
              >
                Forgot password? Email me a code instead
              </button>
            </form>
          </>
        )}

        {step === "form" && mode === "signin" && (
          <>
            <p className="text-sm text-neutral-500 mb-6">Welcome back — sign in with your password.</p>
            <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-3">
              <label htmlFor="signin-email" className="sr-only">Email</label>
              <input
                id="signin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
              <label htmlFor="signin-password" className="sr-only">Password</label>
              <input
                id="signin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="bg-brand-dark text-white text-sm font-medium rounded px-3 py-2 disabled:opacity-60"
              >
                {status === "sending" ? "Signing in…" : "Sign in"}
              </button>
              {status === "error" && <p className="text-sm text-red-600">{errorMsg}</p>}
              <button
                type="button"
                onClick={handleSendCode}
                className="text-xs text-neutral-400 mt-1"
              >
                Forgot password? Email me a code instead
              </button>
            </form>
          </>
        )}

        {step === "form" && mode === "signup" && (
          <>
            <p className="text-sm text-neutral-500 mb-6">
              New here? Enter your email and we'll send you a one-time code to get started.
            </p>
            <form onSubmit={handleSendCode} className="flex flex-col gap-3">
              <label htmlFor="signup-email" className="sr-only">Email</label>
              <input
                id="signup-email"
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
              {status === "error" && <p className="text-sm text-red-600">{errorMsg}</p>}
            </form>
          </>
        )}

        {step === "code" && (
          <>
            <p className="text-sm text-neutral-500 mb-6">
              Enter the one-time code sent to {email}.
            </p>
            <form onSubmit={handleVerifyCode} className="flex flex-col gap-3">
              <label htmlFor="otp-code" className="sr-only">One-time code</label>
              <input
                id="otp-code"
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
                {status === "sending" ? "Verifying…" : "Verify"}
              </button>
              {status === "error" && <p className="text-sm text-red-600">{errorMsg}</p>}
              <button
                type="button"
                onClick={() => setStep("form")}
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