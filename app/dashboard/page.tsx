"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  Users,
  Wallet,
  Clock,
  ArrowRight,
  Plus,
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  Pill,
} from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import type { Consultation, Patient, Profile, Payment } from "@/lib/types";
import {
  consultationLabel,
  formatMoney,
  formatTime,
  formatDate,
  todayIsoDate,
} from "@/lib/utils";

type Stats = {
  patients: number;
  consultationsToday: number;
  revenueToday: number;
  stockAlerts: number;
};

type RevenuePoint = {
  day: string;
  value: number;
};

type TimelineEvent = {
  id: string;
  type: "patient" | "consultation" | "payment";
  title: string;
  subtitle: string;
  time: string;
};

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({
    patients: 0,
    consultationsToday: 0,
    revenueToday: 0,
    stockAlerts: 0,
  });
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const weekTotal = useMemo(
    () => revenue.reduce((sum, item) => sum + item.value, 0),
    [revenue],
  );

  async function fetchData() {
    setLoading(true);
    const today = todayIsoDate();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [
      authUser,
      patientsCount,
      consultationsToday,
      paymentsToday,
      stockAlerts,
      recentConsultations,
      recentPatients,
      paymentsWeek,
      recentPayments,
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("consultations")
        .select("id", { count: "exact", head: true })
        .gte("date_consultation", `${today}T00:00:00`)
        .lt("date_consultation", `${today}T23:59:59`),
      supabase
        .from("payments")
        .select("montant")
        .eq("status", "COMPLETED")
        .gte("created_at", `${today}T00:00:00`)
        .lt("created_at", `${today}T23:59:59`),
      supabase
        .from("medications")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .filter("stock", "lte", "threshold"),
      supabase
        .from("consultations")
        .select(
          "*, patients(nom, prenom, numero_dossier), profiles(first_name, last_name)",
        )
        .order("date_consultation", { ascending: false })
        .limit(5),
      supabase
        .from("patients")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("payments")
        .select("montant, created_at")
        .eq("status", "COMPLETED")
        .gte("created_at", sevenDaysAgo.toISOString()),
      supabase
        .from("payments")
        .select("*, patients(nom, prenom)")
        .eq("status", "COMPLETED")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    // Load Profile
    if (authUser.data.user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.data.user.id)
        .maybeSingle();
      
      if (prof) {
        setProfile(prof as Profile);
      } else {
        const meta = authUser.data.user.user_metadata ?? {};
        const firstName = meta.first_name ?? meta.full_name?.split(" ")[0] ?? authUser.data.user.email?.split("@")[0] ?? "Utilisateur";
        const lastName = meta.last_name ?? meta.full_name?.split(" ").slice(1).join(" ") ?? "";
        setProfile({
          id: authUser.data.user.id,
          email: authUser.data.user.email ?? "",
          first_name: firstName,
          last_name: lastName,
          role: (meta.role as any) ?? "RECEPTIONIST",
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }
    }

    const revenueTodayValue =
      paymentsToday.data?.reduce(
        (sum, payment) => sum + Number(payment.montant),
        0,
      ) ?? 0;

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return {
        key: date.toISOString().slice(0, 10),
        day: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(
          date,
        ),
        value: 0,
      };
    });

    paymentsWeek.data?.forEach((payment) => {
      const key = String(payment.created_at).slice(0, 10);
      const day = days.find((item) => item.key === key);
      if (day) day.value += Number(payment.montant);
    });

    setStats({
      patients: patientsCount.count ?? 0,
      consultationsToday: consultationsToday.count ?? 0,
      revenueToday: revenueTodayValue,
      stockAlerts: stockAlerts.count ?? 0,
    });

    setConsultations((recentConsultations.data ?? []) as Consultation[]);
    setPatients((recentPatients.data ?? []) as Patient[]);
    setRevenue(days.map(({ day, value }) => ({ day, value })));

    // Synthesize a live timeline activity feed
    const events: TimelineEvent[] = [];

    (recentPatients.data ?? []).forEach((p: any) => {
      events.push({
        id: `p-${p.id}`,
        type: "patient",
        title: "Nouveau patient enregistré",
        subtitle: `${p.prenom} ${p.nom} (Dossier: ${p.numero_dossier})`,
        time: p.created_at,
      });
    });

    (recentConsultations.data ?? []).forEach((c: any) => {
      events.push({
        id: `c-${c.id}`,
        type: "consultation",
        title: "Nouvelle consultation initiée",
        subtitle: `Patient: ${c.patients?.prenom} ${c.patients?.nom} · Motif: ${c.motif}`,
        time: c.date_consultation,
      });
    });

    (recentPayments.data ?? []).forEach((pay: any) => {
      events.push({
        id: `pay-${pay.id}`,
        type: "payment",
        title: "Paiement perçu",
        subtitle: `Montant: ${formatMoney(pay.montant)} pour ${pay.type} (${pay.mode_paiement})`,
        time: pay.created_at,
      });
    });

    // Sort events by time desc
    events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setTimelineEvents(events.slice(0, 5));
    setLoading(false);
  }

  useEffect(() => {
    void fetchData();
    const channel = supabase
      .channel("dashboard-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patients" },
        () => void fetchData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultations" },
        () => void fetchData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => void fetchData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medications" },
        () => void fetchData(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // Format date helper for french greeting
  const longDateStr = useMemo(() => {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }, []);

  return (
    <AppShell>
      {/* Humanized Welcome Banner */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-6 rounded-2xl border border-primary/10">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-text tracking-tight">
            {profile
              ? `Bonjour ${profile.first_name} !`
              : "Bonjour !"}</h2>
          <p className="text-muted text-sm max-w-xl">
            {profile?.role === "RECEPTIONIST" &&
              "Prêt à accueillir et enregistrer les patients du jour ? Retrouvez la liste des dossiers cliniques ci-dessous."}
            {profile?.role === "MEDECIN_DIRECTEUR" &&
              "Vos consultations en attente et l'activité clinique en temps réel de votre établissement."}
            {profile?.role === "PHARMACIEN" &&
              "Gérez l'inventaire des médicaments et effectuez les ventes quotidiennes en toute simplicité."}
            {profile?.role === "COMPTABLE" &&
              "Analysez les flux financiers, enregistrez les charges d'exploitation et téléchargez le grand livre."}
            {profile?.role === "PERCEPTEUR" &&
              "Percevez les paiements des patients et imprimez les reçus officiels en temps réel."}
            {profile?.role === "ADMIN" &&
              "Supervisez l'intégralité du système médical, contrôlez les stocks et administrez les utilisateurs."}
            {!profile && "Bienvenue sur votre plateforme de gestion clinique."}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-start md:items-end">
          <span className="text-xs font-bold text-muted uppercase tracking-widest">
            Date d'aujourd'hui
          </span>
          <span className="text-base font-bold text-text mt-1">{longDateStr}</span>
        </div>
      </div>

      {/* Main Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Dossiers Patients"
            value={stats.patients}
            helper="+12% actifs"
            icon={Users}
            tone="primary"
          />
          <StatCard
            label="Consultations (Jour)"
            value={stats.consultationsToday}
            helper="En cours"
            icon={CalendarCheck}
            tone="secondary"
          />
          <StatCard
            label="Revenus perçus (Jour)"
            value={formatMoney(stats.revenueToday)}
            helper="Caisse validée"
            icon={Wallet}
            tone="success"
          />
          <StatCard
            label="Alertes Stock Pharmacie"
            value={`${stats.stockAlerts} articles`}
            helper="Action requise"
            icon={AlertTriangle}
            tone="error"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Consultations Table */}
        <section className="medical-card overflow-hidden lg:col-span-2 flex flex-col">
          <div className="border-b border-border p-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-text">Consultations Récentes</h3>
              <p className="text-xs text-muted mt-0.5">Dernières fiches médicales mises à jour</p>
            </div>
            {(profile?.role === "ADMIN" ||
              profile?.role === "RECEPTIONIST" ||
              profile?.role === "MEDECIN_DIRECTEUR") && (
              <Link href="/consultations/new" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                <span>Planifier</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
          <div className="flex-1 overflow-x-auto">
            {consultations.length === 0 ? (
              <div className="p-12">
                <EmptyState title="Aucune consultation récente" />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="table-head">
                  <tr>
                    <th className="px-6 py-4">Patient</th>
                    <th className="px-6 py-4">Médecin</th>
                    <th className="px-6 py-4">Heure</th>
                    <th className="px-6 py-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {consultations.map((consultation) => (
                    <tr key={consultation.id} className="hover:bg-surface-soft transition-colors">
                      <td className="px-6 py-3">
                        <Link href={`/patients/${consultation.patient_id}`} className="font-bold text-text hover:text-primary transition-colors block">
                          {consultation.patients
                            ? `${consultation.patients.prenom} ${consultation.patients.nom}`
                            : "-"}
                        </Link>
                        <span className="text-[10px] text-muted font-bold block mt-0.5">
                          {consultation.patients?.numero_dossier}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-text">
                        {consultation.profiles
                          ? `Dr. ${consultation.profiles.last_name}`
                          : "-"}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-text">
                        {formatTime(consultation.date_consultation)}
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          tone={
                            consultation.status === "TERMINEE"
                              ? "success"
                              : consultation.status === "EN_COURS"
                                ? "primary"
                                : consultation.status === "ANNULEE"
                                  ? "error"
                                  : "warning"
                          }
                        >
                          {consultationLabel(consultation.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Weekly Revenue Graph */}
        <section className="medical-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-text">Activité Financière</h3>
            <p className="text-xs text-muted mt-0.5">Chiffre d'affaires consolidé des 7 derniers jours</p>
          </div>
          
          <div className="my-6">
            <p className="text-xs text-muted font-semibold uppercase tracking-wider">Volume total de la semaine</p>
            <p className="text-3xl font-black text-text mt-1">{formatMoney(weekTotal)}</p>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4648d4" stopOpacity={1}/>
                    <stop offset="95%" stopColor="#6063ee" stopOpacity={0.25}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#767586', fontWeight: 600 }} />
                <YAxis hide />
                <Tooltip
                  formatter={(value) => [formatMoney(Number(value)), "Revenus"]}
                  labelStyle={{ fontSize: 12, fontWeight: 700 }}
                  contentStyle={{ borderRadius: 12, borderColor: '#c7c4d7', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
                  cursor={{ fill: "rgba(70,72,212,0.04)", radius: 6 }}
                />
                <Bar dataKey="value" fill="url(#colorRevenue)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity Timeline Feed */}
        <section className="medical-card p-6 lg:col-span-2">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-text">Journal d'Activité Clinique</h3>
            <p className="text-xs text-muted mt-0.5">Événements enregistrés sur l'établissement en temps réel</p>
          </div>
          
          {timelineEvents.length === 0 ? (
            <div className="py-6">
              <EmptyState title="Aucune activité récente." />
            </div>
          ) : (
            <div className="relative border-l border-border pl-6 space-y-6 py-2">
              {timelineEvents.map((event) => (
                <div key={event.id} className="relative group">
                  {/* Timeline point */}
                  <div className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-primary group-hover:scale-110 transition-transform">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text">{event.title}</span>
                      <span className="text-[10px] text-muted font-bold flex items-center gap-1">
                        <Clock size={10} />
                        {formatTime(event.time)}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1 font-medium">{event.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Dynamic Quick Actions Panel */}
        <section className="medical-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-text">Actions Rapides</h3>
            <p className="text-xs text-muted mt-0.5">Raccourcis configurés pour votre rôle utilisateur</p>
          </div>

          <div className="grid grid-cols-1 gap-3 my-6">
            {(profile?.role === "ADMIN" || profile?.role === "RECEPTIONIST") && (
              <>
                <Link
                  href="/patients"
                  className="flex items-center justify-between p-3.5 bg-surface-soft hover:bg-primary/5 hover:border-primary/40 border border-border/40 rounded-xl transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                      <Users size={18} />
                    </div>
                    <span className="text-sm font-semibold text-text">Enregistrer un Patient</span>
                  </div>
                  <ArrowRight size={16} className="text-muted" />
                </Link>
                <Link
                  href="/consultations/new"
                  className="flex items-center justify-between p-3.5 bg-surface-soft hover:bg-primary/5 hover:border-primary/40 border border-border/40 rounded-xl transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                      <CalendarCheck size={18} />
                    </div>
                    <span className="text-sm font-semibold text-text">Nouvelle Consultation</span>
                  </div>
                  <ArrowRight size={16} className="text-muted" />
                </Link>
              </>
            )}

            {(profile?.role === "ADMIN" || profile?.role === "PERCEPTEUR" || profile?.role === "COMPTABLE") && (
              <Link
                href="/payments"
                className="flex items-center justify-between p-3.5 bg-surface-soft hover:bg-primary/5 hover:border-primary/40 border border-border/40 rounded-xl transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <Wallet size={18} />
                  </div>
                  <span className="text-sm font-semibold text-text">Enregistrer Paiement</span>
                </div>
                <ArrowRight size={16} className="text-muted" />
              </Link>
            )}

            {(profile?.role === "ADMIN" || profile?.role === "PHARMACIEN") && (
              <Link
                href="/pharmacy"
                className="flex items-center justify-between p-3.5 bg-surface-soft hover:bg-primary/5 hover:border-primary/40 border border-border/40 rounded-xl transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <Pill size={18} />
                  </div>
                  <span className="text-sm font-semibold text-text">Nouvelle Vente Pharmacie</span>
                </div>
                <ArrowRight size={16} className="text-muted" />
              </Link>
            )}

            {(profile?.role === "ADMIN" || profile?.role === "COMPTABLE") && (
              <Link
                href="/accounting"
                className="flex items-center justify-between p-3.5 bg-surface-soft hover:bg-primary/5 hover:border-primary/40 border border-border/40 rounded-xl transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <Activity size={18} />
                  </div>
                  <span className="text-sm font-semibold text-text">Enregistrer une Charge</span>
                </div>
                <ArrowRight size={16} className="text-muted" />
              </Link>
            )}
          </div>
          
          <div className="text-[10px] font-semibold text-muted text-center uppercase tracking-wider bg-surface-soft py-2 rounded-xl border border-border/40 select-none">
            Système Médical AMKA
          </div>
        </section>
      </div>
    </AppShell>
  );
}
