-- 1. Synchronisation des profils pour tous les utilisateurs auth existants
-- Cette requête crée une ligne dans 'public.profiles' et 'public.users' pour chaque compte dans 'auth.users' s'il n'en a pas déjà une.
INSERT INTO public.profiles (id, email, first_name, last_name, role, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'first_name', split_part(email, '@', 1)), 
  COALESCE(raw_user_meta_data->>'last_name', 'AMKA'), 
  COALESCE((raw_user_meta_data->>'role')::user_role, 'RECEPTIONIST'::user_role), 
  true
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET 
  email = EXCLUDED.email,
  first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
  last_name = COALESCE(profiles.last_name, EXCLUDED.last_name);

INSERT INTO public.users (id, email, first_name, last_name, role, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'first_name', split_part(email, '@', 1)), 
  COALESCE(raw_user_meta_data->>'last_name', 'AMKA'), 
  COALESCE((raw_user_meta_data->>'role')::user_role, 'RECEPTIONIST'::user_role), 
  true
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET 
  email = EXCLUDED.email,
  first_name = COALESCE(users.first_name, EXCLUDED.first_name),
  last_name = COALESCE(users.last_name, EXCLUDED.last_name);

-- 2. Insertion de données de test enrichies (Patients, Consultations, Pharmacie, Comptabilité)
-- Note : Ces données ne sont insérées que si elles n'existent pas déjà.

-- 2.1 Patients de démonstration
INSERT INTO public.patients (id, numero_dossier, nom, prenom, postnom, sexe, date_naissance, telephone, adresse, is_active)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'AMKA-2026-0001', 'Fataki', 'Jean-Pierre', 'Mwanza', 'MASCULIN', '1985-05-14', '+243 812 345 678', 'Av. de la Paix 14, Kinshasa/Gombe', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'AMKA-2026-0002', 'Kabange', 'Marie', 'Mbuyi', 'FEMININ', '1992-09-22', '+243 897 654 321', 'Chaussée de Laurent Kabila 88, Lubumbashi', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'AMKA-2026-0003', 'Muteba', 'Augustin', 'Ilunga', 'MASCULIN', '1978-11-30', '+243 824 556 778', 'Av. Kasavubu 142, Kalemie', true),
  ('d4e5f6a7-b89c-0d1e-2f3a-4b5c6d7e8f9a', 'AMKA-2026-0004', 'Kavira', 'Grace', 'Masika', 'FEMININ', '2001-03-08', '+243 998 776 554', 'Bld de l''UAP, Goma', true),
  ('e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b', 'AMKA-2026-0005', 'Banza', 'Dieudonné', 'Kalonji', 'MASCULIN', '1965-07-19', '+243 813 322 110', 'Q. Latin, Kisangani', true)
ON CONFLICT (numero_dossier) DO NOTHING;

-- 2.2 Médicaments en Stock (Pharmacie)
INSERT INTO public.medications (id, name, category, unit, price, stock, threshold, is_active)
VALUES
  ('m1c2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Paracétamol 500mg', 'Analgésique', 'Boîte', 5.0, 150, 15, true),
  ('m2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Amoxicilline 500mg', 'Antibiotique', 'Boîte', 12.5, 8, 10, true), -- Déclenche une alerte stock (8 <= 10)
  ('m3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Ibuprofène 400mg', 'Anti-inflammatoire', 'Boîte', 6.0, 80, 15, true),
  ('m4e5f6a7-b89c-0d1e-2f3a-4b5c6d7e8f9a', 'Artésunate + Amodiaquine', 'Antipaludique', 'Traitement', 15.0, 4, 12, true), -- Déclenche une alerte stock (4 <= 12)
  ('m5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b', 'Oméprazole 20mg', 'Anti-acide', 'Boîte', 8.0, 95, 20, true)
ON CONFLICT (id) DO NOTHING;

-- 2.3 Quelques Consultations récurrentes (rattachées à des médecins existants ou au premier médecin trouvé)
-- On utilise une sous-requête pour trouver un médecin/admin disponible pour l'affectation
DO $$
DECLARE
  v_medecin_id uuid;
BEGIN
  SELECT id INTO v_medecin_id FROM public.profiles WHERE role IN ('ADMIN', 'MEDECIN_DIRECTEUR') LIMIT 1;
  
  IF v_medecin_id IS NOT NULL THEN
    INSERT INTO public.consultations (patient_id, medecin_id, motif, diagnostic, tension, temperature, poids, traitement, notes, status, date_consultation)
    VALUES
      ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', v_medecin_id, 'Fièvre persistante et frissons depuis 3 jours', 'Accès palustre simple confirmé', '12/8', 38.9, 78.0, 'Artésunate + Amodiaquine, Paracétamol 500mg pendant 3 jours', 'Patient à revoir dans 5 jours si les symptômes persistent.', 'TERMINEE', now() - interval '2 hours'),
      ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', v_medecin_id, 'Consultation prénatale de routine (3e trimestre)', 'Grossesse évolutive normale', '11/7', 36.8, 68.5, 'Fer + Acide folique, conseils nutritionnels', 'Prochain rendez-vous dans 2 semaines.', 'TERMINEE', now() - interval '1 day'),
      ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', v_medecin_id, 'Douleurs abdominales aiguës et nausées', 'Gastrite aiguë suspectée', '13/8', 37.2, 85.0, 'Oméprazole 20mg par jour', 'Bilan sanguin prescrit.', 'EN_COURS', now());
  END IF;
END $$;

-- 2.4 Quelques Paiements
DO $$
DECLARE
  v_percepteur_id uuid;
BEGIN
  SELECT id INTO v_percepteur_id FROM public.profiles WHERE role IN ('ADMIN', 'PERCEPTEUR') LIMIT 1;
  
  INSERT INTO public.payments (patient_id, collected_by, montant, type, mode_paiement, status, notes, created_at)
  VALUES
    ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', v_percepteur_id, 25.0, 'Frais de Consultation Médicale', 'CASH', 'COMPLETED', 'Payé à la réception', now() - interval '2 hours'),
    ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', v_percepteur_id, 35.0, 'Bilan Labo & Maternité', 'MOBILE_MONEY', 'COMPLETED', 'Transaction M-Pesa validée', now() - interval '1 day'),
    ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', v_percepteur_id, 20.0, 'Frais de Consultation Médicale', 'CASH', 'PENDING', 'En attente de régularisation', now());
END $$;

-- 2.5 Dépenses courantes (Comptabilité)
DO $$
DECLARE
  v_comptable_id uuid;
BEGIN
  SELECT id INTO v_comptable_id FROM public.profiles WHERE role IN ('ADMIN', 'COMPTABLE') LIMIT 1;
  
  INSERT INTO public.expenses (description, amount, category, date, created_by)
  VALUES
    ('Achat de carburant pour le générateur de secours', 120.0, 'Logistique', current_date - 2, v_comptable_id),
    ('Abonnement Internet clinique haut débit', 80.0, 'Télécoms', current_date - 5, v_comptable_id),
    ('Fournitures de bureau et consommables imprimante', 45.5, 'Administratif', current_date, v_comptable_id);
END $$;
