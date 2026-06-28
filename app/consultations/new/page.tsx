"use client";

import { FormEvent, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Stethoscope, Thermometer, Weight, Activity, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import type { Patient, Profile } from "@/lib/types";

function NewConsultationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledPatientId = searchParams.get("patientId");

  const [patientQuery, setPatientQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [medecins, setMedecins] = useState<Profile[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    medecin_id: "",
    motif: "",
    diagnostic: "",
    tension: "",
    temperature: "",
    poids: "",
    traitement: "",
    notes: "",
  });

  // Load medecins and pre-fill patient if id provided
  useEffect(() => {
    async function init() {
      const { data: medecinData } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["MEDECIN_DIRECTEUR", "ADMIN"])
        .eq("is_active", true);
      setMedecins((medecinData ?? []) as Profile[]);

      if (prefilledPatientId) {
        const { data: p } = await supabase
          .from("patients")
          .select("*")
          .eq("id", prefilledPatientId)
          .maybeSingle();
        if (p) setSelectedPatient(p as Patient);
      }
    }
    void init();
  }, [prefilledPatientId]);

  // Patient autocomplete search
  useEffect(() => {
    async function searchPatients() {
      if (patientQuery.trim().length < 2) {
        setPatients([]);
        return;
      }
      const term = `%${patientQuery.trim()}%`;
      const { data } = await supabase
        .from("patients")
        .select("*")
        .eq("is_active", true)
        .or(`nom.ilike.${term},prenom.ilike.${term},numero_dossier.ilike.${term}`)
        .limit(8);
      setPatients((data ?? []) as Patient[]);
    }
    const id = window.setTimeout(() => void searchPatients(), 300);
    return () => window.clearTimeout(id);
  }, [patientQuery]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatient) {
      setToast({ tone: "error", message: "Veuillez sélectionner un patient avant de continuer." });
      return;
    }
    if (!form.medecin_id) {
      setToast({ tone: "error", message: "Veuillez sélectionner un médecin responsable." });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("consultations").insert({
      patient_id: selectedPatient.id,
      medecin_id: form.medecin_id,
      motif: form.motif,
      diagnostic: form.diagnostic || null,
      tension: form.tension || null,
      temperature: form.temperature ? Number(form.temperature) : null,
      poids: form.poids ? Number(form.poids) : null,
      traitement: form.traitement || null,
      notes: form.notes || null,
      status: "EN_ATTENTE",
    });
    setSaving(false);

    if (error) {
      setToast({ tone: "error", message: `Erreur: ${error.message}` });
      return;
    }
    setToast({ tone: "success", message: `Consultation créée pour ${selectedPatient.prenom} ${selectedPatient.nom}.` });
    setTimeout(() => router.push("/consultations"), 800);
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Médical</p>
        <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Nouvelle Consultation</h2>
        <p className="mt-1 text-muted text-sm">
          Enregistrez une nouvelle consultation médicale avec les constantes du patient.
        </p>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* Patient Search */}
        <section className="medical-card p-6">
          <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            Sélection du Patient
          </h3>

          {selectedPatient ? (
            <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div>
                <p className="font-bold text-text text-lg">
                  {selectedPatient.prenom} {selectedPatient.nom}
                </p>
                <p className="text-sm text-muted mt-0.5">{selectedPatient.numero_dossier} · {selectedPatient.telephone ?? "Tél. non renseigné"}</p>
              </div>
              <button
                type="button"
                className="btn-secondary flex items-center gap-1 text-sm"
                onClick={() => {
                  setSelectedPatient(null);
                  setPatientQuery("");
                }}
              >
                <X size={14} />
                Changer
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 text-muted" size={18} />
              <input
                className="input-field pl-11"
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
                placeholder="Rechercher par nom ou numéro de dossier..."
                autoFocus={!prefilledPatientId}
              />
              {patients.length > 0 && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-card">
                  {patients.map((patient) => (
                    <button
                      key={patient.id}
                      className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-surface-soft transition-colors border-b border-border/50 last:border-0"
                      type="button"
                      onClick={() => {
                        setSelectedPatient(patient);
                        setPatients([]);
                        setPatientQuery("");
                      }}
                    >
                      <div>
                        <p className="font-semibold text-text">{patient.prenom} {patient.nom}</p>
                        <p className="text-xs text-muted mt-0.5">{patient.telephone ?? "Tél. non renseigné"}</p>
                      </div>
                      <Badge tone="primary">{patient.numero_dossier}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Medical Info */}
        <section className="medical-card p-6">
          <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <Stethoscope size={18} className="text-primary" />
            Informations Médicales
          </h3>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Médecin */}
            <label className="block lg:col-span-2">
              <span className="label">Médecin Responsable *</span>
              <select
                className="input-field"
                value={form.medecin_id}
                onChange={(e) => setForm({ ...form, medecin_id: e.target.value })}
                required
              >
                <option value="">— Sélectionner un médecin —</option>
                {medecins.map((m) => (
                  <option key={m.id} value={m.id}>
                    Dr. {m.first_name} {m.last_name}
                  </option>
                ))}
              </select>
            </label>

            {/* Motif */}
            <label className="block lg:col-span-2">
              <span className="label">Motif de la Consultation *</span>
              <input
                className="input-field"
                value={form.motif}
                onChange={(e) => setForm({ ...form, motif: e.target.value })}
                placeholder="Ex: Fièvre persistante depuis 3 jours"
                required
              />
            </label>

            {/* Constantes vitales */}
            <label className="block">
              <span className="label flex items-center gap-1.5">
                <Activity size={14} className="text-muted" /> Tension Artérielle
              </span>
              <input
                className="input-field"
                value={form.tension}
                onChange={(e) => setForm({ ...form, tension: e.target.value })}
                placeholder="Ex: 120/80"
              />
            </label>

            <label className="block">
              <span className="label flex items-center gap-1.5">
                <Thermometer size={14} className="text-muted" /> Température (°C)
              </span>
              <input
                className="input-field"
                type="number"
                step="0.1"
                min="30"
                max="45"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                placeholder="Ex: 37.5"
              />
            </label>

            <label className="block">
              <span className="label flex items-center gap-1.5">
                <Weight size={14} className="text-muted" /> Poids (kg)
              </span>
              <input
                className="input-field"
                type="number"
                step="0.1"
                min="1"
                value={form.poids}
                onChange={(e) => setForm({ ...form, poids: e.target.value })}
                placeholder="Ex: 72.5"
              />
            </label>

            <label className="block">
              <span className="label">Diagnostic</span>
              <input
                className="input-field"
                value={form.diagnostic}
                onChange={(e) => setForm({ ...form, diagnostic: e.target.value })}
                placeholder="Diagnostic provisoire ou confirmé"
              />
            </label>

            <label className="block lg:col-span-2">
              <span className="label">Traitement Prescrit</span>
              <textarea
                className="input-field min-h-28"
                value={form.traitement}
                onChange={(e) => setForm({ ...form, traitement: e.target.value })}
                placeholder="Ex: Paracétamol 500mg 3x/j pendant 5 jours, Amoxicilline 1g 2x/j..."
              />
            </label>

            <label className="block lg:col-span-2">
              <span className="label">Notes Cliniques Additionnelles</span>
              <textarea
                className="input-field min-h-20"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observations, antécédents pertinents, recommandations de suivi..."
              />
            </label>
          </div>
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push("/consultations")}
          >
            Annuler
          </button>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Créer la consultation"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

export default function NewConsultationPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="space-y-4">
          <div className="skeleton h-12 w-1/4" />
          <div className="skeleton h-48 w-full" />
          <div className="skeleton h-96 w-full" />
        </div>
      </AppShell>
    }>
      <NewConsultationForm />
    </Suspense>
  );
}
