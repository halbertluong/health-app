import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workouts, goal, daysPerWeek, weekStart } = await request.json();

  const workoutList = workouts.length > 0
    ? workouts.map((w: any) => `- ${w.name} (${w.type ?? "general"}${w.duration_minutes ? `, ${w.duration_minutes}min` : ""})`).join("\n")
    : "No existing workouts — suggest a balanced beginner plan.";

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Create a ${daysPerWeek}-day workout plan for the week starting ${weekStart}.

Goal: ${goal || "general fitness"}

Available workouts in their library:
${workoutList}

Return ONLY a JSON array, no other text. Each item:
{ "day": "YYYY-MM-DD", "workout_name": "string", "notes": "string (1 sentence tip)" }

Schedule ${daysPerWeek} days across the week (Mon-Sun). Use workouts from the library where possible. If the library is empty, use common workout names that match the goal.`,
    }],
  });

  const raw = (message.content[0] as any).text.trim();
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });

  let plan: { day: string; workout_name: string; notes: string }[];
  try {
    plan = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: "Failed to parse plan" }, { status: 500 });
  }

  // Match plan items to existing workout IDs where possible
  const scheduled = plan.map((item) => {
    const match = workouts.find((w: any) =>
      w.name.toLowerCase() === item.workout_name.toLowerCase() ||
      item.workout_name.toLowerCase().includes(w.name.toLowerCase())
    );
    return {
      user_id: user.id,
      workout_id: match?.id ?? null,
      date: item.day,
      status: "scheduled",
      notes: item.notes,
    };
  });

  const { error } = await supabase.from("workout_schedule").insert(scheduled);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ plan, scheduled: scheduled.length });
}
