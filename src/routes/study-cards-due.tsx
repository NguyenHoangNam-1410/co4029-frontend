import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Flame,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { useCardsDue } from "@/lib/api/hooks/spaced-repetition";
import { InfiniteList } from "@/components/ui/InfiniteList";
import { SectionHeader } from "@/components/ui/section-header";
import type { CardDue } from "@/lib/api/types";
import { cn } from "@/lib/utils";

function relativeDue(dueAt: string): { label: string; overdue: boolean } {
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const diffMs = due - now;
  if (diffMs <= 0) return { label: "Cần ôn ngay", overdue: true };
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) {
    return {
      label: `Còn ${minutes} phút`,
      overdue: false,
    };
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return { label: `Còn ${hours} giờ`, overdue: false };
  }
  const days = Math.round(hours / 24);
  return { label: `Còn ${days} ngày`, overdue: false };
}

function CardDueRow({ card }: { card: CardDue }) {
  const { label: dueLabel, overdue } = relativeDue(card.due_at);
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-4 flex items-center gap-4 hover:bg-m3-surface-container-low transition-colors">
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          overdue ? "bg-red-100" : "bg-m3-primary-fixed",
        )}
      >
        {overdue ? (
          <Flame className="h-5 w-5 text-red-600" />
        ) : (
          <RefreshCw className="h-5 w-5 text-m3-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-m3-on-surface truncate">
            {card.lesson_title}
          </p>
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border",
              overdue
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-m3-secondary-fixed text-m3-primary border-transparent",
            )}
          >
            {dueLabel}
          </span>
        </div>
        <p className="text-xs text-m3-on-surface-variant mt-0.5 flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            EF {card.ef.toFixed(2)}
          </span>
          {typeof card.last_q === "number" && (
            <span>Q gần nhất: {card.last_q}</span>
          )}
        </p>
      </div>
      <Clock className="h-4 w-4 text-m3-on-surface-variant shrink-0" />
    </div>
  );
}

export default function StudyCardsDuePage() {
  const {
    items,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
  } = useCardsDue({ limit: 20 });

  const overdueCount = items.filter(
    (c) => new Date(c.due_at).getTime() <= Date.now(),
  ).length;

  return (
    <div className="min-h-screen bg-m3-surface pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/sr"
            className="p-2 rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant transition-colors cursor-pointer"
            aria-label="Quay lại bảng điều khiển"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <SectionHeader
            title="Thẻ cần ôn"
            subtitle={
              isLoading
                ? "Đang tải..."
                : items.length === 0
                  ? "Không có thẻ nào trong hàng đợi"
                  : `${items.length} thẻ${
                      overdueCount > 0 ? ` • ${overdueCount} cần ôn ngay` : ""
                    }`
            }
          />
        </div>

        <InfiniteList<CardDue>
          items={items}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isLoading}
          className="space-y-3"
          keyOf={(card) => card.question_id}
          renderItem={(card) => <CardDueRow card={card} />}
          empty={
            <div className="rounded-xl border-2 border-dashed border-m3-outline-variant flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-xl bg-m3-primary-fixed flex items-center justify-center">
                <Inbox className="h-7 w-7 text-m3-primary" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-m3-on-surface text-lg">
                  Chưa có thẻ nào cần ôn tập hôm nay
                </h3>
                <p className="text-sm text-m3-on-surface-variant mt-1">
                  Hãy quay lại sau khi đã hoàn thành bài học mới.
                </p>
              </div>
              <Link
                to="/dashboard/sr"
                className="inline-flex items-center gap-2 gradient-primary text-white rounded-xl font-semibold px-4 py-2 text-sm shadow-glass hover:opacity-90 transition-opacity cursor-pointer"
              >
                Quay lại bảng điều khiển
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}
