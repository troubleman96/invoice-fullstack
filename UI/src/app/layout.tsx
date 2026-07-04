import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chapisho — Jenga Ankara na Bei kwa Urahisi",
  description:
    "Tengeneza ankara na bei-kadirio bila malipo. Taarifa zako hazihifadhiwi popote — zinabaki kwenye kifaa chako pekee.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sw">
      <body>{children}</body>
    </html>
  );
}
