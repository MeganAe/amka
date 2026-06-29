"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Toujours charger depuis la table profiles (source de vérité pour le rôle)
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
        return;
      }

      // Fallback: créer le profil s'il n'existe pas encore
      const meta = user.user_metadata ?? {};
      const firstName: string =
        meta.first_name ?? meta.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "Utilisateur";
      const lastName: string =
        meta.last_name ?? meta.full_name?.split(" ").slice(1).join(" ") ?? "";
      // Ne PAS utiliser meta.role ici — toujours RECEPTIONIST par défaut pour les nouveaux
      const role: UserRole = "RECEPTIONIST";

      const { data: created } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email ?? "",
            first_name: firstName,
            last_name: lastName,
            role,
            is_active: true,
          },
          { onConflict: "id" }
        )
        .select()
        .maybeSingle();

      if (created) {
        setProfile(created as Profile);
      } else {
        // Dernier recours: profil synthétique
        setProfile({
          id: user.id,
          email: user.email ?? "",
          first_name: firstName,
          last_name: lastName,
          role,
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }
    }

    void loadProfile();

    // Écouter les changements de session (reconnexion = rechargement du profil)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void loadProfile();
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen bg-background text-text">
      <Sidebar
        role={profile?.role ?? null}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:ml-[260px] min-h-screen flex flex-col">
        <Header
          profile={profile}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 mx-auto w-full max-w-7xl space-y-8 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
