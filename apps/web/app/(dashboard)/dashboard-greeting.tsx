"use client";

// Minimal client component — imported by page.tsx so Next.js generates
// the page_client-reference-manifest.js that Vercel's builder requires.
export function DashboardGreeting({ name }: { name: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Good morning, {name} 👋</h1>
    </div>
  );
}
