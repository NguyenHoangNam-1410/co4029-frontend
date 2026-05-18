import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";

const MIN_DESKTOP_WIDTH = 1024;

export function DesktopOnlyBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const evaluate = () => setShowBanner(window.innerWidth < MIN_DESKTOP_WIDTH);
    evaluate();
    window.addEventListener("resize", evaluate);
    return () => window.removeEventListener("resize", evaluate);
  }, []);

  if (!showBanner || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-slot="desktop-only-banner"
      className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text-strong"
    >
      <Monitor className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-medium">Trải nghiệm tốt nhất trên màn hình lớn</p>
        <p className="text-text-muted">
          Khu vực này được tối ưu cho màn hình từ 1024px trở lên. Một số bảng dữ liệu có thể khó đọc trên màn hình nhỏ.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-text-muted hover:bg-surface-muted hover:text-text-strong"
      >
        Đã hiểu
      </button>
    </div>
  );
}
