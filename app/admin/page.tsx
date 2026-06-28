"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Activity,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Database,
  Globe,
  Clock,
  Layers,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowUpRight,
  Server,
  Cpu,
  BarChart3,
  FileText,
  UserCog,
  Lock,
} from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Area,
  AreaChart,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { displayRole, formatDate, formatMoney, initials } from "@/lib/utils";

type SysStats = {
  totalUsers: number;
  activeUsers: number;
  totalPatients: number;
  totalConsultations: number;
  totalPayments: number;
  totalRevenue: number;
  totalMedications: number;
  lowStockCount: number;
  totalExpenses: number;
};

type RoleDist = { role: string; count: number };
type DailyActivity = { day: string; consultations: number; payments: number };
type AuditEvent = {
  id: string;
  type: string;
  label: string;
  user: string;
  time: string;
};

export default function AdminPage() {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<SysStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalPatients: 0,
    totalConsultations: 0,
    totalPayments: 0,
    totalRevenue: 0,
    totalMedications: 0,
    lowStockCount: 0,
    totalExpenses: 0,
  });
  const [users, setUsers] = useState<Profile[]>([]);
  const [roleDist, setRoleDist] = useState<RoleDist[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  const fetchData = useCallback(async () => {
    setRefreshing(true);

    // 1. Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAccessDenied(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "ADMIN") {
      setAccessDenied(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setCurrentProfile(profile as Profile);

    // 2. Fetch all stats in parallel
    const [
      allUsersRes,
      activeUsersRes,
      patientsRes,
      consultationsRes,
      paymentsRes,
      revenueRes,
      medsRes,
      lowStockRes,
      expensesRes,
      allUsersListRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("consultations")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("status", "COMPLETED"),
      supabase
        .from("payments")
        .select("montant")
        .eq("status", "COMPLETED"),
      supabase
        .from("medications")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("medications")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .filter("stock", "lte", "threshold"),
      supabase.from("expenses").select("amount"),
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    const totalRevenue =
      revenueRes.data?.reduce((s, p) => s + Number(p.montant), 0) ?? 0;
    const totalExpenses =
      expensesRes.data?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;

    setStats({
      totalUsers: allUsersRes.count ?? 0,
      activeUsers: activeUsersRes.count ?? 0,
      totalPatients: patientsRes.count ?? 0,
      totalConsultations: consultationsRes.count ?? 0,
      totalPayments: paymentsRes.count ?? 0,
      totalRevenue,
      totalMedications: medsRes.count ?? 0,
      lowStockCount: lowStockRes.count ?? 0,
      totalExpenses,
    });

    const usersList = (allUsersListRes.data ?? []) as Profile[];
    setUsers(usersList);

    // 3. Role distribution
    const roleMap: Record<string, number> = {};
    usersList.forEach((u) => {
      roleMap[u.role] = (roleMap[u.role] ?? 0) + 1;
    });
    setRoleDist(
      Object.entries(roleMap).map(([role, count]) => ({
        role: displayRole(role as any),
        count,
      }))
    );

    // 4. Daily activity for last 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        key: d.toISOString().slice(0, 10),
        day: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(d),
        consultations: 0,
        payments: 0,
      };
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [consultsWeek, paymentsWeek] = await Promise.all([
      supabase
        .from("consultations")
        .select("date_consultation")
        .gte("date_consultation", sevenDaysAgo.toISOString()),
      supabase
        .from("payments")
        .select("created_at")
        .eq("status", "COMPLETED")
        .gte("created_at", sevenDaysAgo.toISOString()),
    ]);

    consultsWeek.data?.forEach((c) => {
      const key = String(c.date_consultation).slice(0, 10);
      const d = days.find((x) => x.key === key);
      if (d) d.consultations++;
    });
    paymentsWeek.data?.forEach((p) => {
      const key = String(p.created_at).slice(0, 10);
      const d = days.find((x) => x.key === key);
      if (d) d.payments++;
    });

    setDailyActivity(days);

    // 5. Synthetic audit log from recent DB activity
    const [recentConsults, recentPays, recentPatients] = await Promise.all([
      supabase
        .from("consultations")
        .select("id, motif, created_at, profiles(first_name, last_name), patients(nom, prenom)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("payments")
        .select("id, montant, type, created_at, profiles(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("patients")
        .select("id, nom, prenom, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const events: AuditEvent[] = [];

    (recentConsults.data ?? []).forEach((c: any) => {
      events.push({
        id: `c-${c.id}`,
        type: "consultation",
        label: `Consultation créée — ${c.patients?.prenom ?? ""} ${c.patients?.nom ?? ""} (${c.motif})`,
        user: c.profiles ? `${c.profiles.first_name} ${c.profiles.last_name}` : "Système",
        time: c.created_at,
      });
    });

    (recentPays.data ?? []).forEach((p: any) => {
      events.push({
        id: `p-${p.id}`,
        type: "payment",
        label: `Paiement enregistré — ${formatMoney(p.montant)} (${p.type})`,
        user: p.profiles ? `${p.profiles.first_name} ${p.profiles.last_name}` : "Système",
        time: p.created_at,
      });
    });

    (recentPatients.data ?? []).forEach((pt: any) => {
      events.push({
        id: `pt-${pt.id}`,
        type: "patient",
        label: `Nouveau dossier patient — ${pt.prenom} ${pt.nom}`,
        user: "Réception",
        time: pt.created_at,
      });
    });

    events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setAuditEvents(events.slice(0, 8));

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void fetchData();

    // Realtime subscription
    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => void fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => void fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "consultations" }, () => void fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => void fetchData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // ─── Access Denied ─────────────────────────────────────────────────────────
  if (accessDenied) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-error/10 text-error">
            <Lock size={40} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-text">Accès Refusé</h2>
            <p className="text-muted max-w-md">
              Cette section est réservée exclusivement aux administrateurs du système. Contactez votre administrateur si vous pensez que c&apos;est une erreur.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="btn-primary"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </AppShell>
    );
  }

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppShell>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-32" />
          ))}
        </div>
      </AppShell>
    );
  }

  const profitMargin =
    stats.totalRevenue > 0
      ? Math.round(((stats.totalRevenue - stats.totalExpenses) / stats.totalRevenue) * 100)
      : 0;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-primary/5 to-transparent p-6 md:p-8">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={22} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Administration Système
              </span>
            </div>
            <h1 className="text-3xl font-black text-text tracking-tight">
              Centre de Contrôle AMKA
            </h1>
            <p className="text-sm text-muted max-w-xl">
              Supervision globale de la plateforme · Statistiques en temps réel · Gestion des accès et des utilisateurs
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-bold text-success">Système opérationnel</span>
            </div>
            <button
              onClick={() => void fetchData()}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-4 py-2 text-xs font-bold text-text hover:bg-primary/5 transition-all active:scale-95"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Actualiser
            </button>
          </div>
        </div>
        {/* Decorative background circles */}
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-primary/5 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute right-16 bottom-0 h-32 w-32 rounded-full bg-primary/3 translate-y-1/2" />
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: "Utilisateurs",
            value: stats.totalUsers,
            sub: `${stats.activeUsers} actifs`,
            icon: Users,
            tone: "primary",
          },
          {
            label: "Patients Enregistrés",
            value: stats.totalPatients,
            sub: "Dossiers actifs",
            icon: Activity,
            tone: "secondary",
          },
          {
            label: "Chiffre d'Affaires",
            value: formatMoney(stats.totalRevenue),
            sub: `Marge : ${profitMargin}%`,
            icon: TrendingUp,
            tone: "success",
          },
          {
            label: "Alertes Stock",
            value: stats.lowStockCount,
            sub: `sur ${stats.totalMedications} références`,
            icon: AlertTriangle,
            tone: "error",
          },
        ].map((card) => {
          const Icon = card.icon;
          const toneClasses: Record<string, string> = {
            primary: "bg-primary/10 text-primary",
            secondary: "bg-secondary/10 text-secondary",
            success: "bg-success/10 text-success",
            error: "bg-error/10 text-error",
          };
          return (
            <div key={card.label} className="medical-card p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">{card.label}</span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses[card.tone]}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-text leading-tight">{card.value}</p>
                <p className="text-xs text-muted mt-0.5 font-medium">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Secondary Stats Row ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Consultations", value: stats.totalConsultations, icon: FileText, color: "#4648d4" },
          { label: "Paiements validés", value: stats.totalPayments, icon: CheckCircle2, color: "#12b980" },
          { label: "Médicaments actifs", value: stats.totalMedications, icon: Database, color: "#f59e0b" },
          { label: "Charges enregistrées", value: formatMoney(stats.totalExpenses), icon: BarChart3, color: "#ef4444" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="medical-card p-4 flex items-center gap-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${item.color}18` }}
              >
                <Icon size={20} style={{ color: item.color }} />
              </div>
              <div>
                <p className="text-xl font-black text-text leading-tight">{item.value}</p>
                <p className="text-[11px] text-muted font-semibold">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity Chart */}
        <section className="medical-card p-6 lg:col-span-2 flex flex-col gap-4">
          <div>
            <h3 className="text-base font-bold text-text">Activité sur 7 jours</h3>
            <p className="text-xs text-muted mt-0.5">Consultations et paiements journaliers</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyActivity} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4648d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4648d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#12b980" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#12b980" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#767586", fontWeight: 600 }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: "#c7c4d7", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
                  labelStyle={{ fontSize: 12, fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="consultations" stroke="#4648d4" strokeWidth={2} fill="url(#gradC)" name="Consultations" dot={false} />
                <Area type="monotone" dataKey="payments" stroke="#12b980" strokeWidth={2} fill="url(#gradP)" name="Paiements" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 text-xs font-semibold text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-primary inline-block" /> Consultations</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-success inline-block" /> Paiements</span>
          </div>
        </section>

        {/* Role Distribution */}
        <section className="medical-card p-6 flex flex-col gap-4">
          <div>
            <h3 className="text-base font-bold text-text">Répartition des Rôles</h3>
            <p className="text-xs text-muted mt-0.5">{stats.totalUsers} comptes utilisateurs</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleDist} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="role" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#767586", fontWeight: 700 }} width={90} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: "#c7c4d7" }}
                  labelStyle={{ fontSize: 12, fontWeight: 700 }}
                />
                <Bar dataKey="count" fill="#4648d4" radius={[0, 6, 6, 0]} name="Utilisateurs" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Link href="/users" className="flex items-center justify-center gap-2 text-xs font-bold text-primary hover:underline mt-auto">
            Gérer les utilisateurs <ArrowUpRight size={13} />
          </Link>
        </section>
      </div>

      {/* ── Users Table + Audit Log ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Users Table */}
        <section className="medical-card overflow-hidden flex flex-col">
          <div className="border-b border-border p-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-text">Comptes Utilisateurs</h3>
              <p className="text-xs text-muted mt-0.5">Gestion des accès et des rôles</p>
            </div>
            <Link
              href="/users"
              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              Gérer <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto flex-1">
            {users.length === 0 ? (
              <div className="p-8">
                <EmptyState title="Aucun utilisateur trouvé" />
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="table-head">
                  <tr>
                    <th className="px-5 py-3">Utilisateur</th>
                    <th className="px-5 py-3">Rôle</th>
                    <th className="px-5 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.slice(0, 6).map((u) => (
                    <tr key={u.id} className="hover:bg-surface-soft transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                            {initials(u.first_name, u.last_name)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text leading-tight">{u.first_name} {u.last_name}</p>
                            <p className="text-[10px] text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          tone={
                            u.role === "ADMIN"
                              ? "error"
                              : u.role === "MEDECIN_DIRECTEUR"
                              ? "primary"
                              : u.role === "RECEPTIONIST"
                              ? "success"
                              : "warning"
                          }
                        >
                          {displayRole(u.role)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        {u.is_active ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-success">
                            <CheckCircle2 size={12} /> Actif
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-error">
                            <XCircle size={12} /> Inactif
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {users.length > 6 && (
            <div className="border-t border-border p-4 text-center">
              <Link href="/users" className="text-xs font-bold text-primary hover:underline">
                Voir les {users.length - 6} autres utilisateurs →
              </Link>
            </div>
          )}
        </section>

        {/* Audit / Activity Log */}
        <section className="medical-card p-6 flex flex-col gap-4">
          <div>
            <h3 className="text-base font-bold text-text">Journal d&apos;Audit Système</h3>
            <p className="text-xs text-muted mt-0.5">Dernières opérations enregistrées sur la plateforme</p>
          </div>

          {auditEvents.length === 0 ? (
            <EmptyState title="Aucune activité récente" />
          ) : (
            <div className="relative border-l-2 border-primary/15 pl-5 space-y-5 flex-1">
              {auditEvents.map((ev) => {
                const dotColor =
                  ev.type === "consultation"
                    ? "bg-primary"
                    : ev.type === "payment"
                    ? "bg-success"
                    : "bg-warning";
                const timeStr = new Date(ev.time).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div key={ev.id} className="relative group">
                    <div className={`absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${dotColor}`} />
                    <p className="text-xs font-semibold text-text leading-snug">{ev.label}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-muted font-medium flex items-center gap-1">
                        <UserCog size={10} /> {ev.user}
                      </span>
                      <span className="text-[10px] text-muted font-medium flex items-center gap-1">
                        <Clock size={10} /> {timeStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── System Status Panel ── */}
      <section className="medical-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-text">État du Système</h3>
            <p className="text-xs text-muted mt-0.5">Santé des services de la plateforme AMKA</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              name: "Base de données Supabase",
              icon: Database,
              status: "operational",
              detail: "PostgreSQL 15 · Réplication active",
            },
            {
              name: "Authentification",
              icon: Lock,
              status: "operational",
              detail: "JWT · Sessions sécurisées",
            },
            {
              name: "Temps réel (Realtime)",
              icon: Globe,
              status: "operational",
              detail: "WebSocket · Subscriptions actives",
            },
            {
              name: "Stockage Fichiers",
              icon: Server,
              status: "operational",
              detail: "CDN distribué · Disponibilité 99.9%",
            },
          ].map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.name}
                className="flex items-start gap-3 rounded-xl border border-border bg-surface-soft p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-text truncate">{service.name}</p>
                  </div>
                  <p className="text-[10px] text-muted mt-0.5">{service.detail}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="inline-flex h-2 w-2 rounded-full bg-success animate-pulse" />
                    <span className="text-[10px] font-bold text-success uppercase tracking-wide">Opérationnel</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Quick Admin Actions ── */}
      <section className="medical-card p-6">
        <h3 className="text-base font-bold text-text mb-4">Actions Administrateur</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: "/users", label: "Gérer les Utilisateurs", icon: UserCog, color: "primary" },
            { href: "/pharmacy", label: "Inventaire Pharmacie", icon: Database, color: "warning" },
            { href: "/accounting", label: "Comptabilité", icon: BarChart3, color: "success" },
            { href: "/settings", label: "Paramètres Système", icon: Layers, color: "secondary" },
          ].map((action) => {
            const Icon = action.icon;
            const colorMap: Record<string, string> = {
              primary: "bg-primary/8 hover:bg-primary/15 border-primary/15 text-primary",
              warning: "bg-warning/8 hover:bg-warning/15 border-warning/15 text-warning",
              success: "bg-success/8 hover:bg-success/15 border-success/15 text-success",
              secondary: "bg-secondary/8 hover:bg-secondary/15 border-secondary/15 text-secondary",
            };
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200 active:scale-95 ${colorMap[action.color]}`}
              >
                <Icon size={22} />
                <span className="text-xs font-bold text-center leading-tight">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
