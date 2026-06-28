"use client";

import { FormEvent, useEffect, useState } from "react";
import { User, Lock, Bell, Save, LayoutGrid, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { displayRole } from "@/lib/utils";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "" });
  const [pwForm, setPwForm] = useState({ next: "", confirm: "" });

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setProfile(data as Profile);
        setForm({ first_name: data.first_name, last_name: data.last_name });
      }
    }
    void load();
  }, []);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: form.first_name, last_name: form.last_name })
      .eq("id", profile.id);
    setSaving(false);
    setToast(
      error
        ? { tone: "error", message: error.message }
        : { tone: "success", message: "Profil mis à jour avec succès !" },
    );
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setToast({ tone: "error", message: "Les mots de passe ne correspondent pas." });
      return;
    }
    if (pwForm.next.length < 8) {
      setToast({
        tone: "error",
        message: "Le mot de passe doit contenir au moins 8 caractères.",
      });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.next });
    setChangingPassword(false);
    if (error) {
      setToast({ tone: "error", message: error.message });
      return;
    }
    setToast({ tone: "success", message: "Mot de passe modifié avec succès." });
    setPwForm({ next: "", confirm: "" });
  }

  const isAdmin = profile?.role === "ADMIN";

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Page header */}
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Mon Compte
        </p>
        <h2 className="mt-2 text-3xl font-black text-text tracking-tight">Paramètres</h2>
        <p className="mt-1 text-muted text-sm">
          Gérez votre profil, vos identifiants et vos préférences.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">

        {/* ── Informations personnelles ── */}
        <section className="medical-card p-6">
          <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <User size={18} className="text-primary" />
            Informations Personnelles
          </h3>
          {/* Current role badge */}
          {profile && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-border bg-surface-soft px-3 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Rôle :</span>
              <span className="text-xs font-bold text-text">{displayRole(profile.role)}</span>
            </div>
          )}
          <form onSubmit={saveProfile} className="space-y-4">
            <label className="block">
              <span className="label">Email</span>
              <input
                className="input-field bg-surface-soft cursor-not-allowed opacity-60"
                value={profile?.email ?? ""}
                disabled
                readOnly
              />
              <p className="text-xs text-muted mt-1">
                L&apos;email ne peut pas être modifié ici.
              </p>
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Prénom</span>
                <input
                  className="input-field"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className="label">Nom de Famille</span>
                <input
                  className="input-field"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                className="btn-primary flex items-center gap-2"
                type="submit"
                disabled={saving}
              >
                <Save size={16} />
                {saving ? "Enregistrement..." : "Sauvegarder"}
              </button>
            </div>
          </form>
        </section>

        {/* ── Changer le mot de passe ── */}
        <section className="medical-card p-6">
          <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <Lock size={18} className="text-primary" />
            Changer le Mot de Passe
          </h3>
          <form onSubmit={changePassword} className="space-y-4">
            <label className="block">
              <span className="label">Nouveau Mot de Passe</span>
              <input
                className="input-field"
                type="password"
                value={pwForm.next}
                onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                placeholder="Minimum 8 caractères"
                required
                minLength={8}
              />
            </label>
            <label className="block">
              <span className="label">Confirmer le Mot de Passe</span>
              <input
                className="input-field"
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                placeholder="Répétez le nouveau mot de passe"
                required
              />
            </label>
            {pwForm.next && pwForm.confirm && pwForm.next !== pwForm.confirm && (
              <p className="text-xs text-error font-semibold">
                ⚠ Les mots de passe ne correspondent pas.
              </p>
            )}
            {pwForm.next && pwForm.confirm && pwForm.next === pwForm.confirm && (
              <p className="text-xs text-success font-semibold">
                ✓ Les mots de passe correspondent.
              </p>
            )}
            <div className="flex justify-end">
              <button
                className="btn-primary flex items-center gap-2"
                type="submit"
                disabled={changingPassword}
              >
                <Lock size={16} />
                {changingPassword ? "Modification..." : "Changer le mot de passe"}
              </button>
            </div>
          </form>
        </section>

        {/* ── Préférences interface ── */}
        <section className="medical-card p-6">
          <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <Bell size={18} className="text-primary" />
            Préférences (Interface)
          </h3>
          <div className="space-y-3">
            {[
              { label: "Alertes de stock faible en pharmacie", default: true },
              { label: "Notifications de nouvelles consultations", default: true },
              { label: "Résumé financier quotidien", default: false },
            ].map((pref) => (
              <label
                key={pref.label}
                className="flex items-center justify-between rounded-xl border border-border bg-surface-soft px-4 py-3 cursor-pointer hover:bg-surface-mid transition-colors"
              >
                <span className="text-sm font-semibold text-text">{pref.label}</span>
                <input
                  type="checkbox"
                  defaultChecked={pref.default}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            ))}
          </div>
        </section>

        {/* ── Section Admin — visible uniquement pour ADMIN ── */}
        {isAdmin && (
          <section className="medical-card p-6 border-primary/20">
            <h3 className="text-base font-bold text-text mb-1 flex items-center gap-2">
              <LayoutGrid size={18} className="text-primary" />
              Administration Système
            </h3>
            <p className="text-xs text-muted mb-5">
              Ces options sont réservées à l&apos;administrateur de la plateforme.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  href: "/admin",
                  label: "Tableau de Bord Admin",
                  desc: "Statistiques globales, audit et santé du système",
                },
                {
                  href: "/users",
                  label: "Gestion des Utilisateurs",
                  desc: "Créer, modifier et gérer les comptes et rôles",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-start justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 hover:bg-primary/10 transition-all group"
                >
                  <div>
                    <p className="text-sm font-bold text-text group-hover:text-primary transition-colors">
                      {item.label}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{item.desc}</p>
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="shrink-0 mt-0.5 text-muted group-hover:text-primary transition-colors"
                  />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
