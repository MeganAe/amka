"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastState = {
  message: string;
  tone: "success" | "error" | "info";
};

export function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  if (!toast) return null;

  return (
    <div
      className={cn(
        "fixed right-5 top-5 z-[80] flex min-w-72 items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm font-semibold shadow-card",
        toast.tone === "success" && "border-success/20 bg-emerald-50 text-emerald-800",
        toast.tone === "error" && "border-error/20 bg-red-50 text-error",
        toast.tone === "info" && "border-primary/20 bg-indigo-50 text-primary"
      )}
    >
      <span>{toast.message}</span>
      <button aria-label="Fermer" onClick={onClose} className="rounded-full p-1 hover:bg-black/5">
        <X size={16} />
      </button>
    </div>
  );
}
