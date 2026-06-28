"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Printer,
  RefreshCw,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import type { Payment, Patient } from "@/lib/types";
import { formatMoney, formatDate, paymentLabel } from "@/lib/utils";

const MODE_LABELS: Record<Payment["mode_paiement"], string> = {
  CASH: "Cash",
  MOBILE_MONEY: "Mobile Money",
  BANK_TRANSFER: "Virement",
  INSURANCE: "Assurance",
};

function printReceipt(payment: Payment) {
  const win = window.open("", "_blank", "width=420,height=620");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Reçu #${payment.id.slice(0, 8).toUpperCase()}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    body { font-family: Inter, sans-serif; padding: 32px; color: #1c1c2e; margin: 0; }
    .header { text-align: center; border-bottom: 2px solid #4648d4; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 28px; font-weight: 900; color: #4648d4; }
    .subtitle { font-size: 12px; color: #8b7cad; margin-top: 4px; }
    .receipt-num { font-size: 11px; background: #f0eeff; color: #4648d4; font-weight: 700; padding: 4px 10px; border-radius: 20px; display: inline-block; margin-top: 8px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e5e1f5; font-size: 14px; }
    .row:last-child { border-bottom: none; }
    .label { color: #8b7cad; }
    .total-row { display: flex; justify-content: space-between; margin-top: 20px; font-size: 22px; font-weight: 900; color: #4648d4; }
    .status { text-align: center; margin-top: 24px; }
    .status-chip { background: #d1fae5; color: #059669; font-weight: 700; font-size: 13px; padding: 6px 16px; border-radius: 20px; display: inline-block; }
    .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #c7c4d7; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">AMKA Medical</div>
    <div class="subtitle">Système de Gestion Médicale</div>
    <div class="receipt-num">Reçu #${payment.id.slice(0, 8).toUpperCase()}</div>
  </div>
  <div class="row"><span class="label">Patient</span><strong>${payment.patients ? `${payment.patients.prenom} ${payment.patients.nom}` : "-"}</strong></div>
  <div class="row"><span class="label">Dossier</span><span>${payment.patients?.numero_dossier ?? "-"}</span></div>
  <div class="row"><span class="label">Type de Paiement</span><span>${payment.type}</span></div>
  <div class="row"><span class="label">Mode de Paiement</span><span>${MODE_LABELS[payment.mode_paiement]}</span></div>
  <div class="row"><span class="label">Date</span><span>${formatDate(payment.created_at)}</span></div>
  <div class="row"><span class="label">Statut</span><span>${paymentLabel(payment.status)}</span></div>
  ${payment.notes ? `<div class="row"><span class="label">Notes</span><span>${payment.notes}</span></div>` : ""}
  <div class="total-row"><span>TOTAL</span><span>${formatMoney(payment.montant)}</span></div>
  <div class="status"><div class="status-chip">${paymentLabel(payment.status)}</div></div>
  <div class="footer">Merci pour votre confiance — AMKA Medical System<br>Généré le ${new Date().toLocaleString("fr-FR")}</div>
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`);
  win.document.close();
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    let req = supabase
      .from("payments")
      .select("*, patients(nom, prenom, numero_dossier)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (debouncedQuery.trim()) {
      req = req.ilike("type", `%${debouncedQuery.trim()}%`);
    }
    if (filterStatus) {
      req = req.eq("status", filterStatus);
    }

    const { data, error } = await req;
    if (error) setToast({ tone: "error", message: error.message });
    setPayments((data ?? []) as Payment[]);
    setLoading(false);
  }, [debouncedQuery, filterStatus]);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  const totalCompleted = payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + (p.montant ?? 0), 0);
  const totalPending = payments
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + (p.montant ?? 0), 0);

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Finance</p>
          <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Paiements</h2>
          <p className="mt-1 text-muted text-sm">Suivez les encaissements et imprimez des reçus.</p>
        </div>
        <Link href="/payments/new" className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Nouveau Paiement
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="medical-card p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="text-success" size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Encaissé</p>
            <p className="text-2xl font-black text-success mt-0.5">{formatMoney(totalCompleted)}</p>
          </div>
        </div>
        <div className="medical-card p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
            <TrendingUp className="text-warning" size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">En Attente</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{formatMoney(totalPending)}</p>
          </div>
        </div>
        <div className="medical-card p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <DollarSign className="text-primary" size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Total Affiché</p>
            <p className="text-2xl font-black text-text mt-0.5">{payments.length}</p>
            <p className="text-xs text-muted">transactions</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <section className="medical-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border bg-surface p-5 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-surface-soft border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition text-sm text-text placeholder:text-muted/70"
              placeholder="Rechercher par type..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(["PENDING", "COMPLETED", "CANCELLED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                  filterStatus === s
                    ? "border-primary bg-primary text-white"
                    : "border-border text-muted hover:border-primary hover:text-primary"
                }`}
              >
                {paymentLabel(s)}
              </button>
            ))}
            <button onClick={() => void fetchPayments()} className="btn-secondary flex items-center gap-2 text-xs">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div className="skeleton h-16" key={i} />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12"><EmptyState title="Aucun paiement trouvé" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="table-head">
                <tr>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Mode</th>
                  <th className="px-6 py-4">Montant</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-surface-soft transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-bold text-text">
                        {payment.patients ? `${payment.patients.prenom} ${payment.patients.nom}` : "-"}
                      </p>
                      <p className="text-[10px] text-muted font-bold tracking-wide mt-0.5">
                        {payment.patients?.numero_dossier}
                      </p>
                    </td>
                    <td className="px-6 py-3.5 text-sm font-medium text-text">{payment.type}</td>
                    <td className="px-6 py-3.5">
                      <Badge tone="neutral">{MODE_LABELS[payment.mode_paiement]}</Badge>
                    </td>
                    <td className="px-6 py-3.5 text-base font-black text-text">
                      {formatMoney(payment.montant)}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge
                        tone={
                          payment.status === "COMPLETED"
                            ? "success"
                            : payment.status === "PENDING"
                              ? "warning"
                              : "error"
                        }
                      >
                        {paymentLabel(payment.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-muted">{formatDate(payment.created_at)}</td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => printReceipt(payment)}
                        className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted hover:border-primary hover:text-primary transition-all"
                      >
                        <Printer size={13} />
                        Reçu
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-border bg-surface-soft px-6 py-3">
          <p className="text-xs text-muted font-semibold">
            {payments.length} paiement(s) affiché(s)
          </p>
        </div>
      </section>
    </AppShell>
  );
}
