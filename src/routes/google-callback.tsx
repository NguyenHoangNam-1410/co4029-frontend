import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  consumePostLoginRedirect,
  GOOGLE_OAUTH_STATE_STORAGE_KEY,
  storeAuthSession,
} from "@/lib/auth";
import { useGoogleCallback } from "@/lib/api/hooks/auth";

export default function GoogleCallbackPage() {
  const search = useSearch({ strict: false }) as {
    code?: string | null;
    state?: string | null;
    error?: string | null;
  };

  const navigate = useNavigate();
  const googleCallback = useGoogleCallback();

  const [status, setStatus] = useState("Đang hoàn tất đăng nhập Google...");
  const [details, setDetails] = useState<string | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const { code, state, error } = search;

    function fail(message: string, detail: string) {
      setHasFailed(true);
      setStatus(message);
      setDetails(detail);
      toast.error("Đăng nhập thất bại. Vui lòng thử lại.");
      void navigate({
        to: "/login",
        search: { error: "oauth" } as never,
        replace: true,
      });
    }

    async function finishLogin() {
      if (error) {
        fail("Google sign-in was cancelled.", error);
        return;
      }

      if (!code) {
        fail(
          "Google did not return an authorization code.",
          "Start the sign-in flow again from the login page.",
        );
        return;
      }

      const expectedState = sessionStorage.getItem(
        GOOGLE_OAUTH_STATE_STORAGE_KEY,
      );
      sessionStorage.removeItem(GOOGLE_OAUTH_STATE_STORAGE_KEY);

      if (!state || !expectedState || state !== expectedState) {
        fail(
          "Unable to verify the Google sign-in response.",
          "The sign-in state did not match. Please try again.",
        );
        return;
      }

      try {
        const tokenResponse = await googleCallback.mutateAsync(code);
        storeAuthSession(tokenResponse);
        setStatus("Signed in successfully. Redirecting...");
        window.location.replace(consumePostLoginRedirect());
      } catch (err) {
        fail(
          "Unable to finish Google sign-in.",
          err instanceof Error ? err.message : "Please try again.",
        );
      }
    }

    void finishLogin();
  }, [search, googleCallback, navigate]);

  return (
    <main className="min-h-screen bg-m3-surface-bright px-6 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-xl bg-white/80 p-8 text-center shadow-[0_24px_80px_rgba(25,28,30,0.08)] ring-1 ring-m3-outline-variant/20 backdrop-blur">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-m3-secondary-fixed text-m3-secondary">
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
          {details ??
            "Securely exchanging your Google authorization code with aBridgeAI."}
        </p>

        {!hasFailed && (
          <Loader2 className="mx-auto mt-8 h-6 w-6 animate-spin text-m3-secondary" />
        )}
      </section>
    </main>
  );
}
