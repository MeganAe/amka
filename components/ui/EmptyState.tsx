import { FileSearch } from "lucide-react";

export function EmptyState({
  title = "Aucune donnée",
  text,
  description,
}: {
  title?: string;
  text?: string;
  description?: string;
}) {
  const body = description ?? text ?? "Les données Supabase apparaîtront ici.";
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <FileSearch size={24} />
      </div>
      <div>
        <p className="font-semibold text-text">{title}</p>
        <p className="text-sm text-muted">{body}</p>
      </div>
    </div>
  );
}
