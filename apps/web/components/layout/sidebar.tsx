"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UtensilsCrossed,
  TrendingUp,
  CalendarDays,
  BookOpen,
  ShoppingCart,
  Dumbbell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/log", label: "Food Diary", icon: UtensilsCrossed },
  { href: "/analytics", label: "Analytics", icon: TrendingUp },
];

const planningNav = [
  { href: "/planner", label: "Weekly Planner", icon: CalendarDays },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/grocery", label: "Grocery List", icon: ShoppingCart },
];

function NavItem({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathname: string;
}) {
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
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
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 border-r border-border bg-card flex flex-col py-5">
      <div className="px-5 mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px] text-white" stroke="currentColor" strokeWidth={2.5}>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="font-bold text-foreground text-base tracking-tight">Nourish</span>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {primaryNav.map((item) => (
          <NavItem key={item.href} {...item} pathname={pathname} />
        ))}

        <div className="pt-4 pb-1 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
            Planning
          </span>
        </div>

        {planningNav.map((item) => (
          <NavItem key={item.href} {...item} pathname={pathname} />
        ))}
      </nav>

      <div className="px-3 pt-4 border-t border-border mt-4">
        <div className="px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-xs font-medium text-primary">Tip</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log meals with a photo or description — Claude handles the macros.
          </p>
        </div>
      </div>
    </aside>
  );
}
