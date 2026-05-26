import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CarbWise — AI Meal Planner",
  description: "AI-powered meal planning and nutrition analysis for diabetes management",
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
        <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold text-emerald-700">
              CarbWise
            </Link>
            <div className="flex gap-4 text-sm font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-stone-600 hover:text-emerald-700 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
