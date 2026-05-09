import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import {
  getGoogleLogin,
  GOOGLE_OAUTH_STATE_STORAGE_KEY,
  setPostLoginRedirect,
} from "@/lib/auth";

export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { next?: string };

  useEffect(() => {
    if (!isAuthenticated) return;

    const nextPath = search.next;
    void navigate({
      to: "/dashboard",
      replace: true,
    });
  }, [isAuthenticated, navigate, search.next]);

  async function handleGoogleLogin() {
    setIsLoading(true);
    setError(null);

    try {
      setPostLoginRedirect(search.next ?? null);

      const { authorization_url, state } = await getGoogleLogin();

      sessionStorage.setItem(GOOGLE_OAUTH_STATE_STORAGE_KEY, state);
      window.location.assign(authorization_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Google sign-in.");
      setIsLoading(false);
    }
  }

  return (
    <main className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      {/* ── Left panel ── */}
      <section className="hidden md:flex md:w-1/2 relative bg-m3-primary items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-full h-full rounded-full bg-m3-secondary-container blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-full h-full rounded-full bg-m3-tertiary blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="font-headline text-5xl md:text-6xl font-black text-white tracking-tighter mb-6 leading-tight">
            Cross the Bridge to Mastery.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed mb-12 font-medium">
            Experience the synergy of human intuition and artificial intelligence.
            Your journey towards cognitive excellence begins here.
          </p>

          <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-m3-secondary-container to-m3-tertiary">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <span className="text-white text-4xl">🌉</span>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-m3-primary/60 to-transparent" />
          </div>
        </div>

        <div className="absolute top-12 left-12">
          <Link to="/" className="font-headline text-3xl font-black text-white tracking-tighter" search={{}}>
            aBridgeAI
          </Link>
        </div>
      </section>

      {/* ── Right panel ── */}
      <section className="flex-grow flex items-center justify-center p-6 md:p-12 lg:p-24 bg-m3-surface-bright">
        <div className="w-full max-w-md space-y-10">
          <div className="md:hidden flex justify-center mb-8">
            <Link to="/" className="font-headline text-3xl font-black text-m3-primary tracking-tighter">
              aBridgeAI
            </Link>
          </div>

          <header>
            <h2 className="font-headline text-4xl font-extrabold text-m3-on-surface tracking-tight mb-2">
              Welcome Back
            </h2>
            <p className="text-m3-on-surface-variant font-medium">
              Continue your learning journey with your Google account.
            </p>
          </header>

          <div className="space-y-5 rounded-3xl bg-white/70 p-5 shadow-[0_24px_80px_rgba(25,28,30,0.08)] ring-1 ring-m3-outline-variant/20 backdrop-blur">
            <Button
              className="w-full h-14 rounded-2xl bg-m3-surface-container-lowest text-m3-primary hover:bg-m3-surface-container-low border border-m3-outline-variant/20 font-bold shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-3"
              disabled={isLoading}
              onClick={handleGoogleLogin}
              type="button"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="relative h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/5">
                  <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#4285f4]" />
                  <span className="absolute bottom-0 left-0 h-2.5 w-2.5 rounded-full bg-[#34a853]" />
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#fbbc05]" />
                  <span className="absolute right-0 top-1 h-2.5 w-2.5 rounded-full bg-[#ea4335]" />
                </span>
              )}
              <span>{isLoading ? "Opening Google..." : "Continue with Google"}</span>
              {!isLoading && <ArrowRight className="h-5 w-5" />}
            </Button>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                {error}
              </p>
            )}

            <div className="flex items-start gap-3 rounded-2xl bg-m3-secondary-fixed/70 px-4 py-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-m3-secondary" />
              <p className="text-sm font-medium leading-relaxed text-m3-on-secondary-fixed">
                aBridgeAI currently supports Google OAuth only. New approved users are
                created through the Google sign-in flow.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed bottom-8 right-8 z-50">
        <div className="flex items-center gap-3 px-4 py-2 bg-m3-secondary-fixed rounded-full shadow-lg border border-m3-secondary/10">
          <div className="w-2 h-2 bg-m3-secondary rounded-full animate-pulse" />
          <span className="text-xs font-bold text-m3-on-secondary-fixed uppercase tracking-wider">
            AI Security Enabled
          </span>
        </div>
      </div>
    </main>
  );
}
