"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Meal Plan" },
  { href: "/search", label: "Food Search" },
  { href: "/log", label: "Food Log" },
];

export function NavBar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="sticky top-0 z-50 border-b border-stone-200/60 bg-[#FBFBFA]/80 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-900" />
          <span className="text-lg font-bold tracking-[-0.02em] text-stone-800">CarbWise</span>
        </Link>
        <div className="flex gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-[#EAF6ED] text-[#2E7D32]"
                    : "text-[#A3A39C] hover:text-[#2D2D2D] hover:bg-stone-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
