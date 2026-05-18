import { useMemo } from "react";
import { toast } from "sonner";
import { Bell, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import {
  useNotificationPreferences,
  usePatchNotificationPreference,
} from "@/lib/api/hooks/notifications";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPreferenceRead,
} from "@/lib/api/types";

const CATEGORIES: { id: NotificationCategory; label: string }[] = [
  { id: "spaced_repetition", label: "Ôn tập lặp lại" },
  { id: "lesson_unlock", label: "Mở khóa bài học" },
  { id: "interview_result", label: "Kết quả phỏng vấn" },
  { id: "course_announcement", label: "Thông báo khóa học" },
  { id: "system", label: "Hệ thống" },
];

const CHANNELS: { id: NotificationChannel; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "in_app", label: "Trong ứng dụng" },
];

function isEnabled(
  prefs: NotificationPreferenceRead[] | undefined,
  category: NotificationCategory,
  channel: NotificationChannel,
): boolean {
  if (!prefs) return true;
  const row = prefs.find(
    (p) => p.category === category && p.channel === channel,
  );
  return row ? row.enabled : true;
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-m3-primary" : "bg-m3-surface-container-high"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-editorial transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function SettingsNotificationsPage() {
  const { data: prefs, isLoading, isError, error } =
    useNotificationPreferences();
  const patch = usePatchNotificationPreference();

  const matrix = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        ...cat,
        cells: CHANNELS.map((ch) => ({
          channel: ch.id,
          enabled: isEnabled(prefs, cat.id, ch.id),
        })),
      })),
    [prefs],
  );

  function handleToggle(
    category: NotificationCategory,
    channel: NotificationChannel,
    nextEnabled: boolean,
  ) {
    patch.mutate(
      { category, channel, enabled: nextEnabled },
      {
        onError: (err) =>
          toast.error(
            (err as Error).message || "Không thể cập nhật tùy chọn",
          ),
      },
    );
  }

  return (
    <div className="min-h-screen bg-m3-surface pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <SectionHeader
          title="Tùy chọn thông báo"
          subtitle="Bạn sẽ luôn nhận được thông báo trong ứng dụng. Tắt email cho từng loại nếu không muốn nhận."
        />

        <div className="bg-m3-surface-container-lowest rounded-xl shadow-editorial ghost-border overflow-hidden">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center text-m3-on-surface-variant">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : isError ? (
            <div className="p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-m3-error-container flex items-center justify-center mx-auto">
                <Bell className="h-6 w-6 text-m3-on-error-container" />
              </div>
              <p className="text-sm font-semibold text-m3-on-surface">
                Không thể tải tùy chọn
              </p>
              <p className="text-xs text-m3-on-surface-variant">
                {(error as Error)?.message ?? "Vui lòng thử lại"}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-m3-surface-container-low">
                    <tr>
                      <th className="text-left text-xs font-semibold uppercase tracking-wide text-m3-on-surface-variant px-4 py-3">
                        Loại thông báo
                      </th>
                      {CHANNELS.map((ch) => (
                        <th
                          key={ch.id}
                          className="text-center text-xs font-semibold uppercase tracking-wide text-m3-on-surface-variant px-4 py-3 w-32"
                        >
                          {ch.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-m3-outline-variant/40">
                    {matrix.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-4 text-m3-on-surface font-medium">
                          {row.label}
                        </td>
                        {row.cells.map((cell) => (
                          <td
                            key={cell.channel}
                            className="px-4 py-4 text-center"
                          >
                            <div className="inline-flex">
                              <ToggleSwitch
                                checked={cell.enabled}
                                disabled={patch.isPending}
                                onChange={(next) =>
                                  handleToggle(row.id, cell.channel, next)
                                }
                                ariaLabel={`${row.label} – ${
                                  CHANNELS.find((c) => c.id === cell.channel)
                                    ?.label
                                }`}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden divide-y divide-m3-outline-variant/40">
                {matrix.map((row) => (
                  <div key={row.id} className="p-4 space-y-3">
                    <p className="text-sm font-semibold text-m3-on-surface">
                      {row.label}
                    </p>
                    <div className="space-y-2">
                      {row.cells.map((cell) => {
                        const channelLabel =
                          CHANNELS.find((c) => c.id === cell.channel)?.label ??
                          cell.channel;
                        return (
                          <div
                            key={cell.channel}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm text-m3-on-surface-variant">
                              {channelLabel}
                            </span>
                            <ToggleSwitch
                              checked={cell.enabled}
                              disabled={patch.isPending}
                              onChange={(next) =>
                                handleToggle(row.id, cell.channel, next)
                              }
                              ariaLabel={`${row.label} – ${channelLabel}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
