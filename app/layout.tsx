import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniAdapt · Your next learning step",
  description: "A private learning campus with adaptive assessments, teacher-approved materials and time-aware study plans.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
