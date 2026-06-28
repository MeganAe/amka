import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "primary"
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
  tone?: "primary" | "secondary" | "success" | "warning" | "error";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary border-l-primary",
    secondary: "bg-secondary/10 text-secondary border-l-secondary",
    success: "bg-success/10 text-emerald-700 border-l-success",
    warning: "bg-warning/10 text-amber-700 border-l-warning",
    error: "bg-error/10 text-error border-l-error"
  };

  return (
    <div className={cn("medical-card border-l-4 p-6", tones[tone])}>
      <div className="mb-5 flex items-start justify-between">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", tones[tone])}>
          <Icon size={24} />
        </div>
        {helper ? <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-bold">{helper}</span> : null}
      </div>
      <p className="mb-1 text-sm font-semibold text-muted">{label}</p>
      <h3 className="text-2xl font-bold text-text">{value}</h3>
    </div>
  );
}
