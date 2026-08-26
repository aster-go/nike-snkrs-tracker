import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nike SNKRS Tracker & Drop Radar",
  description: "Real-time drop radar, stock availability monitor, and restock notification engine for Nike SNKRS.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-red-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
