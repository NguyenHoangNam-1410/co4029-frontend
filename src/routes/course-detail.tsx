import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  BookOpen,
  PlayCircle,
  HelpCircle,
  Code,
  ArrowRight,
  Calendar,
  Mail,
  GraduationCap,
  Sparkles,
  BarChart3,
  Mic,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GlassCard } from "@/components/ui/glass-card";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { GradientProgress } from "@/components/ui/gradient-progress";
import {
  useCourseBySlug,
  useCourseContent,
  useCourseOutcomes,
  useCourseTags,
  useCourseStatus,
} from "@/lib/api/hooks/use-student-api";
import { deriveCourseStatus, formatMinutes } from "@/lib/api/utils";
import type { CourseContentModule, CourseDetail, CourseTag } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";

/* ── Constants ── */

const CARD_GRADIENTS = [
  "from-violet-500 via-purple-600 to-indigo-700",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-pink-500 via-rose-500 to-orange-500",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-amber-500 via-orange-500 to-red-500",
  "from-indigo-500 via-blue-600 to-sky-500",
];

/* ── Helpers ── */

function slugGradient(slug: string) {
  const hash = slug.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
}

function ItemTypeIcon({ type, lessonType }: { type: "lesson" | "quiz" | "interview"; lessonType?: string | null }) {
  if (type === "quiz")      return <HelpCircle className="h-3.5 w-3.5 text-m3-primary shrink-0" />;
  if (type === "interview") return <Mic className="h-3.5 w-3.5 text-m3-secondary shrink-0" />;
  if (lessonType === "reading")  return <BookOpen   className="h-3.5 w-3.5 text-m3-secondary shrink-0" />;
  if (lessonType === "exercise") return <Code        className="h-3.5 w-3.5 text-m3-secondary shrink-0" />;
  return <PlayCircle className="h-3.5 w-3.5 text-m3-secondary shrink-0" />;
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-m3-surface-container", className)} />;
}

/* ════════════════════════════════════════════════════════
   Page
   ════════════════════════════════════════════════════════ */

export default function CourseDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };

  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const courseId = course?.id;

  const { data: outcomes, isLoading: outcomesLoading } = useCourseOutcomes(courseId);
  const { data: content, isLoading: contentLoading } = useCourseContent(courseId);
  const { data: tags } = useCourseTags(courseId);
  const { data: enrollmentStatus } = useCourseStatus(courseId);

  const progress = enrollmentStatus ? Number(enrollmentStatus.progress_percent) : 0;
  const courseStatus = enrollmentStatus ? deriveCourseStatus(progress) : "not_started";
  const isEnrolled = !!enrollmentStatus;

  const totalItems = content?.modules.reduce((acc, m) => acc + m.items.length, 0) ?? 0;

  const ctaLabel =
    courseStatus === "completed" ? "Review Course" :
    courseStatus === "in_progress" ? "Resume Learning" :
    "Start Learning";

  const levelColor =
    course?.level === "Beginner"     ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    course?.level === "Intermediate" ? "bg-amber-50 text-amber-700 border-amber-200" :
    course?.level                    ? "bg-purple-50 text-purple-700 border-purple-200" : "";

  if (courseLoading) {
    return (
      <div className="min-h-screen bg-m3-surface pb-28">
        <div className="h-72 bg-gradient-to-br from-m3-primary via-m3-primary-container to-m3-secondary animate-pulse" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-72" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-m3-surface flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-m3-on-surface font-headline font-bold text-xl">Course not found</p>
          <Link to="/courses">
            <Button className="gradient-primary text-white rounded-xl gap-2">
              Browse Courses <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const gradientClass = slugGradient(slug);

  const ctaCard = (
    <CtaCard
      course={course}
      gradientClass={gradientClass}
      isEnrolled={isEnrolled}
      progress={progress}
      courseStatus={courseStatus}
      ctaLabel={ctaLabel}
      totalItems={totalItems}
      tags={tags}
    />
  );

  return (
    <div className="min-h-screen bg-m3-surface pb-28">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-m3-primary via-m3-primary-container to-m3-secondary">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48ZmVCbGVuZCBtb2RlPSJzY3JlZW4iLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-20 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-white/60 mb-6">
            <Link to="/courses" className="hover:text-white transition-colors">Courses</Link>
            <span>/</span>
            <span className="text-white/90 truncate">{course.title}</span>
          </nav>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Left */}
            <div className="flex-1 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                {course.level && (
                  <Badge className={cn("text-xs font-semibold border", levelColor)}>
                    {course.level}
                  </Badge>
                )}
                <AIInsightChip className="bg-white/10 text-white border-0">
                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                  AI Enhanced
                </AIInsightChip>
              </div>

              <h1 className="font-headline font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight tracking-tight">
                {course.title}
              </h1>

              {course.description && (
                <p className="text-white/75 text-base sm:text-lg leading-relaxed max-w-2xl">
                  {course.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-5 text-sm text-white/80">
                {course.estimated_minutes && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {formatMinutes(course.estimated_minutes)}
                  </span>
                )}
                {totalItems > 0 && (
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    {totalItems} items
                  </span>
                )}
                {(content?.modules.length ?? 0) > 0 && (
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4" />
                    {content!.modules.length} modules
                  </span>
                )}
              </div>

              {/* Instructor line */}
              {course.instructor && (
                <div className="flex items-center gap-2.5 text-sm text-white/70">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="gradient-secondary text-white text-xs font-bold">
                      {initials(course.instructor.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    Created by{" "}
                    <span className="text-white font-semibold">{course.instructor.display_name}</span>
                  </span>
                </div>
              )}

              {/* Tags */}
              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-medium"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Inline sidebar on desktop */}
            <div className="hidden lg:block w-80 xl:w-88 shrink-0">{ctaCard}</div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Left column ── */}
          <div className="flex-1 min-w-0 space-y-8">

            {/* What You'll Learn */}
            {outcomesLoading ? (
              <SkeletonBlock className="h-48" />
            ) : outcomes && outcomes.length > 0 ? (
              <GlassCard className="p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <GraduationCap className="h-5 w-5 text-m3-secondary" />
                  <h2 className="font-headline font-bold text-xl text-m3-on-surface">
                    What You'll Learn
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {outcomes
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((outcome) => (
                      <div key={outcome.id} className="flex items-start gap-3">
                        <CheckCircle2 className="h-4 w-4 text-m3-secondary shrink-0 mt-0.5 fill-m3-secondary/10" />
                        <p className="text-sm text-m3-on-surface-variant leading-snug">
                          {outcome.outcome_text}
                        </p>
                      </div>
                    ))}
                </div>
              </GlassCard>
            ) : null}

            {/* Course Content */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-headline font-bold text-xl text-m3-on-surface">Course Content</h2>
                {!contentLoading && content && (
                  <span className="text-xs text-m3-on-surface-variant">
                    {content.modules.length} module{content.modules.length !== 1 ? "s" : ""}
                    {totalItems > 0 && ` · ${totalItems} items`}
                    {course.estimated_minutes && ` · ${formatMinutes(course.estimated_minutes)}`}
                  </span>
                )}
              </div>

              {contentLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-16" />)}
                </div>
              ) : content && content.modules.length > 0 ? (
                <ModuleAccordion modules={content.modules} />
              ) : (
                <div className="rounded-2xl border border-dashed border-m3-outline-variant p-10 text-center">
                  <p className="text-sm text-m3-on-surface-variant">No modules available yet.</p>
                </div>
              )}
            </div>

            {/* Instructor */}
            {course.instructor && (
              <InstructorCard instructor={course.instructor} />
            )}

            {/* AI Interview callout */}
            <GlassCard className="p-6 sm:p-8 bg-gradient-to-br from-m3-secondary/5 to-m3-primary/5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl gradient-secondary flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-headline font-bold text-m3-primary text-base">
                    AI Mock Interviews Included
                  </h3>
                  <p className="text-sm text-m3-on-surface-variant leading-relaxed">
                    Complete each module to unlock an AI-powered mock interview. Get real-time feedback,
                    adaptive follow-up questions, and a detailed assessment of your technical explanations.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Sidebar — mobile: below content */}
          <div className="w-full lg:hidden">{ctaCard}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ModuleAccordion({ modules }: { modules: CourseContentModule[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {modules.map((mod) => {
        const isOpen = open.has(mod.id);
        const lessonCount    = mod.items.filter((i) => i.item_type === "lesson").length;
        const quizCount      = mod.items.filter((i) => i.item_type === "quiz").length;
        const interviewCount = mod.items.filter((i) => i.item_type === "interview").length;

        return (
          <div
            key={mod.id}
            className="rounded-2xl overflow-hidden border border-m3-outline-variant/30 bg-m3-surface-container-lowest shadow-sm"
          >
            <button
              onClick={() => toggle(mod.id)}
              className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-m3-surface-container-low transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-headline font-semibold text-sm text-m3-on-surface leading-snug">
                    {mod.title}
                  </p>
                  <p className="text-xs text-m3-on-surface-variant mt-0.5 flex flex-wrap gap-1.5">
                    {mod.items.length > 0 && <span>{mod.items.length} items</span>}
                    {lessonCount > 0 && <span>· {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}</span>}
                    {quizCount > 0 && <span>· {quizCount} quiz{quizCount !== 1 ? "zes" : ""}</span>}
                    {interviewCount > 0 && <span>· {interviewCount} interview{interviewCount !== 1 ? "s" : ""}</span>}
                    {mod.estimated_minutes && <span>· {formatMinutes(mod.estimated_minutes)}</span>}
                  </p>
                </div>
              </div>
              {isOpen
                ? <ChevronUp className="h-4 w-4 text-m3-outline shrink-0 ml-3" />
                : <ChevronDown className="h-4 w-4 text-m3-outline shrink-0 ml-3" />
              }
            </button>

            {isOpen && (
              <div className="border-t border-m3-outline-variant/20 divide-y divide-m3-outline-variant/10">
                {mod.items.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-m3-outline">No items added yet.</div>
                ) : (
                  mod.items.map((item) => {
                    const label =
                      item.item_type === "quiz"      ? "Quiz" :
                      item.item_type === "interview" ? "AI Mock Interview" :
                      item.lesson?.title ?? "Lesson";

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-m3-surface-container-low transition-colors"
                      >
                        <ItemTypeIcon type={item.item_type} lessonType={item.lesson?.lesson_type} />
                        <span className="text-sm text-m3-on-surface-variant flex-1 leading-snug">
                          {label}
                        </span>
                        {item.lesson?.estimated_minutes && (
                          <span className="text-xs text-m3-outline shrink-0">
                            {formatMinutes(item.lesson.estimated_minutes)}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InstructorCard({ instructor }: { instructor: NonNullable<CourseDetail["instructor"]> }) {
  const inits = initials(instructor.display_name);

  return (
    <GlassCard className="p-6 sm:p-8">
      <h2 className="font-headline font-bold text-xl text-m3-on-surface mb-5">About the Instructor</h2>
      <div className="flex flex-col sm:flex-row gap-5">
        <Avatar className="h-20 w-20 shrink-0 ring-4 ring-white shadow-xl self-start">
          <AvatarFallback className="gradient-primary text-white text-xl font-bold">
            {inits}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-3 flex-1">
          <div>
            <h3 className="font-headline font-bold text-m3-primary text-lg">
              {instructor.display_name}
            </h3>
            <p className="text-m3-secondary text-sm font-semibold mt-0.5">Instructor</p>
          </div>
          {instructor.bio && (
            <p className="text-sm text-m3-on-surface-variant leading-relaxed">{instructor.bio}</p>
          )}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl ghost-border text-xs font-bold text-m3-primary hover:bg-m3-surface-container"
            >
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Message
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl ghost-border text-xs font-bold text-m3-primary hover:bg-m3-surface-container"
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Office Hours
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function CtaCard({
  course,
  gradientClass,
  isEnrolled,
  progress,
  courseStatus,
  ctaLabel,
  totalItems,
  tags,
}: {
  course: CourseDetail;
  gradientClass: string;
  isEnrolled: boolean;
  progress: number;
  courseStatus: string;
  ctaLabel: string;
  totalItems: number;
  tags: CourseTag[] | undefined;
}) {
  return (
    <div className="rounded-3xl overflow-hidden shadow-editorial ghost-border bg-m3-surface-container-lowest">
      {/* Thumbnail */}
      <div className={cn("relative h-44 bg-gradient-to-br", gradientClass)}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
        </div>
        <div className="absolute bottom-3 left-3">
          <span className="text-[10px] text-white/70 font-medium">
            Updated{" "}
            {new Date(course.updated_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Progress (only if enrolled) */}
        {isEnrolled && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-m3-on-surface-variant">
              <span>Your progress</span>
              <span className="font-semibold text-m3-secondary">{Math.round(progress)}%</span>
            </div>
            <GradientProgress
              value={progress}
              variant={courseStatus === "completed" ? "success" : "secondary"}
              size="sm"
            />
          </div>
        )}

        {/* CTA */}
        <Link to="/courses/$slug/learn" params={{ slug: course.slug }} className="block">
          <Button className="w-full gradient-primary text-white font-bold rounded-xl py-5 h-auto text-base gap-2 shadow-ai-glow hover:opacity-90 transition-opacity">
            {ctaLabel}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>

        {/* Quick stats */}
        <div className="space-y-3 pt-1">
          {[
            course.estimated_minutes && { icon: Clock,     label: "Duration", value: formatMinutes(course.estimated_minutes) },
            totalItems > 0            && { icon: BookOpen,  label: "Items",    value: `${totalItems}` },
            course.level              && { icon: BarChart3, label: "Level",    value: course.level },
          ]
            .filter(Boolean)
            .map((stat) => {
              if (!stat) return null;
              const { icon: Icon, label, value } = stat as { icon: typeof Clock; label: string; value: string };
              return (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-m3-on-surface-variant">
                    <Icon className="h-4 w-4 text-m3-outline" />
                    {label}
                  </span>
                  <span className="font-semibold text-m3-on-surface text-xs">{value}</span>
                </div>
              );
            })}
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-m3-outline-variant/20">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2.5 py-1 rounded-full bg-m3-secondary/8 text-m3-secondary text-[10px] font-semibold"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Instructor mini-card */}
        {course.instructor && (
          <div className="flex items-center gap-3 pt-2 border-t border-m3-outline-variant/20">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="gradient-primary text-white text-xs font-bold">
                {initials(course.instructor.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-m3-on-surface truncate">
                {course.instructor.display_name}
              </p>
              <p className="text-[10px] text-m3-on-surface-variant">Instructor</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
