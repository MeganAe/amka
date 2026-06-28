"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Stethoscope, Filter, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import type { Consultation } from "@/lib/types";
import { consultationLabel, formatDate, formatTime } from "@/lib/utils";

const statuses: Consultation["status"][] = [
  "EN_ATTENTE",
  "EN_COURS",
  "TERMINEE",
  "ANNULEE",
];

const statusColors: Record<Consultation["status"], "warning" | "primary" | "success" | "error"> = {
  EN_ATTENTE: "warning",
  EN_COURS: "primary",
  TERMINEE: "success",
  ANNULEE: "error",
};

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  async function fetchConsultations() {
    setLoading(true);
    let request = supabase
      .from("consultations")
      .select("*, patients(nom, prenom, numero_dossier), profiles(first_name, last_name)")
      .order("date_consultation", { ascending: false })
      .limit(80);

    if (debouncedQuery.trim()) {
      request = request.ilike("motif", `%${debouncedQuery.trim()}%`);
    }
    if (filterStatus) {
      request = request.eq("status", filterStatus);
    }

    const { data, error } = await request;
    if (error) setToast({ tone: "error", message: error.message });
    setConsultations((data ?? []) as Consultation[]);
    setLoading(false);
  }

  useEffect(() => {
    void fetchConsultations();
    const channel = supabase
      .channel("consultations-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultations" },
        () => void fetchConsultations(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [debouncedQuery, filterStatus]);

  async function updateStatus(id: string, status: Consultation["status"]) {
    setUpdatingId(id);
    const { error } = await supabase
      .from("consultations")
      .update({ status })
      .eq("id", id);
    setUpdatingId(null);
    setToast(
      error
        ? { tone: "error", message: `Erreur: ${error.message}` }
        : { tone: "success", message: `Statut mis à jour : ${consultationLabel(status)}` },
    );
  }

  const byStatus = (s: Consultation["status"]) =>
    consultations.filter((c) => c.status === s).length;

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
            Suivi Clinique
          </p>
          <h2 className="mt-2 text-3xl font-black text-text tracking-tight">
            Consultations
          </h2>
          <p className="mt-1 text-muted text-sm">
            Suivez l'avancement de chaque consultation et mettez à jour le statut en temps réel.
          </p>
        </div>
        <Link href="/consultations/new" className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Nouvelle Consultation
        </Link>
      </div>

      {/* Status Summary Pills */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
            className={`medical-card p-4 text-left transition-all border-2 ${
              filterStatus === s
                ? "border-primary bg-primary/5"
                : "border-transparent hover:border-border"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              {consultationLabel(s)}
            </p>
            <p className="text-2xl font-black text-text mt-1">{byStatus(s)}</p>
          </button>
        ))}
      </div>

      {/* Main Table Card */}
      <section className="medical-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border bg-surface p-5 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-surface-soft border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition text-sm text-text placeholder:text-muted/70"
              placeholder="Rechercher par motif..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            {filterStatus && (
              <button
                onClick={() => setFilterStatus("")}
                className="text-xs font-bold text-error hover:underline flex items-center gap-1"
              >
                Effacer filtre
              </button>
            )}
            <button
              onClick={() => void fetchConsultations()}
              className="btn-secondary flex items-center gap-2 text-xs"
            >
              <RefreshCw size={14} />
              Actualiser
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="skeleton h-16" key={i} />
            ))}
          </div>
        ) : consultations.length === 0 ? (
          <div className="p-12">
            <EmptyState title="Aucune consultation trouvée" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="table-head">
                <tr>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Motif</th>
                  <th className="px-6 py-4">Médecin</th>
                  <th className="px-6 py-4">Date & Heure</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {consultations.map((consultation) => (
                  <tr
                    key={consultation.id}
                    className="hover:bg-surface-soft transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <Link href={`/consultations/${consultation.id}`} className="group">
                        <p className="font-bold text-text group-hover:text-primary transition-colors">
                          {consultation.patients
                            ? `${consultation.patients.prenom} ${consultation.patients.nom}`
                            : "-"}
                        </p>
                        <p className="text-[10px] text-muted font-bold tracking-wide mt-0.5">
                          {consultation.patients?.numero_dossier}
                        </p>
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-text max-w-[180px]">
                      <span className="line-clamp-2">{consultation.motif}</span>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-text">
                      {consultation.profiles
                        ? `Dr. ${consultation.profiles.last_name}`
                        : "-"}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-text">
                      <p className="font-semibold">{formatDate(consultation.date_consultation)}</p>
                      <p className="text-muted text-xs mt-0.5">{formatTime(consultation.date_consultation)}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <select
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold outline-none cursor-pointer transition-all ${
                          updatingId === consultation.id ? "opacity-50 cursor-wait" : ""
                        } ${
                          consultation.status === "EN_ATTENTE"
                            ? "border-warning/30 bg-warning/10 text-amber-700"
                            : consultation.status === "EN_COURS"
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : consultation.status === "TERMINEE"
                                ? "border-success/30 bg-success/10 text-emerald-700"
                                : "border-error/30 bg-error/10 text-error"
                        }`}
                        value={consultation.status}
                        disabled={updatingId === consultation.id}
                        onChange={(e) =>
                          void updateStatus(
                            consultation.id,
                            e.target.value as Consultation["status"],
                          )
                        }
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {consultationLabel(s)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-border bg-surface-soft px-6 py-3">
          <p className="text-xs text-muted font-semibold">
            {consultations.length} consultation(s) affichée(s) — Synchronisation Supabase Realtime active
          </p>
        </div>
      </section>
    </AppShell>
  );
}
