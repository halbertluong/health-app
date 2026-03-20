"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Implicit flow: Supabase puts #access_token in the URL hash.
    // Calling getSession() triggers the client to parse the hash and persist the session.
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setError(error.message);
        return;
      }
      if (session) {
        router.replace("/planner");
      } else {
        // No session from hash — check for a PKCE code param as fallback
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
            if (error) {
              setError(error.message);
            } else {
              router.replace("/planner");
            }
          });
        } else {
          router.replace("/login?error=no_session");
        }
      }
    });
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive text-sm">Auth error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground text-sm">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        Signing you in…
      </div>
    </div>
  );
}
