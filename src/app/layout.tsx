import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "HRIS — Sistem Manajemen SDM & Presensi",
    template: "%s | HRIS",
  },
  description: "Platform Manajemen Sumber Daya Manusia, Presensi GPS Geofencing, Payroll & Pengajuan Karyawan",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HRIS",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f19",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { PwaRegister } from "@/components/pwa-register";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} dark h-full`}
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col font-sans bg-[#0b0f19] text-slate-100 antialiased selection:bg-blue-600 selection:text-white"
      >
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
