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
      </div>

      <div className="space-y-2 flex-1">
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
    <div className="col-span-full rounded-xl border-2 border-dashed border-m3-outline-variant flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
      <div className="w-14 h-14 rounded-xl bg-m3-primary-fixed flex items-center justify-center">
        <BookOpen className="h-7 w-7 text-m3-primary" />
      </div>
      <div>
        <h3 className="font-headline font-bold text-m3-on-surface text-lg">No courses yet</h3>
        <p className="text-sm text-m3-on-surface-variant mt-1">
          Browse the course library and enrol to get started.
        </p>
      </div>
      <Link to="/courses">
        <Button className="gradient-primary text-white border-0 gap-2 font-semibold">
          Browse Courses
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
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
              <AIInsightChip pulse={false} className="ai-pulse">Active Session</AIInsightChip>
            </div>
            <h1 className="font-headline font-bold text-4xl text-m3-primary leading-tight">
              Welcome back, {firstName}.
            </h1>
            <p className="text-m3-on-surface-variant text-base">
              {enrolledCount > 0
                ? `You have ${enrolledCount} course${enrolledCount === 1 ? "" : "s"} in progress.`
                : "Explore the course library to start learning."}
            </p>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Enrolled"
            value={coursesLoading ? "—" : enrolledCount}
            sublabel="Active courses"
            icon={BookOpen}
            variant="primary"
          />
          <StatCard
            label="Notifications"
            value={notificationsLoading ? "—" : unreadCount}
            sublabel="Unread"
            icon={Bell}
            variant="surface"
          />
          <StatCard
            label="Quizzes"
            value="—"
            sublabel="Awaiting review"
            icon={FileText}
            variant="surface"
          />
          <StatCard
            label="Interviews"
            value="—"
            sublabel="Scheduled"
            icon={Mic}
            variant="surface"
          />
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <SectionHeader title="My Courses" subtitle="Pick up where you left off" />
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
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => scrollCarousel("right")}
                    className="rounded-xl border-m3-outline-variant hover:bg-m3-surface-container-low"
                    aria-label="Scroll right"
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
                <div key={i} className="bg-m3-surface-container-lowest rounded-xl ghost-border p-6 h-72 animate-pulse" />
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
              title="Notifications"
              subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            />
          </div>

          <div className="bg-m3-surface-container-lowest rounded-xl shadow-editorial ghost-border overflow-hidden">
            {notificationsLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-m3-surface-container animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-m3-primary-fixed flex items-center justify-center mx-auto">
                  <Bell className="h-6 w-6 text-m3-primary" />
                </div>
                <p className="text-sm font-semibold text-m3-on-surface">No notifications yet</p>
                <p className="text-xs text-m3-on-surface-variant">
                  You&apos;ll see alerts here when quizzes, interviews, or course updates are ready.
                </p>
              </div>
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
            AI Powered
          </AIInsightChip>

          <div className="space-y-2">
            <h3 className="font-headline font-bold text-2xl text-white leading-snug">
              Ready for your next challenge?
            </h3>
            <p className="text-white/70 text-sm leading-relaxed max-w-lg">
              Complete your enrolled courses, take AI-generated quizzes, and practise real-world
              interview scenarios — all tracked and personalised to your learning path.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/courses">
              <Button className="bg-white text-m3-primary hover:bg-white/90 rounded-xl font-semibold gap-2 transition-colors">
                Browse Courses
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/progress">
              <Button variant="outline" className="bg-white/10 border-white/25 text-white hover:bg-white/20 rounded-xl font-semibold">
                View Progress
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
            Ask AI Coach
          </div>
        </div>

        <button
          onMouseEnter={() => setFabHovered(true)}
          onMouseLeave={() => setFabHovered(false)}
          onFocus={() => setFabHovered(true)}
          onBlur={() => setFabHovered(false)}
          className="gradient-primary text-white w-14 h-14 rounded-xl flex items-center justify-center shadow-ai-glow hover:opacity-90 active:scale-95 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-secondary"
          aria-label="Ask AI Coach"
        >
          <Bot className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
