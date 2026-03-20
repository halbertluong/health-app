import { LoginForm } from "@/components/auth/login-form";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a1a0f] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #22c55e 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, #16a34a 0%, transparent 40%)`,
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth={2}>
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">Nourish</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Plan smarter.<br />
              Eat better.<br />
              <span className="text-emerald-400">Feel great.</span>
            </h1>
            <p className="text-emerald-200/70 text-lg leading-relaxed">
              Your weekly meal planner, macro tracker, and grocery list — all in one place.
            </p>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3 pt-4">
            <div className="flex -space-x-2">
              {["bg-emerald-400", "bg-teal-400", "bg-green-400"].map((c, i) => (
                <div key={i} className={`w-8 h-8 rounded-full ${c} border-2 border-[#0a1a0f]`} />
              ))}
            </div>
            <p className="text-emerald-200/60 text-sm">Join people hitting their goals every week</p>
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10 border-t border-white/10 pt-8">
          <p className="text-white/50 text-sm italic">
            &ldquo;The plan is nothing. Planning is everything.&rdquo;
          </p>
          <p className="text-white/30 text-xs mt-1">— Dwight D. Eisenhower</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth={2}>
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="font-bold text-lg">Nourish</span>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3.5 py-2.5">
              Auth error: {decodeURIComponent(error)}
            </div>
          )}
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
