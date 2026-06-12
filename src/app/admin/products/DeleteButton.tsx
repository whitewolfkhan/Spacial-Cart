"use client";

import { useFormStatus } from "react-dom";

/** Submit button that shows a pending state while the delete action runs. */
export default function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-sm text-red-200 transition hover:bg-red-400/20 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
