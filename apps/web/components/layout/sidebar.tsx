"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  BookOpen,
  ShoppingCart,
  Dumbbell,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/planner", label: "Weekly Planner", icon: CalendarDays },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/grocery", label: "Grocery List", icon: ShoppingCart },
  { href: "/review", label: "Weekly Review", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 border-r border-border bg-card flex flex-col py-5">
      <div className="px-5 mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" stroke="currentColor" strokeWidth={2.5}>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="font-bold text-foreground text-base tracking-tight">Nourish</span>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pt-4 border-t border-border mt-4">
        <div className="px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-xs font-medium text-primary">Pro tip</p>
          <p className="text-xs text-muted-foreground mt-0.5">Log your meals daily to stay on track with your macros.</p>
        </div>
      </div>
    </aside>
  );
}
