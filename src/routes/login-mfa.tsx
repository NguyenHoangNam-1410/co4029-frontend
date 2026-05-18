import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2, ShieldCheck, ArrowRight, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  useMfaChallenge,
  useVerifyMfa,
} from "@/lib/api/hooks/auth";
import { clearMfaRequired } from "@/lib/auth";

type Mode = "totp" | "recovery";

export default function LoginMfaPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { next?: string };
  const { isAuthenticated, requiresMfa } = useAuth();

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("totp");
  const [code, setCode] = useState("");

  const challenge = useMfaChallenge();
  const verify = useVerifyMfa();
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      void navigate({ to: "/login", search: { next: undefined }, replace: true });
      return;
    }

    if (!requiresMfa) {
      const next = search.next ?? "/dashboard";
      window.location.replace(next);
      return;
    }

    if (requestedRef.current) return;
    requestedRef.current = true;

    challenge.mutate(undefined, {
      onSuccess: (response) => {
        setChallengeId(response.challenge_id);
      },
      onError: () => {
        toast.error("Không thể bắt đầu xác thực hai bước. Vui lòng thử lại.");
      },
    });
  }, [isAuthenticated, requiresMfa, search.next, navigate, challenge]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!challengeId) {
      toast.error("Phiên xác thực chưa sẵn sàng. Vui lòng đợi trong giây lát.");
      return;
    }

    const trimmed = code.trim();
    if (!trimmed) return;

    const body =
      mode === "totp"
        ? { challenge_id: challengeId, code: trimmed }
        : { challenge_id: challengeId, recovery_code: trimmed };

    verify.mutate(body, {
      onSuccess: () => {
        clearMfaRequired();
        toast.success("Xác thực thành công");
        const next = search.next ?? "/dashboard";
        window.location.replace(next);
      },
      onError: () => {
        toast.error("Mã không hợp lệ");
        setCode("");
      },
    });
  }

  const isVerifying = verify.isPending;
  const isLoadingChallenge = challenge.isPending && !challengeId;

  return (
    <main className="flex min-h-screen items-center justify-center bg-m3-surface-bright px-6 py-10">
      <section className="w-full max-w-md space-y-8 rounded-xl bg-white/80 p-8 shadow-[0_24px_80px_rgba(25,28,30,0.08)] ring-1 ring-m3-outline-variant/20 backdrop-blur">
        <div className="flex justify-center">
          <Link
            to="/"
            className="font-headline text-3xl font-black tracking-tighter text-m3-primary"
            search={{}}
          >
            aBridgeAI
          </Link>
        </div>

        <header className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-m3-secondary-fixed text-m3-secondary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-m3-on-surface">
            Xác thực hai bước
          </h1>
          <p className="mt-2 text-sm font-medium text-m3-on-surface-variant">
            Nhập mã 6 chữ số từ ứng dụng xác thực, hoặc một mã khôi phục.
          </p>
        </header>

        <div
          className="grid grid-cols-2 gap-1 rounded-xl bg-m3-surface-container-low p-1"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "totp"}
            onClick={() => {
              setMode("totp");
              setCode("");
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              mode === "totp"
                ? "bg-white text-m3-primary shadow-sm"
                : "text-m3-on-surface-variant hover:text-m3-on-surface"
            }`}
          >
            Mã TOTP
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "recovery"}
            onClick={() => {
              setMode("recovery");
              setCode("");
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              mode === "recovery"
                ? "bg-white text-m3-primary shadow-sm"
                : "text-m3-on-surface-variant hover:text-m3-on-surface"
            }`}
          >
            Mã khôi phục
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              htmlFor="mfa-code"
              className="text-sm font-semibold text-m3-on-surface"
            >
              {mode === "totp" ? "Mã 6 chữ số" : "Mã khôi phục"}
            </label>
            <Input
              id="mfa-code"
              autoComplete="one-time-code"
              inputMode={mode === "totp" ? "numeric" : "text"}
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={isLoadingChallenge || isVerifying}
              placeholder={mode === "totp" ? "123456" : "abcd-efgh-ijkl"}
              className="h-12 text-center text-lg tracking-[0.4em]"
              maxLength={mode === "totp" ? 6 : 32}
            />
          </div>

          <Button
            type="submit"
            disabled={!challengeId || !code.trim() || isVerifying}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl font-bold"
          >
            {isVerifying ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <KeyRound className="h-5 w-5" />
            )}
            <span>{isVerifying ? "Đang xác thực..." : "Xác thực"}</span>
            {!isVerifying && <ArrowRight className="h-5 w-5" />}
          </Button>
        </form>

        {isLoadingChallenge && (
          <p className="flex items-center justify-center gap-2 text-xs font-medium text-m3-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tạo phiên xác thực...
          </p>
        )}
      </section>
    </main>
  );
}
