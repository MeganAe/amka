"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Edit, Plus, Search, Trash2, Users, FileText, Calendar, Phone, MapPin, Eye } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import type { Patient } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const pageSize = 10;
const emptyForm = {
  nom: "",
  prenom: "",
  postnom: "",
  sexe: "MASCULIN",
  date_naissance: "",
  telephone: "",
  adresse: ""
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Patient | null>(null);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  async function fetchPatients() {
    setLoading(true);
    let request = supabase
      .from("patients")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (debouncedQuery.trim()) {
      const term = `%${debouncedQuery.trim()}%`;
      request = request.or(`nom.ilike.${term},prenom.ilike.${term},numero_dossier.ilike.${term},telephone.ilike.${term}`);
    }

    const { data, count, error } = await request;
    if (error) setToast({ tone: "error", message: `Erreur de chargement: ${error.message}` });
    setPatients((data ?? []) as Patient[]);
    setTotal(count ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    void fetchPatients();
    const channel = supabase
      .channel("patients-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => void fetchPatients())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [page, debouncedQuery]);

  async function generateDossierNumber() {
    const year = new Date().getFullYear();
    const { count } = await supabase.from("patients").select("id", { count: "exact", head: true }).gte("created_at", `${year}-01-01`);
    return `AMKA-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(patient: Patient) {
    setEditing(patient);
    setForm({
      nom: patient.nom,
      prenom: patient.prenom,
      postnom: patient.postnom ?? "",
      sexe: patient.sexe,
      date_naissance: patient.date_naissance,
      telephone: patient.telephone ?? "",
      adresse: patient.adresse ?? ""
    });
    setModalOpen(true);
  }

  // Capitalize name helper
  function cleanAndCapitalize(text: string) {
    return text.trim().toUpperCase();
  }

  function cleanAndTitleCase(text: string) {
    return text.trim().split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
  }

  async function savePatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Validations
    const today = new Date().toISOString().split("T")[0];
    if (form.date_naissance > today) {
      setToast({ tone: "error", message: "La date de naissance ne peut pas être dans le futur." });
      return;
    }

    const birthYear = new Date(form.date_naissance).getFullYear();
    const currentYear = new Date().getFullYear();
    if (currentYear - birthYear > 120) {
      setToast({ tone: "error", message: "Veuillez saisir une date de naissance valide (âge maximum 120 ans)." });
      return;
    }

    const formattedForm = {
      ...form,
      nom: cleanAndCapitalize(form.nom),
      prenom: cleanAndTitleCase(form.prenom),
      postnom: form.postnom ? cleanAndCapitalize(form.postnom) : null,
      telephone: form.telephone.trim() || null,
      adresse: form.adresse.trim() || null
    };

    try {
      if (editing) {
        const { error } = await supabase
          .from("patients")
          .update({ ...formattedForm, updated_at: new Date().toISOString() })
          .eq("id", editing.id);
        if (error) throw error;
        setToast({ tone: "success", message: `Dossier de ${formattedForm.prenom} ${formattedForm.nom} modifié avec succès.` });
      } else {
        const numero_dossier = await generateDossierNumber();
        const { error } = await supabase.from("patients").insert({ ...formattedForm, numero_dossier, is_active: true });
        if (error) throw error;
        setToast({ tone: "success", message: `Nouveau dossier patient créé : ${numero_dossier}` });
      }
      setModalOpen(false);
      void fetchPatients();
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Erreur lors de la sauvegarde." });
    }
  }

  async function archivePatient() {
    if (!confirmDelete) return;
    const { error } = await supabase.from("patients").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", confirmDelete.id);
    if (error) {
      setToast({ tone: "error", message: `Erreur d'archivage: ${error.message}` });
      return;
    }
    setToast({ tone: "success", message: `Le dossier patient ${confirmDelete.numero_dossier} a été archivé.` });
    setConfirmDelete(null);
    void fetchPatients();
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />
      
      {/* Header and statistics */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Dossiers Médicaux</p>
          <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Patients de la Clinique</h2>
          <p className="mt-1 text-muted text-sm">Gérez les dossiers médicaux, visualisez l'historique et créez de nouvelles entrées.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Nouveau Patient
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="medical-card p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-wider">Total de dossiers actifs</p>
              <p className="text-3xl font-black text-text mt-0.5">{total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Patients Table Section */}
      <section className="medical-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border bg-surface p-6 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input 
              className="w-full pl-10 pr-4 py-2.5 bg-surface-soft border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition placeholder:text-muted/60 text-sm text-text" 
              placeholder="Rechercher par nom, n° dossier, téléphone..." 
              value={query} 
              onChange={(event) => setQuery(event.target.value)} 
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted">Page</span>
            <Badge tone="primary">{page + 1} / {Math.max(1, Math.ceil(total / pageSize))}</Badge>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="skeleton h-16" />)}</div>
        ) : patients.length === 0 ? (
          <div className="p-12"><EmptyState title="Aucun patient trouvé" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="table-head">
                <tr>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">N° Dossier</th>
                  <th className="px-6 py-4">Sexe</th>
                  <th className="px-6 py-4">Date de naissance</th>
                  <th className="px-6 py-4">Téléphone</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-surface-soft transition-colors group">
                    <td className="px-6 py-3.5">
                      <Link href={`/patients/${patient.id}`} className="font-bold text-text hover:text-primary transition-colors flex items-center gap-2">
                        <span>{patient.prenom} {patient.nom} {patient.postnom ?? ""}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-sm font-semibold text-muted font-mono">{patient.numero_dossier}</td>
                    <td className="px-6 py-3.5">
                      <Badge tone={patient.sexe === "FEMININ" ? "secondary" : "primary"}>
                        {patient.sexe === "FEMININ" ? "Féminin" : "Masculin"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-text font-medium">{formatDate(patient.date_naissance)}</td>
                    <td className="px-6 py-3.5 text-sm text-text font-medium">{patient.telephone ?? "Non renseigné"}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex justify-end gap-2">
                        <Link href={`/patients/${patient.id}`} className="btn-secondary px-3 py-2 text-muted hover:text-primary" title="Ouvrir le dossier clinique">
                          <Eye size={16} />
                        </Link>
                        <button className="btn-secondary px-3 py-2 text-muted hover:text-primary" onClick={() => openEdit(patient)} title="Modifier le profil">
                          <Edit size={16} />
                        </button>
                        <button className="btn-secondary px-3 py-2 text-error hover:bg-error/5" onClick={() => setConfirmDelete(patient)} title="Archiver ce dossier">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between border-t border-border bg-surface-soft p-4">
          <button className="btn-secondary" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Précédent</button>
          <button className="btn-secondary" disabled={(page + 1) * pageSize >= total} onClick={() => setPage((value) => value + 1)}>Suivant</button>
        </div>
      </section>

      {/* Create / Edit Patient Modal */}
      {modalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-text/40 backdrop-blur-sm p-4 animate-fade-in">
          <form onSubmit={savePatient} className="medical-card w-full max-w-2xl p-6 shadow-xl animate-scale-up">
            <h3 className="text-xl font-bold text-text mb-6 flex items-center gap-2">
              <FileText className="text-primary" />
              {editing ? "Modifier le dossier patient" : "Nouveau dossier patient"}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="label">Nom</span>
                <input className="input-field" value={form.nom} onChange={(event) => setForm({ ...form, nom: event.target.value })} required placeholder="Ex: DUPONT" />
              </label>
              <label className="block">
                <span className="label">Prénom</span>
                <input className="input-field" value={form.prenom} onChange={(event) => setForm({ ...form, prenom: event.target.value })} required placeholder="Ex: Jean" />
              </label>
              <label className="block">
                <span className="label">Postnom (Optionnel)</span>
                <input className="input-field" value={form.postnom} onChange={(event) => setForm({ ...form, postnom: event.target.value })} placeholder="Ex: KABORE" />
              </label>
              <label className="block">
                <span className="label">Sexe</span>
                <select className="input-field" value={form.sexe} onChange={(event) => setForm({ ...form, sexe: event.target.value })}>
                  <option value="MASCULIN">Masculin</option>
                  <option value="FEMININ">Féminin</option>
                </select>
              </label>
              <label className="block">
                <span className="label">Date de naissance</span>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input className="input-field pl-10" type="date" value={form.date_naissance} onChange={(event) => setForm({ ...form, date_naissance: event.target.value })} required />
                </div>
              </label>
              <label className="block">
                <span className="label">Téléphone</span>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input className="input-field pl-10" type="tel" value={form.telephone} onChange={(event) => setForm({ ...form, telephone: event.target.value })} placeholder="Ex: +24381234567" />
                </div>
              </label>
              <label className="md:col-span-2">
                <span className="label flex items-center gap-1">
                  <MapPin size={16} className="text-muted" />
                  Adresse Résidentielle
                </span>
                <textarea className="input-field min-h-20" value={form.adresse} onChange={(event) => setForm({ ...form, adresse: event.target.value })} placeholder="Ex: 15 Avenue Clinique, Kinshasa Gombe" />
              </label>
            </div>
            
            <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
              <button className="btn-primary" type="submit">Enregistrer le dossier</button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Confirm Soft Delete Modal */}
      {confirmDelete ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-text/40 backdrop-blur-sm p-4">
          <div className="medical-card w-full max-w-md p-6 shadow-xl bg-white">
            <h3 className="text-lg font-bold text-text mb-2 flex items-center gap-2">
              <AlertTriangle className="text-error" />
              Archiver ce dossier patient ?
            </h3>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              Êtes-vous sûr de vouloir archiver le dossier de <strong className="text-text">{confirmDelete.prenom} {confirmDelete.nom}</strong> ({confirmDelete.numero_dossier}) ? Il ne sera plus affiché dans les listes actives mais restera stocké dans l'historique clinique.
            </p>
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button type="button" className="btn-secondary" onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button type="button" className="btn-primary bg-error hover:bg-red-700 border-none text-white font-semibold px-4 py-2" onClick={archivePatient}>
                Archiver le dossier
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
