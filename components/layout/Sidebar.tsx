"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Receipt,
  Pill,
  BarChart3,
  LogOut,
  X,
  Settings,
  LayoutGrid,
} from "lucide-react";
import type { UserRole } from "@/lib/types";
import { cn, displayRole } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/ui/Logo";

const items = [
  {
    href: "/dashboard",
    label: "Principal",
    icon: LayoutDashboard,
    roles: ["ADMIN", "RECEPTIONIST", "MEDECIN_DIRECTEUR", "PERCEPTEUR", "PHARMACIEN", "COMPTABLE"],
  },
  // Tableau de bord Admin — exclusif à l'administrateur
  {
    href: "/admin",
    label: "Administration",
    icon: LayoutGrid,
    roles: ["ADMIN"],
  },
  {
    href: "/patients",
    label: "Patients",
    icon: Users,
    roles: ["ADMIN", "RECEPTIONIST", "MEDECIN_DIRECTEUR"],
  },
  {
    href: "/consultations",
    label: "Consultations",
    icon: Stethoscope,
    roles: ["ADMIN", "RECEPTIONIST", "MEDECIN_DIRECTEUR"],
  },
  {
    href: "/payments",
    label: "Paiements",
    icon: Receipt,
    roles: ["ADMIN", "PERCEPTEUR", "COMPTABLE"],
  },
  {
    href: "/pharmacy",
    label: "Pharmacie",
    icon: Pill,
    roles: ["ADMIN", "PHARMACIEN"],
  },
  {
    href: "/accounting",
    label: "Comptabilité",
    icon: BarChart3,
    roles: ["ADMIN", "COMPTABLE"],
  },
  // Paramètres — visible par tous les rôles
  {
    href: "/settings",
    label: "Paramètres",
    icon: Settings,
    roles: ["ADMIN", "RECEPTIONIST", "MEDECIN_DIRECTEUR", "PERCEPTEUR", "PHARMACIEN", "COMPTABLE"],
  },
] satisfies Array<{ href: string; label: string; icon: any; roles: UserRole[] }>;

type SidebarProps = {
  role: UserRole | null;
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const visibleItems = items.filter((item) => !role || item.roles.includes(role));

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-text/45 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-border bg-surface py-6 shadow-sm transition-transform duration-300 ease-in-out lg:translate-x-0 lg:flex",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header with Brand & Close Btn */}
        <div className="mb-8 flex items-center justify-between px-6">
          <Logo size="lg" />
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-soft text-muted lg:hidden"
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2">
          {visibleItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            // Highlight admin link with a subtle special style
            const isAdmin = item.href === "/admin";
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-250 relative group",
                  active
                    ? "bg-primary/10 text-primary shadow-sm"
                    : isAdmin
                    ? "text-primary/70 hover:bg-primary/8 hover:text-primary"
                    : "text-muted hover:bg-surface-soft hover:text-text"
                )}
              >
                <Icon
                  size={20}
                  className={cn(
                    "transition-transform duration-300 group-hover:scale-[1.08]",
                    active && "text-primary",
                    isAdmin && !active && "text-primary/60"
                  )}
                />
                <span>{item.label}</span>
                {active && (
                  <div className="absolute left-0 top-1/4 h-1/2 w-1 rounded-r-full bg-primary" />
                )}
                {isAdmin && !active && (
                  <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-primary/50 border border-primary/20 rounded px-1 py-0.5">
                    Admin
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info Quick Card (if logged in) */}
        {role && (
          <div className="mx-4 mb-4 rounded-xl bg-surface-soft p-3 border border-border/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Rôle Actuel
            </p>
            <p className="text-xs font-bold text-text mt-0.5">
              {displayRole(role)}
            </p>
          </div>
        )}

        {/* Sidebar Footer Logout Button */}
        <div className="mx-2 border-t border-border pt-4">
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold text-error/80 hover:text-error hover:bg-error/5 transition-all duration-200 active:scale-[0.98]"
          >
            Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
}
