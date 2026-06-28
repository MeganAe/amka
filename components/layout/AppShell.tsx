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

      // Pas connecté → rediriger vers /login (remplace le middleware)
      if (!user) {
        router.push("/login");
        return;
      }

      // 1. Essayer de charger le profil depuis la table profiles
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
        return;
      }

      // 2. Fallback : profil non trouvé → on le crée automatiquement
      const meta = user.user_metadata ?? {};
      const firstName: string =
        meta.first_name ?? meta.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "Utilisateur";
      const lastName: string =
        meta.last_name ?? meta.full_name?.split(" ").slice(1).join(" ") ?? "";
      const role: UserRole = (meta.role as UserRole) ?? "RECEPTIONIST";

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
        // 3. Dernier recours : profil synthétique en mémoire uniquement
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
