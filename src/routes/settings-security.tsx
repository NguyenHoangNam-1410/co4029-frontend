import { useState } from "react";
import { Loader2, ShieldCheck, KeyRound, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useEnrollTotp,
  useMfaChallenge,
  useRegenerateRecoveryCodes,
  useVerifyMfa,
  useVerifyTotp,
} from "@/lib/api/hooks/auth";
import { useAuth } from "@/components/auth/AuthProvider";

type EnrollState =
  | { phase: "idle" }
  | {
      phase: "verifying";
      factorId: string;
      secret: string;
      otpauthUrl: string;
      code: string;
    }
  | { phase: "showRecoveryCodes"; codes: string[] };

type RegenState =
  | { phase: "idle" }
  | { phase: "challenge"; challengeId: string; code: string }
  | { phase: "showCodes"; codes: string[] };

function copyToClipboard(value: string, label: string) {
  void navigator.clipboard.writeText(value).then(
    () => toast.success(`Đã sao chép ${label}`),
    () => toast.error("Không thể sao chép"),
  );
}

function RecoveryCodesPanel({
  codes,
  onAcknowledge,
  title,
}: {
  codes: string[];
  onAcknowledge: () => void;
  title: string;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-m3-outline-variant/30 bg-m3-secondary-fixed/30 p-5">
      <div>
        <h4 className="font-headline text-base font-bold text-m3-on-surface">
          {title}
        </h4>
        <p className="mt-1 text-sm font-medium text-m3-on-surface-variant">
          Hãy lưu các mã này ở nơi an toàn. Mỗi mã chỉ dùng được một lần và sẽ
          không thể xem lại sau khi rời khỏi trang này.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-2 rounded-lg bg-white/80 p-4 font-mono text-sm">
        {codes.map((code) => (
          <li key={code} className="text-m3-on-surface">
            {code}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => copyToClipboard(codes.join("\n"), "danh sách mã")}
          className="gap-2"
        >
          <Copy className="h-4 w-4" />
          Sao chép tất cả
        </Button>
        <Button type="button" onClick={onAcknowledge} className="gap-2">
          <ShieldCheck className="h-4 w-4" />
          Tôi đã lưu mã
        </Button>
      </div>
    </div>
  );
}

function EnrollSection({ onEnrolled }: { onEnrolled: () => void }) {
  const [state, setState] = useState<EnrollState>({ phase: "idle" });
  const enroll = useEnrollTotp();
  const verify = useVerifyTotp();

  function startEnroll() {
    enroll.mutate(undefined, {
      onSuccess: (response) => {
        setState({
          phase: "verifying",
          factorId: response.factor_id,
          secret: response.secret,
          otpauthUrl: response.otpauth_url,
          code: "",
        });
      },
      onError: () => {
        toast.error("Không thể bắt đầu quá trình. Vui lòng thử lại.");
      },
    });
  }

  function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.phase !== "verifying") return;

    const trimmed = state.code.trim();
    if (!trimmed) return;

    verify.mutate(
      { factor_id: state.factorId, code: trimmed },
      {
        onSuccess: (response) => {
          toast.success("Đã bật xác thực hai bước");
          onEnrolled();
          setState({
            phase: "showRecoveryCodes",
            codes: response.recovery_codes,
          });
        },
        onError: () => {
          toast.error("Mã không hợp lệ");
          setState((prev) =>
            prev.phase === "verifying" ? { ...prev, code: "" } : prev,
          );
        },
      },
    );
  }

  if (state.phase === "showRecoveryCodes") {
    return (
      <RecoveryCodesPanel
        title="Mã khôi phục"
        codes={state.codes}
        onAcknowledge={() => setState({ phase: "idle" })}
      />
    );
  }

  if (state.phase === "verifying") {
    return (
      <form
        onSubmit={handleVerify}
        className="space-y-5 rounded-xl border border-m3-outline-variant/30 bg-white/70 p-5"
      >
        <div>
          <h4 className="font-headline text-base font-bold text-m3-on-surface">
            Quét mã QR bằng ứng dụng xác thực (Google Authenticator, Authy, ...)
          </h4>
          <p className="mt-1 text-sm font-medium text-m3-on-surface-variant">
            Hoặc nhập mã thủ công: <span className="font-mono">{state.secret}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => copyToClipboard(state.secret, "khoá bí mật")}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            Sao chép khoá
          </Button>
          <a
            href={state.otpauthUrl}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium text-m3-primary hover:bg-muted"
          >
            <KeyRound className="h-4 w-4" />
            Mở trong ứng dụng
          </a>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="totp-verify-code"
            className="text-sm font-semibold text-m3-on-surface"
          >
            Mã 6 chữ số
          </label>
          <Input
            id="totp-verify-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={state.code}
            onChange={(event) =>
              setState((prev) =>
                prev.phase === "verifying"
                  ? { ...prev, code: event.target.value }
                  : prev,
              )
            }
            maxLength={6}
            placeholder="123456"
            className="h-12 text-center text-lg tracking-[0.4em]"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setState({ phase: "idle" })}
            disabled={verify.isPending}
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            disabled={verify.isPending || !state.code.trim()}
            className="gap-2"
          >
            {verify.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Xác nhận
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Button
      type="button"
      onClick={startEnroll}
      disabled={enroll.isPending}
      className="gap-2"
    >
      {enroll.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ShieldCheck className="h-4 w-4" />
      )}
      Bật xác thực hai bước (TOTP)
    </Button>
  );
}

function RegenerateSection() {
  const [state, setState] = useState<RegenState>({ phase: "idle" });
  const challenge = useMfaChallenge();
  const verifyMfa = useVerifyMfa();
  const regenerate = useRegenerateRecoveryCodes();

  function startRegenerate() {
    challenge.mutate(undefined, {
      onSuccess: (response) => {
        setState({
          phase: "challenge",
          challengeId: response.challenge_id,
          code: "",
        });
      },
      onError: () => {
        toast.error("Không thể tạo phiên xác thực. Vui lòng thử lại.");
      },
    });
  }

  function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.phase !== "challenge") return;

    const trimmed = state.code.trim();
    if (!trimmed) return;

    verifyMfa.mutate(
      { challenge_id: state.challengeId, code: trimmed },
      {
        onSuccess: () => {
          regenerate.mutate(undefined, {
            onSuccess: (response) => {
              toast.success("Đã tạo mã khôi phục mới");
              setState({
                phase: "showCodes",
                codes: response.recovery_codes,
              });
            },
            onError: () => {
              toast.error("Không thể tạo lại mã khôi phục.");
              setState({ phase: "idle" });
            },
          });
        },
        onError: () => {
          toast.error("Mã không hợp lệ");
          setState((prev) =>
            prev.phase === "challenge" ? { ...prev, code: "" } : prev,
          );
        },
      },
    );
  }

  if (state.phase === "showCodes") {
    return (
      <RecoveryCodesPanel
        title="Mã khôi phục mới"
        codes={state.codes}
        onAcknowledge={() => setState({ phase: "idle" })}
      />
    );
  }

  if (state.phase === "challenge") {
    return (
      <form
        onSubmit={handleConfirm}
        className="space-y-5 rounded-xl border border-m3-outline-variant/30 bg-white/70 p-5"
      >
        <div>
          <h4 className="font-headline text-base font-bold text-m3-on-surface">
            Xác nhận lại bằng TOTP
          </h4>
          <p className="mt-1 text-sm font-medium text-m3-on-surface-variant">
            Nhập mã 6 chữ số từ ứng dụng xác thực để tạo lại mã khôi phục.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="regen-code"
            className="text-sm font-semibold text-m3-on-surface"
          >
            Mã 6 chữ số
          </label>
          <Input
            id="regen-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={state.code}
            onChange={(event) =>
              setState((prev) =>
                prev.phase === "challenge"
                  ? { ...prev, code: event.target.value }
                  : prev,
              )
            }
            maxLength={6}
            placeholder="123456"
            className="h-12 text-center text-lg tracking-[0.4em]"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setState({ phase: "idle" })}
            disabled={verifyMfa.isPending || regenerate.isPending}
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            disabled={
              verifyMfa.isPending ||
              regenerate.isPending ||
              !state.code.trim()
            }
            className="gap-2"
          >
            {verifyMfa.isPending || regenerate.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Xác nhận và tạo lại
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={startRegenerate}
      disabled={challenge.isPending}
      className="gap-2"
    >
      {challenge.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      Tạo lại mã khôi phục
    </Button>
  );
}

export default function SettingsSecurityPage() {
  const { requiresMfa } = useAuth();
  const [hasEnrolledThisSession, setHasEnrolledThisSession] = useState(false);

  const showRegenerate = requiresMfa || hasEnrolledThisSession;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-6">
      <header>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-m3-on-surface">
          Bảo mật tài khoản
        </h1>
        <p className="mt-2 text-sm font-medium text-m3-on-surface-variant">
          Quản lý xác thực hai bước (TOTP) và mã khôi phục cho tài khoản của bạn.
        </p>
      </header>

      <section className="space-y-4 rounded-xl bg-white/70 p-6 shadow-[0_24px_80px_rgba(25,28,30,0.06)] ring-1 ring-m3-outline-variant/20">
        <div>
          <h2 className="font-headline text-xl font-bold text-m3-on-surface">
            Xác thực hai bước
          </h2>
          <p className="mt-1 text-sm font-medium text-m3-on-surface-variant">
            Thêm một lớp bảo vệ cho tài khoản bằng ứng dụng xác thực TOTP.
          </p>
        </div>
        <EnrollSection onEnrolled={() => setHasEnrolledThisSession(true)} />
      </section>

      {showRegenerate && (
        <section className="space-y-4 rounded-xl bg-white/70 p-6 shadow-[0_24px_80px_rgba(25,28,30,0.06)] ring-1 ring-m3-outline-variant/20">
          <div>
            <h2 className="font-headline text-xl font-bold text-m3-on-surface">
              Mã khôi phục
            </h2>
            <p className="mt-1 text-sm font-medium text-m3-on-surface-variant">
              Tạo lại bộ mã khôi phục mới. Bộ mã cũ sẽ bị huỷ ngay lập tức.
            </p>
          </div>
          <RegenerateSection />
        </section>
      )}
    </div>
  );
}
