import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a1a0f] flex-col justify-between p-12 relative overflow-hidden">
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
              Your journey<br />
              starts here.<br />
              <span className="text-emerald-400">Let&apos;s go.</span>
            </h1>
            <p className="text-emerald-200/70 text-lg leading-relaxed">
              Set your goals, build your plan, and track every macro — starting today.
            </p>
          </div>

          <div className="space-y-3">
            {["Personalized meal plans", "Macro & calorie tracking", "Smart grocery lists"].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                    <path d="M2 6l3 3 5-5" stroke="#4ade80" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-emerald-200/70 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-8">
          <p className="text-white/50 text-sm italic">
            &ldquo;Take care of your body. It&apos;s the only place you have to live.&rdquo;
          </p>
          <p className="text-white/30 text-xs mt-1">— Jim Rohn</p>
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

          <SignupForm />
        </div>
      </div>
    </div>
  );
}
