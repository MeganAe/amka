export type UserRole =
  | "ADMIN"
  | "RECEPTIONIST"
  | "MEDECIN_DIRECTEUR"
  | "PERCEPTEUR"
  | "PHARMACIEN"
  | "COMPTABLE";

export type Patient = {
  id: string;
  numero_dossier: string;
  nom: string;
  prenom: string;
  postnom: string | null;
  sexe: "MASCULIN" | "FEMININ";
  date_naissance: string;
  telephone: string | null;
  adresse: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

export type Consultation = {
  id: string;
  patient_id: string;
  medecin_id: string;
  motif: string;
  diagnostic: string | null;
  tension: string | null;
  temperature: number | null;
  poids: number | null;
  traitement: string | null;
  notes: string | null;
  status: "EN_ATTENTE" | "EN_COURS" | "TERMINEE" | "ANNULEE";
  date_consultation: string;
  created_at: string;
  patients?: Pick<Patient, "nom" | "prenom" | "numero_dossier"> | null;
  profiles?: Pick<Profile, "first_name" | "last_name"> | null;
};

export type Payment = {
  id: string;
  patient_id: string;
  collected_by: string | null;
  montant: number;
  type: string;
  mode_paiement: "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "INSURANCE";
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  created_at: string;
  patients?: Pick<Patient, "nom" | "prenom" | "numero_dossier"> | null;
};

export type Medication = {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_by: string | null;
  created_at: string;
};
