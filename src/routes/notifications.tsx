import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useNotifications } from "@/lib/api/hooks/notifications";
import { notificationDeepLink } from "@/lib/notifications/deep-link";
import { InfiniteList } from "@/components/ui/InfiniteList";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import type { Notification } from "@/lib/api/types";
import { Mail, Eye, EyeOff } from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  spaced_repetition: "Spaced Repetition",
  lesson_unlock: "Lesson Unlocked",
  interview_result: "Interview Result",
  course_announcement: "Course Announcement",
  system: "System",
};

const SNIPPET_LIMIT = 200;

function snippet(body: string): string {
  if (body.length <= SNIPPET_LIMIT) return body;
  return `${body.slice(0, SNIPPET_LIMIT).trimEnd()}…`;
}

function NotificationRow({
  notification,
  expanded,
  onToggle,
  onNavigate,
}: {
  notification: Notification;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (path: string) => void;
}) {
  const isRead = notification.read_at !== null;
  const categoryLabel =
    CATEGORY_LABEL[notification.category] ?? notification.category;
  const deepLink = notificationDeepLink(notification);
  const text = expanded ? notification.body : snippet(notification.body ?? "");

  function handleClick() {
    if (deepLink) {
      onNavigate(deepLink);
    } else {
      onToggle();
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-left flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-m3-surface-container-low ${
        isRead ? "opacity-70" : "bg-m3-secondary-fixed/15"
      }`}
    >
      <div className="w-9 h-9 rounded-xl bg-m3-primary-fixed flex items-center justify-center shrink-0">
        {isRead ? (
          <Eye className="h-4 w-4 text-m3-primary" />
        ) : (
          <EyeOff className="h-4 w-4 text-m3-primary" />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-m3-on-surface">
            {notification.title}
          </p>
          <Badge variant="secondary" className="shrink-0">
            {categoryLabel}
          </Badge>
        </div>
        {notification.body && (
          <p
            className={`text-sm text-m3-on-surface-variant whitespace-pre-line ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            {text}
          </p>
        )}
        <p className="text-xs text-m3-outline">
          {new Date(notification.created_at).toLocaleString()}
        </p>
      </div>

      {!isRead && (
        <div className="w-2 h-2 rounded-full bg-m3-secondary shrink-0 mt-2" />
      )}
    </button>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const {
    items,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
  } = useNotifications(20);

  return (
    <div className="min-h-screen bg-m3-surface pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <SectionHeader
          title="Notifications"
          subtitle="Course updates, quiz reminders, interview results."
        />

        <div className="bg-m3-surface-container-lowest rounded-xl shadow-editorial ghost-border overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-m3-surface-container animate-pulse"
                />
              ))}
            </div>
          ) : (
            <InfiniteList<Notification>
              items={items}
              hasNextPage={hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={isFetchingNextPage}
              isLoading={isLoading}
              keyOf={(n) => n.id}
              className="p-3 space-y-1"
              renderItem={(n) => (
                <NotificationRow
                  notification={n}
                  expanded={expandedId === n.id}
                  onToggle={() =>
                    setExpandedId((prev) => (prev === n.id ? null : n.id))
                  }
                  onNavigate={(path) => {
                    void navigate({ to: path });
                  }}
                />
              )}
              empty={
                <div className="p-12 text-center space-y-3">
                  <div className="w-14 h-14 rounded-xl bg-m3-primary-fixed flex items-center justify-center mx-auto">
                    <Mail className="h-7 w-7 text-m3-primary" />
                  </div>
                  <p className="text-base font-semibold text-m3-on-surface">
                    Chưa có thông báo nào
                  </p>
                  <p className="text-sm text-m3-on-surface-variant">
                    Khi có cập nhật khoá học, bài kiểm tra hoặc kết quả phỏng
                    vấn, bạn sẽ thấy ở đây.
                  </p>
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
