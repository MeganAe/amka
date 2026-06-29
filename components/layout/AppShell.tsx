"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
        setLoading(false);
        return;
      }

      // Fallback: créer le profil s'il n'existe pas
      const meta = user.user_metadata ?? {};
      const firstName: string =
        meta.first_name ?? meta.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "Utilisateur";
      const lastName: string =
        meta.last_name ?? meta.full_name?.split(" ").slice(1).join(" ") ?? "";

      const { data: created } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email ?? "",
            first_name: firstName,
            last_name: lastName,
            role: "RECEPTIONIST" as UserRole,
            is_active: true,
          },
          { onConflict: "id" }
        )
        .select()
        .maybeSingle();

      setProfile(
        (created as Profile) ?? {
          id: user.id,
          email: user.email ?? "",
          first_name: firstName,
          last_name: lastName,
          role: "RECEPTIONIST" as UserRole,
          is_active: true,
          created_at: new Date().toISOString(),
        }
      );
      setLoading(false);
    }

    void loadProfile();
  }, [router]);

  // Ne rien afficher tant que le profil n'est pas chargé — évite le flash de menus
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted font-semibold">Chargement...</p>
        </div>
      </div>
    );
  }

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
