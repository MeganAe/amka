"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Menu, Search, Settings, X, Pill, DollarSign, Calendar } from "lucide-react";
import type { Profile } from "@/lib/types";
import { displayRole, initials, cn } from "@/lib/utils";

type HeaderProps = {
  profile: Profile | null;
  onMenuClick: () => void;
};

import { supabase } from "@/lib/supabase";

type MockNotification = {
  id: string;
  type: "stock" | "payment" | "consultation";
  text: string;
  time: string;
  read: boolean;
};

export function Header({ profile, onMenuClick }: HeaderProps) {
  const [greeting, setGreeting] = useState("Bonjour");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<MockNotification[]>([]);

  const notificationRef = useRef<HTMLDivElement>(null);

  // Load initial notifications
  useEffect(() => {
    async function loadInitial() {
      // 1. Low stock meds
      const { data: meds } = await supabase.from("medications").select("name, stock, threshold").eq("is_active", true);
      const lowStock = (meds ?? [])
        .filter((m: any) => m.stock <= m.threshold)
        .map((m: any, idx: number) => ({
          id: `stock-${m.name}-${idx}`,
          type: "stock" as const,
          text: `Alerte stock : Le stock de ${m.name} est faible (${m.stock} restants).`,
          time: "Stock critique",
          read: false,
        }));

      // 2. Recent consultations
      const { data: consults } = await supabase
        .from("consultations")
        .select("id, motif, created_at, patients(nom, prenom)")
        .order("created_at", { ascending: false })
        .limit(3);
      const recentConsults = (consults ?? []).map((c: any) => ({
        id: `consult-${c.id}`,
        type: "consultation" as const,
        text: `Nouvelle consultation pour ${c.patients?.prenom ?? "Patient"} ${c.patients?.nom ?? ""} : ${c.motif}`,
        time: new Date(c.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        read: true,
      }));

      // 3. Recent payments
      const { data: pays } = await supabase
        .from("payments")
        .select("id, montant, type, created_at, patients(nom, prenom)")
        .order("created_at", { ascending: false })
        .limit(3);
      const recentPays = (pays ?? []).map((p: any) => ({
        id: `pay-${p.id}`,
        type: "payment" as const,
        text: `Paiement perçu de ${p.montant} $ pour ${p.type} (${p.patients?.prenom ?? "Patient"} ${p.patients?.nom ?? ""}).`,
        time: new Date(p.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        read: true,
      }));

      setNotifications([...lowStock, ...recentConsults, ...recentPays]);
    }
    void loadInitial();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("header-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "consultations" }, async (payload: any) => {
        const { data: p } = await supabase.from("patients").select("nom, prenom").eq("id", payload.new.patient_id).maybeSingle();
        const pName = p ? `${p.prenom} ${p.nom}` : "nouveau patient";
        setNotifications((prev) => [
          {
            id: `consult-rt-${payload.new.id}`,
            type: "consultation",
            text: `Nouvelle consultation enregistrée pour ${pName} : ${payload.new.motif}`,
            time: "À l'instant",
            read: false,
          },
          ...prev,
        ]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "payments" }, async (payload: any) => {
        const { data: p } = await supabase.from("patients").select("nom, prenom").eq("id", payload.new.patient_id).maybeSingle();
        const pName = p ? `${p.prenom} ${p.nom}` : "patient";
        setNotifications((prev) => [
          {
            id: `pay-rt-${payload.new.id}`,
            type: "payment",
            text: `Paiement de ${payload.new.montant} $ perçu pour ${payload.new.type} (${pName}).`,
            time: "À l'instant",
            read: false,
          },
          ...prev,
        ]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "medications" }, (payload: any) => {
        if (payload.new.stock <= payload.new.threshold && payload.new.is_active) {
          setNotifications((prev) => [
            {
              id: `stock-rt-${payload.new.id}-${Date.now()}`,
              type: "stock",
              text: `Alerte critique : Le stock de ${payload.new.name} a chuté à ${payload.new.stock}.`,
              time: "À l'instant",
              read: false,
            },
            ...prev,
          ]);
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // Close notifications dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update dynamic greeting based on hour
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 18) {
      setGreeting("Bonsoir");
    } else {
      setGreeting("Bonjour");
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllAsRead() {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  }

  function getNotificationIcon(type: MockNotification["type"]) {
    switch (type) {
      case "stock":
        return <Pill size={16} className="text-warning" />;
      case "payment":
        return <DollarSign size={16} className="text-success" />;
      case "consultation":
        return <Calendar size={16} className="text-primary" />;
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-surface px-4 lg:px-8">
      {/* Left items - Mobile Toggle & Search */}
      <div className="flex flex-1 items-center gap-4">
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface-soft active:scale-95 transition-all lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>
        <div className="relative hidden w-full max-w-md md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            className="w-full rounded-full border border-border bg-surface-soft py-2 pl-10 pr-4 text-sm text-text outline-none transition placeholder:text-muted/70 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
            placeholder="Rechercher un dossier patient, un médicament..."
          />
        </div>
      </div>

      {/* Right items - Notifications, Settings, Profile */}
      <div className="flex items-center gap-3">
        {/* Notifications Bell Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-soft active:scale-95 transition-all relative"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute right-2.5 top-2.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-error"></span>
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-surface shadow-card overflow-hidden z-50 transition-all">
              <div className="flex items-center justify-between border-b border-border bg-surface-soft px-4 py-3">
                <span className="text-sm font-bold text-text">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Tout marquer lu
                  </button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-border/60">
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-xs text-muted">Aucune notification.</p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 text-left transition-colors",
                        !notification.read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-surface-soft"
                      )}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface border border-border/40">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-xs text-text leading-relaxed">
                            {notification.text}
                          </p>
                          <p className="text-[10px] text-muted font-semibold">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info & Settings Button */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-soft active:scale-95 transition-all"
          aria-label="Paramètres"
          onClick={() => {
            alert(
              "AMKA Medical System — Version 2.0.0\nDéveloppé sous Next.js 14 et connecté à Supabase en temps réel."
            );
          }}
        >
          <Settings size={20} />
        </button>

        <div className="mx-1 hidden h-8 w-px bg-border md:block" />

        {/* User profile presentation */}
        {profile && (
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold leading-tight text-text">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted mt-0.5">
              {displayRole(profile.role)}
            </p>
          </div>
        )}

        <div
          className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-black text-primary shadow-sm select-none"
          title={profile ? `${profile.first_name} ${profile.last_name}` : ""}
        >
          {initials(profile?.first_name, profile?.last_name)}
        </div>
      </div>
    </header>
  );
}
