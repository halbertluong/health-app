import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership before deleting
  const { data: log } = await supabase
    .from("meal_logs")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!log || log.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await supabase.from("meal_logs").delete().eq("id", id);

  return new NextResponse(null, { status: 204 });
}
