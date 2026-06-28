"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, TrendingUp, TrendingDown, Wallet, Download, X, AlertTriangle } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import type { Expense, Payment } from "@/lib/types";
import { formatMoney, formatDate, todayIsoDate } from "@/lib/utils";

const EXPENSE_CATEGORIES = [
  "Salaires", "Équipements médicaux", "Consommables", "Électricité/Eau",
  "Maintenance", "Loyer", "Transport", "Formation", "Autre",
];

const CHART_COLORS = ["#4648d4", "#00687a", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function exportCSV(data: Expense[]) {
  const header = "Description,Catégorie,Montant,Date";
  const rows = data.map((e) => `"${e.description}","${e.category}",${e.amount},"${e.date}"`);
  const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `depenses_${todayIsoDate()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AccountingPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", category: "Salaires", date: todayIsoDate() });
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - parseInt(period, 10));
    const sinceStr = since.toISOString().slice(0, 10);

    const [expRes, payRes] = await Promise.all([
      supabase.from("expenses").select("*").gte("date", sinceStr).order("date", { ascending: false }),
      supabase.from("payments").select("*, patients(nom, prenom, numero_dossier)").eq("status", "COMPLETED").gte("created_at", sinceStr).order("created_at", { ascending: false }),
    ]);

    if (expRes.error) setToast({ tone: "error", message: expRes.error.message });
    if (payRes.error) setToast({ tone: "error", message: payRes.error.message });
    setExpenses((expRes.data ?? []) as Expense[]);
    setPayments((payRes.data ?? []) as Payment[]);
    setLoading(false);
  }, [period]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const totalRevenue = payments.reduce((s, p) => s + (p.montant ?? 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const balance = totalRevenue - totalExpenses;

  // Build daily series for area chart
  const dayMap = new Map<string, { revenue: number; expenses: number }>();
  payments.forEach((p) => {
    const d = p.created_at.slice(0, 10);
    dayMap.set(d, { ...{ revenue: 0, expenses: 0 }, ...(dayMap.get(d) ?? {}), revenue: (dayMap.get(d)?.revenue ?? 0) + p.montant });
  });
  expenses.forEach((e) => {
    dayMap.set(e.date, { ...{ revenue: 0, expenses: 0 }, ...(dayMap.get(e.date) ?? {}), expenses: (dayMap.get(e.date)?.expenses ?? 0) + e.amount });
  });
  const chartData = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(date)), ...vals }));

  // Expense breakdown pie
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});
  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));

  async function saveExpense(evt: FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setToast({ tone: "error", message: "Montant invalide." }); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("expenses").insert({
      description: form.description, amount, category: form.category, date: form.date,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { setToast({ tone: "error", message: error.message }); return; }
    setToast({ tone: "success", message: "Dépense enregistrée." });
    setShowModal(false);
    setForm({ description: "", amount: "", category: "Salaires", date: todayIsoDate() });
    void fetchData();
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Comptabilité</p>
          <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Tableau de Trésorerie</h2>
          <p className="mt-1 text-muted text-sm">Vue consolidée des revenus et dépenses de la clinique.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(expenses)} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Dépense
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(["7", "30", "90"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full border px-4 py-1.5 text-sm font-bold transition-all ${
              period === p ? "border-primary bg-primary text-white" : "border-border text-muted hover:border-primary hover:text-primary"
            }`}
          >
            {p === "7" ? "7 jours" : p === "30" ? "30 jours" : "90 jours"}
          </button>
        ))}
        <button onClick={() => void fetchData()} className="ml-auto btn-secondary flex items-center gap-2 text-xs">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="medical-card p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <TrendingUp className="text-success" size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Revenus</p>
            <p className="text-2xl font-black text-success mt-0.5">{formatMoney(totalRevenue)}</p>
          </div>
        </div>
        <div className="medical-card p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
            <TrendingDown className="text-error" size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Dépenses</p>
            <p className="text-2xl font-black text-error mt-0.5">{formatMoney(totalExpenses)}</p>
          </div>
        </div>
        <div className={`medical-card p-5 flex items-center gap-4 ${balance < 0 ? "border-error/20" : "border-success/20"}`}>
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${balance < 0 ? "bg-error/10" : "bg-primary/10"}`}>
            <Wallet className={balance < 0 ? "text-error" : "text-primary"} size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Solde Net</p>
            <p className={`text-2xl font-black mt-0.5 ${balance < 0 ? "text-error" : "text-primary"}`}>
              {formatMoney(balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      {!loading && chartData.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="medical-card p-6 lg:col-span-2">
            <h3 className="text-base font-bold text-text mb-4">Évolution Revenus / Dépenses</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.14} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e1f5" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8b7cad" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8b7cad" }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Area type="monotone" dataKey="revenue" name="Revenus" stroke="#10b981" fill="url(#gRev)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" name="Dépenses" stroke="#ef4444" fill="url(#gExp)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {pieData.length > 0 && (
            <div className="medical-card p-6">
              <h3 className="text-base font-bold text-text mb-4">Répartition Dépenses</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3}>
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMoney(v)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expenses Table */}
      <section className="medical-card overflow-hidden">
        <div className="border-b border-border bg-surface px-6 py-4">
          <h3 className="font-bold text-text">Dépenses enregistrées ({expenses.length})</h3>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">{Array.from({ length: 4 }).map((_, i) => <div className="skeleton h-14" key={i} />)}</div>
        ) : expenses.length === 0 ? (
          <div className="p-12"><EmptyState title="Aucune dépense sur la période" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="table-head">
                <tr>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Catégorie</th>
                  <th className="px-6 py-4">Montant</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-soft transition-colors">
                    <td className="px-6 py-3.5 text-text font-medium">{e.description}</td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-xs font-bold text-muted">{e.category}</span>
                    </td>
                    <td className="px-6 py-3.5 font-black text-error">{formatMoney(e.amount)}</td>
                    <td className="px-6 py-3.5 text-sm text-muted">{formatDate(e.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="medical-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-text">Enregistrer une Dépense</h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-text"><X size={20} /></button>
            </div>
            <form onSubmit={saveExpense} className="space-y-4">
              <label className="block">
                <span className="label">Description *</span>
                <input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Achat de seringues 5ml" required />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="label">Catégorie</span>
                  <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="label">Montant ($) *</span>
                  <input className="input-field" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </label>
                <label className="block col-span-2">
                  <span className="label">Date</span>
                  <input className="input-field" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </label>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button className="btn-primary" type="submit" disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer la Dépense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
