"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  Pill,
  PackagePlus,
  Edit3,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import type { Medication } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

const UNITS = ["comprimés", "gélules", "flacons", "ampoules", "sachets", "tubes", "unités"];
const CATEGORIES = ["Antibiotique", "Analgésique", "Anti-inflammatoire", "Antipaludéen", "Antihypertenseur", "Antidiabétique", "Vitamines", "Antiparasitaire", "Soluté", "Vaccination", "Autre"];

type ModalMode = "add" | "edit" | "restock" | null;

export default function PharmacyPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Medication | null>(null);
  const [saving, setSaving] = useState(false);
  const [restockQty, setRestockQty] = useState("");

  const [form, setForm] = useState({
    name: "", category: "Antibiotique", unit: "comprimés",
    price: "", stock: "", threshold: "20",
  });

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const fetchMeds = useCallback(async () => {
    setLoading(true);
    let req = supabase.from("medications").select("*").eq("is_active", true).order("name");
    if (debouncedQuery.trim()) req = req.ilike("name", `%${debouncedQuery.trim()}%`);
    const { data, error } = await req;
    if (error) setToast({ tone: "error", message: error.message });
    setMedications((data ?? []) as Medication[]);
    setLoading(false);
  }, [debouncedQuery]);

  useEffect(() => { void fetchMeds(); }, [fetchMeds]);

  const lowStock = medications.filter((m) => m.stock <= m.threshold).length;

  function openAdd() {
    setSelected(null);
    setForm({ name: "", category: "Antibiotique", unit: "comprimés", price: "", stock: "", threshold: "20" });
    setModalMode("add");
  }
  function openEdit(med: Medication) {
    setSelected(med);
    setForm({ name: med.name, category: med.category, unit: med.unit, price: String(med.price), stock: String(med.stock), threshold: String(med.threshold) });
    setModalMode("edit");
  }
  function openRestock(med: Medication) {
    setSelected(med);
    setRestockQty("");
    setModalMode("restock");
  }
  function closeModal() { setModalMode(null); setSelected(null); }

  async function saveForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name, category: form.category, unit: form.unit,
      price: parseFloat(form.price), stock: parseInt(form.stock, 10),
      threshold: parseInt(form.threshold, 10), is_active: true,
    };

    let error;
    if (modalMode === "add") {
      ({ error } = await supabase.from("medications").insert(payload));
    } else if (modalMode === "edit" && selected) {
      ({ error } = await supabase.from("medications").update(payload).eq("id", selected.id));
    }

    setSaving(false);
    if (error) { setToast({ tone: "error", message: error.message }); return; }
    setToast({ tone: "success", message: modalMode === "add" ? "Médicament ajouté." : "Médicament mis à jour." });
    closeModal();
    void fetchMeds();
  }

  async function saveRestock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const qty = parseInt(restockQty, 10);
    if (!qty || qty <= 0) { setToast({ tone: "error", message: "Quantité invalide." }); return; }
    setSaving(true);
    const { error } = await supabase.from("medications").update({ stock: selected.stock + qty }).eq("id", selected.id);
    setSaving(false);
    if (error) { setToast({ tone: "error", message: error.message }); return; }
    setToast({ tone: "success", message: `${qty} ${selected.unit} ajouté(s) au stock.` });
    closeModal();
    void fetchMeds();
  }

  async function toggleActive(med: Medication) {
    const { error } = await supabase.from("medications").update({ is_active: !med.is_active }).eq("id", med.id);
    if (error) { setToast({ tone: "error", message: error.message }); return; }
    void fetchMeds();
  }

  const stockTone = (med: Medication) => med.stock === 0 ? "error" : med.stock <= med.threshold ? "warning" : "success";
  const stockLabel = (med: Medication) => med.stock === 0 ? "Rupture" : med.stock <= med.threshold ? "Faible" : "Normal";

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Gestion des Stocks</p>
          <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Pharmacie</h2>
          <p className="mt-1 text-muted text-sm">Catalogue médicaments, stocks et approvisionnement.</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Ajouter un Médicament
        </button>
      </div>

      {/* Alert band */}
      {lowStock > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-5 py-3">
          <AlertTriangle className="text-warning shrink-0" size={20} />
          <p className="text-sm font-semibold text-amber-800">
            <strong>{lowStock}</strong> médicament(s) avec un stock faible ou en rupture. Réapprovisionnez dès que possible.
          </p>
        </div>
      )}

      {/* Search + Table */}
      <section className="medical-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border bg-surface p-5 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-surface-soft border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition text-sm text-text placeholder:text-muted/70"
              placeholder="Rechercher un médicament..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button onClick={() => void fetchMeds()} className="btn-secondary flex items-center gap-2 text-xs">
            <RefreshCw size={13} /> Actualiser
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">{Array.from({ length: 6 }).map((_, i) => <div className="skeleton h-14" key={i} />)}</div>
        ) : medications.length === 0 ? (
          <div className="p-12"><EmptyState title="Aucun médicament trouvé" description="Ajoutez votre premier médicament avec le bouton ci-dessus." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="table-head">
                <tr>
                  <th className="px-6 py-4">Médicament</th>
                  <th className="px-6 py-4">Catégorie</th>
                  <th className="px-6 py-4">Unité</th>
                  <th className="px-6 py-4">Prix</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Seuil</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {medications.map((med) => (
                  <tr key={med.id} className="hover:bg-surface-soft transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Pill className="text-primary" size={16} />
                        </div>
                        <p className="font-bold text-text">{med.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge tone="neutral">{med.category}</Badge>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-muted">{med.unit}</td>
                    <td className="px-6 py-3.5 font-bold text-text">{formatMoney(med.price)}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-text">{med.stock}</span>
                        <Badge tone={stockTone(med)}>{stockLabel(med)}</Badge>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-muted">{med.threshold}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openRestock(med)}
                          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-muted hover:border-success hover:text-success transition-all"
                          title="Réapprovisionner"
                        >
                          <PackagePlus size={13} />
                        </button>
                        <button
                          onClick={() => openEdit(med)}
                          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-muted hover:border-primary hover:text-primary transition-all"
                          title="Modifier"
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-border bg-surface-soft px-6 py-3">
          <p className="text-xs text-muted font-semibold">{medications.length} médicament(s) actif(s)</p>
        </div>
      </section>

      {/* MODAL: Add / Edit */}
      {(modalMode === "add" || modalMode === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="medical-card w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-text">
                {modalMode === "add" ? "Ajouter un Médicament" : "Modifier le Médicament"}
              </h3>
              <button onClick={closeModal} className="text-muted hover:text-text"><X size={20} /></button>
            </div>
            <form onSubmit={saveForm} className="space-y-4">
              <label className="block">
                <span className="label">Nom du Médicament *</span>
                <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Amoxicilline 500mg" required />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="label">Catégorie</span>
                  <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="label">Unité</span>
                  <select className="input-field" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="label">Prix Unitaire ($)</span>
                  <input className="input-field" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </label>
                <label className="block">
                  <span className="label">Stock Initial</span>
                  <input className="input-field" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
                </label>
                <label className="block col-span-2">
                  <span className="label">Seuil d'Alerte (stock minimum)</span>
                  <input className="input-field" type="number" min="0" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} required />
                </label>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={closeModal}>Annuler</button>
                <button className="btn-primary" type="submit" disabled={saving}>
                  {saving ? "Enregistrement..." : modalMode === "add" ? "Ajouter" : "Mettre à Jour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Restock */}
      {modalMode === "restock" && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="medical-card w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-text">Réapprovisionner</h3>
              <button onClick={closeModal} className="text-muted hover:text-text"><X size={20} /></button>
            </div>
            <p className="text-sm text-muted mb-4">
              Médicament: <strong className="text-text">{selected.name}</strong><br />
              Stock actuel: <strong className="text-text">{selected.stock} {selected.unit}</strong>
            </p>
            <form onSubmit={saveRestock} className="space-y-4">
              <label className="block">
                <span className="label">Quantité à ajouter</span>
                <input
                  className="input-field"
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  placeholder="Ex: 100"
                  autoFocus
                  required
                />
              </label>
              {restockQty && parseInt(restockQty, 10) > 0 && (
                <div className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm font-semibold text-text">
                  Nouveau stock : <span className="text-success font-black">{selected.stock + parseInt(restockQty, 10)} {selected.unit}</span>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button type="button" className="btn-secondary" onClick={closeModal}>Annuler</button>
                <button className="btn-primary" type="submit" disabled={saving}>
                  {saving ? "..." : "Réapprovisionner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
