"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UtensilsCrossed, TrendingUp, CalendarDays, BookOpen, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/log", icon: UtensilsCrossed, label: "Diary" },
  { href: "/analytics", icon: TrendingUp, label: "Analytics" },
  { href: "/planner", icon: CalendarDays, label: "Planner" },
  { href: "/recipes", icon: BookOpen, label: "Recipes" },
  { href: "/workouts", icon: Dumbbell, label: "Workouts" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-16">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
