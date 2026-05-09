import { useEffect, useRef, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import {
  consumePostLoginRedirect,
  exchangeGoogleCode,
  GOOGLE_OAUTH_STATE_STORAGE_KEY,
  storeAuthSession,
} from "@/lib/auth";

export default function GoogleCallbackPage() {
  const search = useSearch({ strict: false }) as {
    code?: string | null;
    state?: string | null;
    error?: string | null;
  };

  const [status, setStatus] = useState("Finishing Google sign-in...");
  const [details, setDetails] = useState<string | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const { code, state, error } = search;

    async function finishLogin() {
      if (error) {
        setHasFailed(true);
        setStatus("Google sign-in was cancelled.");
        setDetails(error);
        return;
      }

      if (!code) {
        setHasFailed(true);
        setStatus("Google did not return an authorization code.");
        setDetails("Start the sign-in flow again from the login page.");
        return;
      }

      const expectedState = sessionStorage.getItem(GOOGLE_OAUTH_STATE_STORAGE_KEY);
      sessionStorage.removeItem(GOOGLE_OAUTH_STATE_STORAGE_KEY);

      if (!state || !expectedState || state !== expectedState) {
        setHasFailed(true);
        setStatus("Unable to verify the Google sign-in response.");
        setDetails("The sign-in state did not match. Please try again.");
        return;
      }

      try {
        const tokenResponse = await exchangeGoogleCode(code);
        storeAuthSession(tokenResponse);
        setStatus("Signed in successfully. Redirecting...");
        window.location.replace(consumePostLoginRedirect());
      } catch (err) {
        setHasFailed(true);
        setStatus("Unable to finish Google sign-in.");
        setDetails(err instanceof Error ? err.message : "Please try again.");
      }
    }

    void finishLogin();
  }, [search]);

  return (
    <main className="min-h-screen bg-m3-surface-bright px-6 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-[2rem] bg-white/80 p-8 text-center shadow-[0_24px_80px_rgba(25,28,30,0.08)] ring-1 ring-m3-outline-variant/20 backdrop-blur">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-m3-secondary-fixed text-m3-secondary">
          {hasFailed ? (
            <AlertCircle className="h-7 w-7" />
          ) : (
            <ShieldCheck className="h-7 w-7" />
          )}
        </div>

        <h1 className="font-headline text-3xl font-black tracking-tight text-m3-primary">
          {status}
        </h1>

        <p className="mt-4 text-sm font-medium leading-relaxed text-m3-on-surface-variant">
          {details ?? "Securely exchanging your Google authorization code with aBridgeAI."}
        </p>

        {!hasFailed && (
          <Loader2 className="mx-auto mt-8 h-6 w-6 animate-spin text-m3-secondary" />
        )}

        {hasFailed && (
          <Link
            to="/login"
            search={{ next: undefined }}
            className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-m3-primary px-5 text-sm font-bold text-white transition-colors hover:bg-m3-primary/90"
          >
            Back to Login
          </Link>
        )}
      </section>
    </main>
  );
}
