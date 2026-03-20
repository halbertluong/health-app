import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const results: Record<string, any> = {};

  // 1. Check env vars are set
  results.env = {
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `set (${process.env.NEXT_PUBLIC_SUPABASE_URL})`
      : "MISSING",
    anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? `set (${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 20)}...)`
      : "MISSING",
    service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? `set (${process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 20)}...)`
      : "MISSING",
    anthropic_key: process.env.ANTHROPIC_API_KEY
      ? `set (${process.env.ANTHROPIC_API_KEY.slice(0, 20)}...)`
      : "MISSING",
  };

  // 2. Check Supabase connection
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from("users").select("count").limit(1);
    results.supabase_connection = error
      ? { status: "error", message: error.message, code: error.code }
      : { status: "ok", message: "Connected to database" };
  } catch (e: any) {
    results.supabase_connection = { status: "error", message: e.message };
  }

  // 3. Check Google OAuth endpoint is reachable
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/authorize?provider=google`;
    const res = await fetch(url, { method: "HEAD", redirect: "manual" });
    results.google_oauth_endpoint = {
      status: "reachable",
      http_status: res.status,
      message: res.status === 302 || res.status === 303 || res.status === 301
        ? "Google OAuth redirect working"
        : `Unexpected status: ${res.status}`,
    };
  } catch (e: any) {
    results.google_oauth_endpoint = { status: "error", message: e.message };
  }

  // 4. Check auth callback URL is reachable
  try {
    const callbackUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`;
    const res = await fetch(callbackUrl, { method: "GET", redirect: "manual" });
    results.auth_callback = {
      status: "reachable",
      http_status: res.status,
    };
  } catch (e: any) {
    results.auth_callback = { status: "error", message: e.message };
  }

  return NextResponse.json(results, { status: 200 });
}
