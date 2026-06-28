"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  Plus,
  Receipt,
  Stethoscope,
  Phone,
  Calendar,
  MapPin,
  FileText,
  Thermometer,
  Weight,
  Activity,
  ArrowLeft,
  DollarSign,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabase";
import type { Consultation, Patient, Payment } from "@/lib/types";
import { consultationLabel, formatDate, formatMoney } from "@/lib/utils";

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [patientResponse, consultationsResponse, paymentsResponse] =
        await Promise.all([
          supabase.from("patients").select("*").eq("id", params.id).maybeSingle(),
          supabase
            .from("consultations")
            .select("*")
            .eq("patient_id", params.id)
            .order("date_consultation", { ascending: false }),
          supabase
            .from("payments")
            .select("*")
            .eq("patient_id", params.id)
            .order("created_at", { ascending: false }),
        ]);
      setPatient(patientResponse.data as Patient | null);
      setConsultations((consultationsResponse.data ?? []) as Consultation[]);
      setPayments((paymentsResponse.data ?? []) as Payment[]);
      setLoading(false);
    }
    void load();
  }, [params.id]);

  // Calculate age from date of birth
  const age = useMemo(() => {
    if (!patient?.date_naissance) return null;
    const birth = new Date(patient.date_naissance);
    const today = new Date();
    let computedAge = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      computedAge--;
    }
    return computedAge;
  }, [patient]);

  // Calculate clinical constant statistics
  const clinicalStats = useMemo(() => {
    if (consultations.length === 0) return null;
    const weights = consultations
      .map((c) => c.poids)
      .filter((w) => w !== null && w !== undefined && w > 0) as number[];
    const temps = consultations
      .map((c) => c.temperature)
      .filter((t) => t !== null && t !== undefined && t > 0) as number[];
    const tensions = consultations
      .map((c) => c.tension)
      .filter((t) => t !== null && t !== undefined && t.trim() !== "");

    return {
      avgWeight: weights.length > 0 ? (weights.reduce((s, w) => s + w, 0) / weights.length).toFixed(1) : null,
      avgTemp: temps.length > 0 ? (temps.reduce((s, t) => s + t, 0) / temps.length).toFixed(1) : null,
      latestTension: tensions.length > 0 ? tensions[0] : null,
    };
  }, [consultations]);

  // Calculate financial statistics for this patient
  const totalBilled = useMemo(() => {
    return payments
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + Number(p.montant), 0);
  }, [payments]);

  return (
    <AppShell>
      {/* Return button */}
      <div>
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline uppercase tracking-wider mb-4"
        >
          <ArrowLeft size={14} />
          Retour à la liste des patients
        </Link>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="skeleton h-40" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="skeleton h-80" />
            <div className="skeleton h-80" />
          </div>
        </div>
      ) : !patient ? (
        <EmptyState title="Dossier patient introuvable" />
      ) : (
        <div className="space-y-6">
          {/* Main Patient Header Card */}
          <section className="medical-card p-6 bg-gradient-to-r from-surface-soft via-surface to-white border border-border">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <Badge tone="primary">{patient.numero_dossier}</Badge>
                <h2 className="mt-3 text-3xl font-black text-text tracking-tight">
                  {patient.prenom} {patient.nom} {patient.postnom ?? ""}
                </h2>
                
                {/* Meta details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4 text-sm text-muted font-medium">
                  <span className="flex items-center gap-2">
                    <Calendar size={16} className="text-primary" />
                    <span>{formatDate(patient.date_naissance)} ({age !== null ? `${age} ans` : "-"})</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Phone size={16} className="text-primary" />
                    <span>{patient.telephone ?? "Téléphone non renseigné"}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin size={16} className="text-primary" />
                    <span>{patient.adresse ?? "Adresse non renseignée"}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/consultations/new?patientId=${patient.id}`}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={16} />
                  Nouvelle Consultation
                </Link>
              </div>
            </div>
          </section>

          {/* Quick Metrics (Constantes moyennes) */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="medical-card p-5 flex items-center gap-4">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Dernière Tension</p>
                <p className="text-xl font-bold text-text mt-0.5">
                  {clinicalStats?.latestTension ? `${clinicalStats.latestTension} mmHg` : "-"}
                </p>
              </div>
            </div>

            <div className="medical-card p-5 flex items-center gap-4">
              <div className="h-10 w-10 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary">
                <Thermometer size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Température Moyenne</p>
                <p className="text-xl font-bold text-text mt-0.5">
                  {clinicalStats?.avgTemp ? `${clinicalStats.avgTemp} °C` : "-"}
                </p>
              </div>
            </div>

            <div className="medical-card p-5 flex items-center gap-4">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <Weight size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Poids Moyen</p>
                <p className="text-xl font-bold text-text mt-0.5">
                  {clinicalStats?.avgWeight ? `${clinicalStats.avgWeight} kg` : "-"}
                </p>
              </div>
            </div>

            <div className="medical-card p-5 flex items-center gap-4">
              <div className="h-10 w-10 bg-success/10 rounded-lg flex items-center justify-center text-success">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Total perçu (CA)</p>
                <p className="text-xl font-bold text-text mt-0.5">{formatMoney(totalBilled)}</p>
              </div>
            </div>
          </section>

          {/* Detailed clinical histories & payments */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Consultations Column */}
            <section className="medical-card p-6 flex flex-col">
              <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                <Stethoscope size={18} className="text-primary" />
                Dossier de Consultations
              </h3>
              <div className="flex-1 space-y-4">
                {consultations.length === 0 ? (
                  <EmptyState title="Aucune consultation" text="Ce patient n'a pas encore de consultations enregistrées." />
                ) : (
                  consultations.map((consultation) => (
                    <div key={consultation.id} className="rounded-xl border border-border p-4 hover:bg-surface-soft transition-colors space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-bold text-text leading-tight">{consultation.motif}</p>
                          <p className="text-xs text-muted mt-1">{formatDate(consultation.date_consultation)}</p>
                        </div>
                        <Badge tone={consultation.status === "TERMINEE" ? "success" : "neutral"}>
                          {consultationLabel(consultation.status)}
                        </Badge>
                      </div>

                      {/* Clinical values summary if recorded */}
                      {(consultation.temperature || consultation.tension || consultation.poids) && (
                        <div className="flex flex-wrap gap-3 text-xs bg-white border border-border/40 p-2 rounded-lg text-muted font-semibold">
                          {consultation.tension && <span>Tension : {consultation.tension} mmHg</span>}
                          {consultation.temperature && <span>Temp. : {consultation.temperature} °C</span>}
                          {consultation.poids && <span>Poids : {consultation.poids} kg</span>}
                        </div>
                      )}

                      {consultation.diagnostic && (
                        <div className="text-xs text-text bg-primary/5 border border-primary/10 p-2.5 rounded-lg">
                          <span className="font-bold block mb-0.5 text-primary">Diagnostic :</span>
                          <span>{consultation.diagnostic}</span>
                        </div>
                      )}

                      {consultation.traitement && (
                        <div className="text-xs text-text bg-secondary/5 border border-secondary/10 p-2.5 rounded-lg">
                          <span className="font-bold block mb-0.5 text-secondary">Traitement prescrit :</span>
                          <span className="whitespace-pre-line">{consultation.traitement}</span>
                        </div>
                      )}

                      {consultation.notes && (
                        <div className="text-xs text-muted bg-surface-soft p-2.5 rounded-lg border border-border/20">
                          <span className="font-bold block mb-0.5 text-text">Notes cliniques :</span>
                          <p className="italic">{consultation.notes}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Payments Column */}
            <section className="medical-card p-6 flex flex-col">
              <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                <Receipt size={18} className="text-primary" />
                Historique des Factures
              </h3>
              <div className="flex-1 space-y-4">
                {payments.length === 0 ? (
                  <EmptyState title="Aucun règlement" text="Aucune transaction n'est enregistrée pour ce patient." />
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center rounded-xl border border-border p-4 hover:bg-surface-soft transition-colors">
                      <div className="space-y-1">
                        <p className="font-bold text-text leading-tight">{payment.type}</p>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span>{formatDate(payment.created_at)}</span>
                          <span>·</span>
                          <span className="font-semibold">{payment.mode_paiement}</span>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="font-black text-text text-lg leading-none">{formatMoney(payment.montant)}</p>
                        <Badge
                          tone={
                            payment.status === "COMPLETED"
                              ? "success"
                              : payment.status === "CANCELLED"
                                ? "error"
                                : "warning"
                          }
                        >
                          {payment.status === "COMPLETED" ? "Payé" : payment.status === "PENDING" ? "En attente" : "Annulé"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}
