import type { Consultation, Payment, UserRole } from "./types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value ?? 0);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function displayRole(role?: UserRole | null) {
  const labels: Record<UserRole, string> = {
    ADMIN: "Administrateur",
    RECEPTIONIST: "Reception",
    MEDECIN_DIRECTEUR: "Medecin directeur",
    PERCEPTEUR: "Percepteur",
    PHARMACIEN: "Pharmacien",
    COMPTABLE: "Comptable"
  };
  return role ? labels[role] : "Utilisateur";
}

export function consultationLabel(status: Consultation["status"]) {
  const labels: Record<Consultation["status"], string> = {
    EN_ATTENTE: "En attente",
    EN_COURS: "En cours",
    TERMINEE: "Terminee",
    ANNULEE: "Annulee"
  };
  return labels[status];
}

export function paymentLabel(status: Payment["status"]) {
  const labels: Record<Payment["status"], string> = {
    PENDING: "En attente",
    COMPLETED: "Complete",
    CANCELLED: "Annule"
  };
  return labels[status];
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function initials(first?: string | null, last?: string | null) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "AM";
}
