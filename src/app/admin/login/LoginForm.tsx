"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginResult } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand px-5 py-3 font-semibold transition hover:bg-brand-dark disabled:opacity-50"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export default function LoginForm({ from }: { from: string }) {
  const [state, formAction] = useActionState<LoginResult, FormData>(
    login,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="from" value={from} />
      <label className="block">
        <span className="mb-1 block text-sm text-white/60">Admin password</span>
        <input
          name="password"
          type="password"
          autoFocus
          required
          className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-brand"
          placeholder="••••••••"
        />
      </label>

      {state?.error && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
