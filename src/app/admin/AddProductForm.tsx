"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "./actions";

export default function AddProductForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createProduct(formData);
      if (result.ok) {
        setSuccess(`Added "${result.id}". It's live on the storefront.`);
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-5">
      <Field label="Name">
        <input name="name" required className={inputCls} placeholder="Walnut Side Table" />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          required
          rows={3}
          className={inputCls}
          placeholder="A compact walnut side table with a matte finish."
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Price (USD)">
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            required
            className={inputCls}
            placeholder="299.00"
          />
        </Field>
        <Field label="Accent color">
          <div className="flex items-center gap-2">
            <input
              name="accent"
              defaultValue="#6d5efc"
              pattern="#[0-9a-fA-F]{6}"
              className={inputCls}
            />
          </div>
        </Field>
      </div>

      <div>
        <p className="mb-1 text-sm text-white/60">Dimensions (metres)</p>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Length (depth)">
            <input name="length" type="number" min="0" step="0.01" required className={inputCls} placeholder="0.6" />
          </Field>
          <Field label="Width">
            <input name="width" type="number" min="0" step="0.01" required className={inputCls} placeholder="1.1" />
          </Field>
          <Field label="Height">
            <input name="height" type="number" min="0" step="0.01" required className={inputCls} placeholder="0.45" />
          </Field>
        </div>
      </div>

      <Field label="3D model (.glb)">
        <input
          name="model"
          type="file"
          accept=".glb,model/gltf-binary"
          required
          className="block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
        />
      </Field>

      {error && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand px-5 py-3 font-semibold transition hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Uploading & saving…" : "Add product"}
      </button>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-brand";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-white/60">{label}</span>
      {children}
    </label>
  );
}
