import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMKA Medical System",
  description: "Gestion medicale connectee a Supabase"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
