"use client";

import type { User } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

interface TopBarProps {
  user: User;
}

const PAGE_TITLES: Record<string, string> = {
  "/": "Home",
  "/planner": "Weekly Planner",
  "/recipes": "Recipes",
  "/grocery": "Grocery List",
  "/workouts": "Workouts",
  "/review": "Weekly Review",
};

export function TopBar({ user }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path)
  )?.[1] ?? "Nourish";

  const displayName = user.user_metadata?.["name"] ?? user.email?.split("@")[0] ?? "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="shrink-0 flex items-center justify-between px-4 md:px-6 bg-card border-b border-border"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        height: "calc(3.5rem + env(safe-area-inset-top))",
      }}
    >
      {/* Mobile: app title. Desktop: empty (sidebar has logo) */}
      <div className="flex items-center gap-2">
        <div className="md:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2.5}>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="font-bold text-base">{title}</span>
        </div>
        <div className="hidden md:block" />
      </div>

      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center">
            {initials}
          </div>
          <span className="hidden md:block text-sm font-medium text-foreground">{displayName}</span>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors pl-2.5 border-l border-border"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline text-sm">Sign out</span>
        </button>
      </div>
    </header>
  );
}
