"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus, Search, RefreshCw, Edit3, Shield,
  ShieldOff, UserCheck, X, Users, Lock,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/types";
import { displayRole, initials, formatDate } from "@/lib/utils";

const ROLES: UserRole[] = [
  "ADMIN",
  "MEDECIN_DIRECTEUR",
  "RECEPTIONIST",
  "PERCEPTEUR",
  "PHARMACIEN",
  "COMPTABLE",
];

const ROLE_TONE: Record<UserRole, "primary" | "success" | "warning" | "neutral" | "error"> = {
  ADMIN: "error",
  MEDECIN_DIRECTEUR: "primary",
  RECEPTIONIST: "success",
  PERCEPTEUR: "warning",
  PHARMACIEN: "neutral",
  COMPTABLE: "neutral",
};

type ModalMode = "edit" | null;

export default function UsersPage() {
  const [accessDenied, setAccessDenied] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", role: "RECEPTIONIST" as UserRole });

  // Vérification accès admin dès le montage
  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAccessDenied(true); setLoading(false); return; }
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (!prof || prof.role !== "ADMIN") { setAccessDenied(true); setLoading(false); }
    }
    void checkAccess();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let req = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (debouncedQuery.trim()) {
      const term = `%${debouncedQuery.trim()}%`;
      req = req.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`);
    }
    const { data, error } = await req;
    if (error) setToast({ tone: "error", message: error.message });
    setUsers((data ?? []) as Profile[]);
    setLoading(false);
  }, [debouncedQuery]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  function openEdit(user: Profile) {
    setSelected(user);
    setForm({ first_name: user.first_name, last_name: user.last_name, role: user.role });
    setModalMode("edit");
  }
  function closeModal() { setModalMode(null); setSelected(null); }

  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      first_name: form.first_name,
      last_name: form.last_name,
      role: form.role,
    }).eq("id", selected.id);
    setSaving(false);
    if (error) { setToast({ tone: "error", message: error.message }); return; }
    setToast({ tone: "success", message: "Profil mis à jour avec succès." });
    closeModal();
    void fetchUsers();
  }

  async function toggleActive(user: Profile) {
    const { error } = await supabase.from("profiles").update({ is_active: !user.is_active }).eq("id", user.id);
    if (error) { setToast({ tone: "error", message: error.message }); return; }
    setToast({ tone: "success", message: user.is_active ? "Compte désactivé." : "Compte réactivé." });
    void fetchUsers();
  }

  const activeCount = users.filter((u) => u.is_active).length;

  // ─── Accès refusé ─────────────────────────────────────────────────────────
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
              La gestion des utilisateurs est réservée exclusivement aux administrateurs.
            </p>
          </div>
          <Link href="/dashboard" className="btn-primary">
            Retour au tableau de bord
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Administration</p>
          <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Gestion des Utilisateurs</h2>
          <p className="mt-1 text-muted text-sm">Gérez les accès, rôles et droits des membres de l'équipe.</p>
        </div>
      </div>

      {/* Stats Pills */}
      <div className="grid grid-cols-3 gap-3">
        <div className="medical-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Users className="text-primary" size={18} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Total</p>
            <p className="text-xl font-black text-text">{users.length}</p>
          </div>
        </div>
        <div className="medical-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
            <UserCheck className="text-success" size={18} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Actifs</p>
            <p className="text-xl font-black text-text">{activeCount}</p>
          </div>
        </div>
        <div className="medical-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error/10">
            <ShieldOff className="text-error" size={18} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Inactifs</p>
            <p className="text-xl font-black text-text">{users.length - activeCount}</p>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <section className="medical-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border bg-surface p-5 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-surface-soft border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition text-sm text-text placeholder:text-muted/70"
              placeholder="Rechercher par nom ou email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button onClick={() => void fetchUsers()} className="btn-secondary flex items-center gap-2 text-xs">
            <RefreshCw size={13} /> Actualiser
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">{Array.from({ length: 6 }).map((_, i) => <div className="skeleton h-16" key={i} />)}</div>
        ) : users.length === 0 ? (
          <div className="p-12"><EmptyState title="Aucun utilisateur trouvé" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="table-head">
                <tr>
                  <th className="px-6 py-4">Utilisateur</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Rôle</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Inscrit le</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-surface-soft transition-colors ${!user.is_active ? "opacity-50" : ""}`}>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-xs font-black">
                          {initials(user.first_name, user.last_name)}
                        </div>
                        <div>
                          <p className="font-bold text-text">{user.first_name} {user.last_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-muted">{user.email}</td>
                    <td className="px-6 py-3.5">
                      <Badge tone={ROLE_TONE[user.role]}>{displayRole(user.role)}</Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge tone={user.is_active ? "success" : "error"}>
                        {user.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-muted">{formatDate(user.created_at)}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(user)}
                          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-muted hover:border-primary hover:text-primary transition-all"
                          title="Modifier le rôle"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => void toggleActive(user)}
                          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${
                            user.is_active
                              ? "border-border text-muted hover:border-error hover:text-error"
                              : "border-border text-muted hover:border-success hover:text-success"
                          }`}
                          title={user.is_active ? "Désactiver" : "Réactiver"}
                        >
                          {user.is_active ? <ShieldOff size={13} /> : <Shield size={13} />}
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
          <p className="text-xs text-muted font-semibold">{users.length} utilisateur(s) · {activeCount} actifs</p>
        </div>
      </section>

      {/* Edit Modal */}
      {modalMode === "edit" && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="medical-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-text">Modifier le Profil</h3>
              <button onClick={closeModal} className="text-muted hover:text-text"><X size={20} /></button>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-surface-soft border border-border">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-xl font-black">
                {initials(selected.first_name, selected.last_name)}
              </div>
              <div>
                <p className="font-bold text-text">{selected.email}</p>
                <p className="text-xs text-muted mt-0.5">{displayRole(selected.role)}</p>
              </div>
            </div>

            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="label">Prénom</span>
                  <input className="input-field" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
                </label>
                <label className="block">
                  <span className="label">Nom</span>
                  <input className="input-field" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
                </label>
              </div>
              <label className="block">
                <span className="label">Rôle</span>
                <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                  {ROLES.map((r) => <option key={r} value={r}>{displayRole(r)}</option>)}
                </select>
              </label>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={closeModal}>Annuler</button>
                <button className="btn-primary" type="submit" disabled={saving}>
                  {saving ? "Enregistrement..." : "Mettre à Jour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
