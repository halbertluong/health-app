import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex h-[100dvh] bg-background">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-nav md:pb-6">
          <div className="max-w-2xl mx-auto md:max-w-none">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </div>
  );
}
