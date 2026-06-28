import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "error" | "primary" | "secondary";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-mid text-muted",
  success: "bg-success/10 text-emerald-700",
  warning: "bg-warning/10 text-amber-700",
  error: "bg-error/10 text-error",
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary"
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: BadgeTone }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-bold", tones[tone])}>
      {children}
    </span>
  );
}
