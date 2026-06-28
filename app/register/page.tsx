"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/ui/Logo";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          first_name: form.first_name,
          last_name: form.last_name,
          role: "RECEPTIONIST",
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (data.user) {
      // Upsert in profiles table
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        role: "RECEPTIONIST",
        is_active: true,
      });

      if (profileError) {
        setLoading(false);
        setError(profileError.message);
        return;
      }

      setLoading(false);
      
      // Check if session exists (if auto-confirm is enabled)
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setMessage(
          "Inscription réussie ! Veuillez vérifier votre boîte de réception pour valider votre compte."
        );
        setForm({ first_name: "", last_name: "", email: "", password: "" });
      }
    }
  }

  return (
    <main className="min-h-screen flex bg-background font-sans">
      {/* Left Section - Branding & Info (40%) */}
      <aside className="hidden lg:flex w-[40%] bg-gradient-to-br from-primary via-[#4648d4] to-indigo-600 relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Subtle dot overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[size:32px_32px] opacity-70 pointer-events-none"></div>

        {/* Glow decoration */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-secondary-container/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] border border-white/5 rounded-full -translate-x-1/4 translate-y-1/4 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="mb-16 bg-white p-3.5 rounded-2xl w-fit shadow-lg shadow-indigo-950/20">
            <Logo size="sm" />
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl lg:text-5xl font-black leading-tight tracking-tight max-w-md">
              Rejoignez l'équipe médicale
            </h2>
            <p className="text-lg text-white/80 leading-relaxed max-w-sm">
              Créez votre accès personnel au système clinique et commencez à collaborer.
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-2xl my-8">
          <div className="flex items-center gap-2 mb-3 text-secondary-container">
            <ClipboardList size={20} />
            <p className="font-bold text-sm">Note aux nouveaux utilisateurs</p>
          </div>
          <p className="text-xs text-white/80 leading-relaxed">
            Par défaut, les comptes créés sont configurés avec le rôle **Réception**. Un administrateur système pourra modifier votre rôle (Médecin, Percepteur, Pharmacien, etc.) dans l'espace administration une fois votre profil actif.
          </p>
        </div>

        <div className="relative z-10 text-xs text-white/50">
          © 2026 AMKA Technologies. Tous droits réservés.
        </div>
      </aside>

      {/* Right Section - Register Form (60%) */}
      <main className="w-full lg:w-[60%] bg-background flex flex-col justify-center items-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-[480px]">
          {/* Header Logo */}
          <div className="flex flex-col items-center mb-10">
            <Logo size="lg" />
          </div>

          <header className="mb-8">
            <h2 className="text-3xl font-black text-text mb-2">Inscription</h2>
            <p className="text-muted text-sm">
              Remplissez les informations ci-dessous pour créer votre accès.
            </p>
          </header>

          <form className="space-y-4" onSubmit={onSubmit}>
            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text" htmlFor="first_name">
                  Prénom
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    id="first_name"
                    className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-200 text-text placeholder:text-muted/60"
                    placeholder="Jean"
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text" htmlFor="last_name">
                  Nom de famille
                </label>
                <input
                  id="last_name"
                  className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-200 text-text placeholder:text-muted/60"
                  placeholder="Dupont"
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text" htmlFor="email">
                Adresse e-mail
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
                <input
                  id="email"
                  className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-200 text-text placeholder:text-muted/60"
                  placeholder="nom@amka.cd"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text" htmlFor="password">
                Mot de passe
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
                <input
                  id="password"
                  className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-200 text-text placeholder:text-muted/60"
                  placeholder="Minimum 8 caractères"
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
            </div>

            {error && (
              <p className="bg-error/10 text-error rounded-xl px-4 py-3 text-xs font-semibold border border-error/20">
                {error}
              </p>
            )}

            {message && (
              <p className="bg-success/10 text-emerald-800 rounded-xl px-4 py-3 text-xs font-semibold border border-success/20">
                {message}
              </p>
            )}

            {/* Submit Button */}
            <button
              disabled={loading}
              className="w-full bg-primary hover:bg-[#3839aa] text-white font-semibold py-4 rounded-xl shadow-lg shadow-primary/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed mt-2"
              type="submit"
            >
              <span>{loading ? "Création..." : "Créer mon compte"}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-8">
            Déjà inscrit ?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </main>
    </main>
  );
}
