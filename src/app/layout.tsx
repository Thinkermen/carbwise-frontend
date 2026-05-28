import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CarbWise — ADA-Aligned Meal Planner",
  description: "Personalized diabetes meal plans grounded in USDA food data and ADA 2026 clinical guidelines. Free, no sign-up required.",
};

const navItems = [
  { href: "/", label: "Meal Plan" },
  { href: "/search", label: "Food Search" },
  { href: "/log", label: "Food Log" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.className} min-h-full bg-stone-50 text-stone-900`}>
        <nav className="sticky top-0 z-50 border-b border-stone-200/60 bg-[#FBFBFA]/80 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-900" />
              <span className="text-lg font-bold tracking-[-0.02em] text-stone-800">CarbWise</span>
            </Link>
            <div className="flex gap-4 text-sm font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-stone-400 hover:text-stone-700 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
