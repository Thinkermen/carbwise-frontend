import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { NavBar } from "@/components/nav-bar";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CarbWise — ADA-Aligned Meal Planner",
  description: "Personalized diabetes meal plans grounded in USDA food data and ADA 2026 clinical guidelines. Free, no sign-up required.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.className} min-h-full bg-stone-50 text-stone-900`}>
        <NavBar />
        <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
