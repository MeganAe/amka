"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Stethoscope,
  Thermometer,
  Weight,
  Activity,
  FileText,
  User,
  Calendar,
  Edit3,
  CheckCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import type { Consultation } from "@/lib/types";
import { consultationLabel, formatDate, formatTime } from "@/lib/utils";

const STATUS_COLORS: Record<
  Consultation["status"],
  "warning" | "primary" | "success" | "error"
> = {
  EN_ATTENTE: "warning",
  EN_COURS: "primary",
  TERMINEE: "success",
  ANNULEE: "error",
};

export default function ConsultationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("consultations")
        .select(
          "*, patients(nom, prenom, numero_dossier, telephone, date_naissance, sexe), profiles(first_name, last_name, email)",
        )
        .eq("id", params.id)
        .maybeSingle();
      if (error) setToast({ tone: "error", message: error.message });
      setConsultation(data as Consultation | null);
      setLoading(false);
    }
    void load();
  }, [params.id]);

  async function updateStatus(status: Consultation["status"]) {
    if (!consultation) return;
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("consultations")
      .update({ status })
      .eq("id", params.id);
    setUpdatingStatus(false);
    if (error) {
      setToast({ tone: "error", message: error.message });
      return;
    }
    setConsultation({ ...consultation, status });
    setToast({ tone: "success", message: `Statut mis à jour : ${consultationLabel(status)}` });
  }

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 w-full" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!consultation) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-32 text-center gap-4">
          <p className="text-2xl font-black text-text">Consultation introuvable</p>
          <Link href="/consultations" className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} /> Retour aux consultations
          </Link>
        </div>
      </AppShell>
    );
  }

  const patient = consultation.patients as any;
  const medecin = consultation.profiles as any;

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Breadcrumb + Status header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/consultations"
            className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary transition-colors mb-3"
          >
            <ArrowLeft size={15} /> Retour aux Consultations
          </Link>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
            Dossier Clinique
          </p>
          <h2 className="mt-2 text-3xl font-black text-text tracking-tight">
            Consultation du {formatDate(consultation.date_consultation)}
          </h2>
          {patient && (
            <p className="mt-1 text-muted text-sm">
              Patient :{" "}
              <Link
                href={`/patients/${consultation.patient_id}`}
                className="font-bold text-primary hover:underline"
              >
                {patient.prenom} {patient.nom}
              </Link>{" "}
              · {patient.numero_dossier}
            </p>
          )}
        </div>

        {/* Status selector */}
        <div className="flex items-center gap-3">
          <Badge tone={STATUS_COLORS[consultation.status]}>
            {consultationLabel(consultation.status)}
          </Badge>
          <select
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition"
            value={consultation.status}
            disabled={updatingStatus}
            onChange={(e) => void updateStatus(e.target.value as Consultation["status"])}
          >
            {(["EN_ATTENTE", "EN_COURS", "TERMINEE", "ANNULEE"] as const).map((s) => (
              <option key={s} value={s}>
                {consultationLabel(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Motif + Diagnostic */}
          <section className="medical-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-text">
              <Stethoscope size={18} className="text-primary" />
              Informations Médicales
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1">
                  Motif de Consultation
                </p>
                <p className="text-text font-semibold">{consultation.motif}</p>
              </div>
              {consultation.diagnostic && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1">
                    Diagnostic
                  </p>
                  <p className="text-text font-semibold">{consultation.diagnostic}</p>
                </div>
              )}
              {consultation.traitement && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1">
                    Traitement Prescrit
                  </p>
                  <div className="rounded-xl border border-border bg-surface-soft p-4">
                    <p className="text-text text-sm whitespace-pre-wrap">{consultation.traitement}</p>
                  </div>
                </div>
              )}
              {consultation.notes && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1">
                    Notes Cliniques
                  </p>
                  <div className="rounded-xl border border-border bg-surface-soft p-4">
                    <p className="text-text text-sm whitespace-pre-wrap">{consultation.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Constantes Vitales */}
          {(consultation.tension || consultation.temperature || consultation.poids) && (
            <section className="medical-card p-6">
              <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-text">
                <Activity size={18} className="text-primary" />
                Constantes Vitales
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {consultation.tension && (
                  <div className="rounded-xl border border-border bg-surface-soft p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <Activity className="text-primary" size={22} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Tension</p>
                    <p className="text-xl font-black text-text mt-1">{consultation.tension}</p>
                    <p className="text-xs text-muted">mmHg</p>
                  </div>
                )}
                {consultation.temperature && (
                  <div className="rounded-xl border border-border bg-surface-soft p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <Thermometer className="text-warning" size={22} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Température</p>
                    <p className="text-xl font-black text-text mt-1">{consultation.temperature}</p>
                    <p className="text-xs text-muted">°C</p>
                  </div>
                )}
                {consultation.poids && (
                  <div className="rounded-xl border border-border bg-surface-soft p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <Weight className="text-secondary" size={22} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Poids</p>
                    <p className="text-xl font-black text-text mt-1">{consultation.poids}</p>
                    <p className="text-xs text-muted">kg</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right column — info cards */}
        <div className="space-y-4">
          {/* Patient card */}
          {patient && (
            <section className="medical-card p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Patient</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-sm font-black">
                  {patient.prenom?.[0]}{patient.nom?.[0]}
                </div>
                <div>
                  <p className="font-bold text-text">{patient.prenom} {patient.nom}</p>
                  <p className="text-xs text-muted font-bold mt-0.5">{patient.numero_dossier}</p>
                </div>
              </div>
              <Link
                href={`/patients/${consultation.patient_id}`}
                className="btn-secondary w-full text-xs justify-center"
              >
                Voir le Dossier Complet
              </Link>
            </section>
          )}

          {/* Médecin card */}
          {medecin && (
            <section className="medical-card p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Médecin</h3>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-secondary font-black text-sm">
                  {medecin.first_name?.[0]}{medecin.last_name?.[0]}
                </div>
                <div>
                  <p className="font-bold text-text">Dr. {medecin.first_name} {medecin.last_name}</p>
                  <p className="text-xs text-muted">{medecin.email}</p>
                </div>
              </div>
            </section>
          )}

          {/* Meta */}
          <section className="medical-card p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Horodatage</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="text-muted" size={15} />
                <span className="text-text font-semibold">{formatDate(consultation.date_consultation)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Activity className="text-muted" size={15} />
                <span className="text-muted">{formatTime(consultation.date_consultation)}</span>
              </div>
            </div>
          </section>

          {/* Quick actions */}
          <section className="medical-card p-5 space-y-2">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Actions</h3>
            <Link
              href={`/consultations/new?patientId=${consultation.patient_id}`}
              className="btn-secondary w-full justify-center text-sm"
            >
              + Nouvelle Consultation
            </Link>
            <Link
              href={`/payments/new?patientId=${consultation.patient_id}`}
              className="btn-primary w-full justify-center text-sm"
            >
              + Enregistrer Paiement
            </Link>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
