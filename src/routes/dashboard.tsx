import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMyCourses } from "@/lib/api/hooks/courses";
import { useNotifications } from "@/lib/api/hooks/notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getAuthDisplayName, getAuthUserInitials } from "@/lib/auth";
import type { Course } from "@/lib/api/types";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Bell,
  CheckCircle2,
  GraduationCap,
  Bot,
  Mic,
  FileText,
} from "lucide-react";

function CourseProgressCard({ course }: { course: Course }) {
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl shadow-editorial ghost-border p-6 flex flex-col gap-4 hover:-translate-y-0.5 transition-transform duration-200">
      <div className="relative h-32 rounded-xl overflow-hidden bg-gradient-to-br from-m3-primary to-m3-secondary flex items-center justify-center">
        <GraduationCap className="h-10 w-10 text-white/60" />
        <div className="absolute top-3 right-3">
          <Badge className="bg-m3-secondary-fixed text-m3-on-secondary-fixed border-0 text-xs font-medium">
            Đã ghi danh
          </Badge>
        </div>
      </div>      <div className="space-y-2 flex-1">
        <h3 className="font-headline font-semibold text-m3-on-surface text-base leading-snug">
          {course.title}
        </h3>
        {course.description && (
          <p className="text-xs text-m3-on-surface-variant line-clamp-2">
            {course.description}
          </p>
        )}
      </div>

      <Link
        to="/courses/$slug"
        params={{ slug: course.slug }}
        className="inline-flex items-center gap-2 gradient-primary text-white rounded-xl font-semibold px-4 py-2 text-sm shadow-glass hover:opacity-90 transition-opacity self-start"
      >
        Mở khóa học
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function EmptyCourses() {
  return (
    <div className="col-span-full">
      <EmptyState
        icon={BookOpen}
        title="Bạn chưa được đăng ký khóa học nào"
        description="Liên hệ giảng viên hoặc bộ phận đào tạo để được đăng ký khóa học phù hợp với lộ trình của bạn."
        cta={
          <Link to="/courses">
            <Button variant="default" className="gap-2 font-semibold">
              Khám phá khóa học
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />
    </div>
  );
}

function NotificationItem({ notification }: {
  notification: { id: string; category: string; title: string; body: string | null; read_at: string | null; created_at: string };
}) {
  const isRead = notification.read_at !== null;
  const icon = notification.category === "quiz_ready" ? FileText
    : notification.category === "interview_ready" ? Mic
    : notification.category === "progress" ? CheckCircle2
    : Bell;

  const Icon = icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl transition-colors ${isRead ? "opacity-60" : "bg-m3-secondary-fixed/20"}`}>
      <div className="w-8 h-8 rounded-xl gradient-secondary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface">{notification.title}</p>
        {notification.body && (
          <p className="text-xs text-m3-on-surface-variant mt-0.5 line-clamp-1">{notification.body}</p>
        )}
        <p className="text-xs text-m3-outline mt-1">
          {new Date(notification.created_at).toLocaleDateString()}
        </p>
      </div>
      {!isRead && (
        <div className="w-2 h-2 rounded-full bg-m3-secondary shrink-0 mt-1.5" />
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [fabHovered, setFabHovered] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const {
    items: myCourses,
    isLoading: coursesLoading,
  } = useMyCourses(8);
  const {
    items: notifications,
    isLoading: notificationsLoading,
  } = useNotifications();

  const firstName = getAuthDisplayName(user).split(" ")[0];
  const initials = getAuthUserInitials(user);

  const visibleCourses = myCourses.slice(0, 8);
  const enrolledCount = myCourses.length;
  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  function scrollCarousel(direction: "left" | "right") {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative min-h-screen bg-m3-surface pb-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 mb-1">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-m3-primary text-white text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <AIInsightChip pulse={false} className="ai-pulse">Phiên đang hoạt động</AIInsightChip>
            </div>
            <h1 className="font-headline font-bold text-4xl text-m3-primary leading-tight">
              Chào mừng trở lại, {firstName}.
            </h1>
            <p className="text-m3-on-surface-variant text-base">
              {enrolledCount > 0
                ? `Bạn đang theo học ${enrolledCount} khóa học.`
                : "Khám phá thư viện khóa học để bắt đầu hành trình học tập."}
            </p>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Đã đăng ký"
            value={coursesLoading ? "—" : enrolledCount}
            sublabel="Khóa học đang theo"
            icon={BookOpen}
            variant="primary"
          />
          <StatCard
            label="Thông báo"
            value={notificationsLoading ? "—" : unreadCount}
            sublabel="Chưa đọc"
            icon={Bell}
            variant="surface"
          />
          <StatCard
            label="Bài kiểm tra"
            value="—"
            sublabel="Đang chờ chấm"
            icon={FileText}
            variant="surface"
          />
          <StatCard
            label="Phỏng vấn"
            value="—"
            sublabel="Đã lên lịch"
            icon={Mic}
            variant="surface"
          />
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <SectionHeader title="Khóa học của bạn" subtitle="Tiếp tục từ nơi bạn đã dừng" />
            <div className="flex items-center gap-2 shrink-0">
              {enrolledCount > 8 && (
                <Link
                  to="/courses"
                  className="text-xs font-semibold text-m3-secondary hover:underline"
                >
                  Xem tất cả
                </Link>
              )}
              {enrolledCount > 3 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => scrollCarousel("left")}
                    className="rounded-xl border-m3-outline-variant hover:bg-m3-surface-container-low"
                    aria-label="Cuộn trái"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => scrollCarousel("right")}
                    className="rounded-xl border-m3-outline-variant hover:bg-m3-surface-container-low"
                    aria-label="Cuộn phải"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {coursesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : enrolledCount === 0 ? (
            <div className="grid grid-cols-1">
              <EmptyCourses />
            </div>
          ) : enrolledCount <= 3 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleCourses.map((course) => (
                <CourseProgressCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory no-scrollbar"
            >
              {visibleCourses.map((course) => (
                <div key={course.id} className="flex-none w-80 snap-start">
                  <CourseProgressCard course={course} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionHeader
              title="Thông báo"
              subtitle={unreadCount > 0 ? `${unreadCount} chưa đọc` : "Bạn đã xem hết"}
            />
          </div>

          <div className="bg-m3-surface-container-lowest rounded-xl shadow-editorial ghost-border overflow-hidden">
            {notificationsLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="Chưa có thông báo nào"
                description="Khi có bài kiểm tra, phỏng vấn hoặc cập nhật khóa học, thông báo sẽ xuất hiện ở đây."
              />
            ) : (
              <div className="p-3 space-y-1 max-h-72 overflow-y-auto">
                {notifications.slice(0, 8).map((n) => (
                  <NotificationItem key={n.id} notification={n} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-xl gradient-primary p-8 flex flex-col gap-5 shadow-editorial">
          <div className="pointer-events-none absolute -bottom-10 -right-10 w-48 h-48 rounded-full opacity-20 blur-2xl" style={{ background: "#1d4ed8" }} />

          <AIInsightChip className="self-start bg-white/15 text-white border-0">
            Hỗ trợ bởi AI
          </AIInsightChip>

          <div className="space-y-2">
            <h3 className="font-headline font-bold text-2xl text-white leading-snug">
              Sẵn sàng cho thử thách kế tiếp?
            </h3>
            <p className="text-white/70 text-sm leading-relaxed max-w-lg">
              Hoàn thành các khóa học đã đăng ký, làm bài kiểm tra do AI tạo và luyện tập các kịch bản phỏng vấn thực tế — tất cả đều được theo dõi và cá nhân hóa theo lộ trình học của bạn.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/courses">
              <Button className="bg-white text-m3-primary hover:bg-white/90 rounded-xl font-semibold gap-2 transition-colors">
                Khám phá khóa học
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/dashboard/sr">
              <Button variant="outline" className="bg-white/10 border-white/25 text-white hover:bg-white/20 rounded-xl font-semibold">
                Xem tiến độ
              </Button>
            </Link>
          </div>
        </section>

      </div>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <div
          className={`transition-all duration-200 origin-bottom-right ${
            fabHovered ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-1 pointer-events-none"
          }`}
        >
          <div className="bg-m3-on-surface text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-editorial whitespace-nowrap">
            Hỏi trợ lý AI
          </div>
        </div>

        <button
          onMouseEnter={() => setFabHovered(true)}
          onMouseLeave={() => setFabHovered(false)}
          onFocus={() => setFabHovered(true)}
          onBlur={() => setFabHovered(false)}
          className="cursor-pointer gradient-primary text-white w-14 h-14 rounded-xl flex items-center justify-center shadow-ai-glow hover:opacity-90 active:scale-95 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-secondary"
          aria-label="Hỏi trợ lý AI"
        >
          <Bot className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
