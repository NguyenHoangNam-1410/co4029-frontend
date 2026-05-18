import { useState, useMemo } from "react";
import { Link, useParams } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import {
  Play,
  Volume2,
  Maximize,
  Settings,
  Captions,
  CheckCircle2,
  PlayCircle,
  BookOpen,
  Lock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mic,
  ArrowRight,
  FileText,
  Download,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import { DefaultVideoLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { Button } from "@/components/ui/button";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { GlassCard } from "@/components/ui/glass-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useCourseBySlug,
  useCourseContentBySlug,
  useCourseStatus,
  useCourseLessonsProgress,
  useLessonResources,
  fetchResourceDownloadUrl,
} from "@/lib/api/hooks/courses";
import { useMaterialStreamUrl } from "@/lib/api/hooks/materials";
import { formatMinutes } from "@/lib/api/utils";
import type { CourseContentItem, CourseContentModule } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";

/* ── Types ── */

type LessonState = "active" | "completed" | "pending" | "locked";

/** Flat entry used by the curriculum sidebar. */
interface FlatItem {
  moduleId: string;
  moduleTitle: string;
  item: CourseContentItem;
  /** display label */
  label: string;
}

const TABS = ["Lesson Notes", "Discussion", "Resources"] as const;
type Tab = (typeof TABS)[number];

/* ── Helpers ── */

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ════════════════════════════════════════════════════════
   Page
   ════════════════════════════════════════════════════════ */

export default function CourseLearnPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };

  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const courseId = course?.id;

  const { data: content, isLoading: contentLoading } = useCourseContentBySlug(slug);
  const { data: courseStatus } = useCourseStatus(courseId);
  const { data: lessonsProgress } = useCourseLessonsProgress(courseId);

  /* ── Build flat item list from content ── */
  const flatItems = useMemo<FlatItem[]>(() => {
    if (!content) return [];
    const sorted = [...content.modules].sort((a, b) => a.position - b.position);
    return sorted.flatMap((mod) =>
      [...mod.items]
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          moduleId: mod.id,
          moduleTitle: mod.title,
          item,
          label:
            item.item_type === "quiz"
              ? "Module Quiz"
              : item.item_type === "interview"
              ? "AI Mock Interview"
              : item.lesson?.title ?? "Lesson",
        }))
      );
  }, [content]);

  const lessonItems = useMemo(
    () => flatItems.filter((fi) => fi.item.item_type === "lesson"),
    [flatItems]
  );

  /* ── Active item index ── */
  const initialIdx = useMemo(() => {
    if (!lessonItems.length) return 0;
    // find first non-completed lesson
    const progressMap = new Map(lessonsProgress?.lessons.map((l) => [l.lesson_id, l.status]));
    const idx = lessonItems.findIndex(
      (fi) => fi.item.item_type === "lesson" && progressMap.get(fi.item.lesson_id ?? "") !== "completed"
    );
    return idx !== -1 ? idx : 0;
  }, [lessonItems, lessonsProgress]);

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Lesson Notes");

  const resolvedIdx = activeIdx ?? initialIdx;
  const activeEntry = lessonItems[resolvedIdx] ?? null;
  const activeItem = activeEntry?.item ?? null;
  const activeLesson = activeItem?.lesson ?? null;

  const activeModuleQuiz = useMemo(() => {
    if (!activeEntry) return null;
    return (
      flatItems.find(
        (fi) => fi.moduleId === activeEntry.moduleId && fi.item.item_type === "quiz" && fi.item.quiz_id
      ) ?? null
    );
  }, [activeEntry, flatItems]);

  /* ── Derive per-item state for sidebar ── */
  const progressMap = useMemo(
    () => new Map(lessonsProgress?.lessons.map((l) => [l.lesson_id, l.status]) ?? []),
    [lessonsProgress]
  );

  function itemState(fi: FlatItem): LessonState {
    if (fi.item.item_type === "lesson") {
      if (fi.item.lesson_id === activeLesson?.id) return "active";
      const s = progressMap.get(fi.item.lesson_id ?? "");
      if (s === "completed") return "completed";
    }
    return "pending";
  }

  /* ── Video stream URL ── */
  const { data: streamData } = useMaterialStreamUrl(activeLesson?.primary_material_id);

  /* ── Lesson resources (loaded when Resources tab active) ── */
  const lessonIdForResources = activeTab === "Resources" ? (activeLesson?.id ?? undefined) : undefined;
  const { data: resources } = useLessonResources(lessonIdForResources);

  /* ── Navigation ── */
  const hasPrev = resolvedIdx > 0;
  const hasNext = resolvedIdx < lessonItems.length - 1;

  function goPrev() { if (hasPrev) setActiveIdx(resolvedIdx - 1); }
  function goNext() { if (hasNext) setActiveIdx(resolvedIdx + 1); }

  /* ── Progress stats ── */
  const progress = courseStatus ? Number(courseStatus.progress_percent) : 0;
  const completedLessonCount = lessonsProgress?.lessons.filter((l) => l.status === "completed").length ?? 0;
  const totalLessonCount = lessonItems.length;

  /* ── Loading state ── */
  if (courseLoading || contentLoading) {
    return (
      <div className="min-h-screen bg-m3-surface flex items-center justify-center">
        <div className="space-y-3 w-64">
          <div className="h-4 rounded-full bg-m3-surface-container animate-pulse" />
          <div className="h-4 rounded-full bg-m3-surface-container animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  if (!course || !content) {
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

  if (!lessonItems.length) {
    return (
      <div className="min-h-screen bg-m3-surface flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-m3-on-surface font-headline font-bold text-xl">No lessons available yet</p>
          <p className="text-sm text-m3-on-surface-variant">
            This course does not have any lesson content ready for students yet.
          </p>
          <Link to="/courses/$slug" params={{ slug }}>
            <Button className="gradient-primary text-white rounded-xl gap-2">
              Back to Course <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-m3-surface pb-24">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-2 text-xs text-m3-on-surface-variant mb-5">
          <Link to="/courses" className="hover:text-m3-primary transition-colors">
            Courses
          </Link>
          <span>/</span>
          <Link to="/courses/$slug" params={{ slug }} className="hover:text-m3-primary transition-colors truncate max-w-[160px]">
            {course.title}
          </Link>
          <span>/</span>
          <span className="text-m3-on-surface font-medium truncate">Learn</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* ════════════════════════════════════════
              Main Content
          ════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {/* ── Main content area: video or reading ── */}
            {activeLesson?.lesson_type === "reading" ? (
              <GlassCard className="p-6 sm:p-10 min-h-[260px]">
                <div className="flex items-center gap-2 mb-5">
                  <BookOpen className="h-5 w-5 text-m3-secondary" />
                  <span className="text-xs font-bold uppercase tracking-widest text-m3-secondary font-label">
                    Reading
                  </span>
                </div>
                {activeLesson.notes_markdown ? (
                  <div className="prose prose-sm max-w-none text-m3-on-surface">
                    <ReactMarkdown>{activeLesson.notes_markdown}</ReactMarkdown>
                  </div>
                ) : activeLesson.summary ? (
                  <p className="text-m3-on-surface-variant text-base leading-relaxed">{activeLesson.summary}</p>
                ) : (
                  <p className="text-m3-on-surface-variant text-sm">Reading content is not available yet.</p>
                )}
              </GlassCard>
            ) : (
              <div className="rounded-2xl overflow-hidden bg-black shadow-2xl">
                {streamData ? (
                  <MediaPlayer
                    src={{ src: streamData.stream_url, type: "video/mp4" }}
                    className="w-full aspect-video"
                    load="play"
                  >
                    <MediaProvider />
                    <DefaultVideoLayout icons={defaultLayoutIcons} download={false} />
                  </MediaPlayer>
                ) : (
                  <div className="relative aspect-video">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-indigo-800 to-slate-900 opacity-80" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 bg-m3-primary/90 text-white rounded-full flex items-center justify-center shadow-2xl">
                        <Play className="h-9 w-9 fill-white" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Lesson Title & Meta ── */}
            {activeItem && (
              <div className="space-y-3">
                <h1 className="font-headline font-extrabold text-3xl sm:text-4xl text-m3-primary tracking-tight leading-none">
                  {activeEntry?.label}
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                  {activeLesson?.estimated_minutes && (
                    <>
                      <span className="text-m3-outline text-xs">•</span>
                      <span className="text-m3-on-surface-variant text-sm flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {formatMinutes(activeLesson.estimated_minutes)}
                      </span>
                    </>
                  )}
                  {activeModuleQuiz?.item.quiz_id && (
                    <Link
                      to="/courses/$slug/quiz/$quizId"
                      params={{ slug, quizId: activeModuleQuiz.item.quiz_id }}
                      className="ml-auto"
                    >
                      <Button
                        size="sm"
                        className="gradient-primary text-white font-bold rounded-xl gap-2 shadow-ai-glow hover:opacity-90"
                      >
                        <Sparkles className="h-4 w-4" />
                        Take Quiz
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* ── Instructor card ── */}
            {course.instructor && (
              <div className="glass ghost-border rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
                <Avatar className="h-20 w-20 shrink-0 ring-4 ring-white shadow-xl">
                  <AvatarFallback className="gradient-primary text-white text-xl font-bold font-headline">
                    {initials(course.instructor.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left">
                  <h3 className="text-lg font-headline font-bold text-m3-primary">
                    {course.instructor.display_name}
                  </h3>
                  <p className="text-m3-secondary font-semibold text-xs mt-0.5 mb-2">Instructor</p>
                  {course.instructor.bio && (
                    <p className="text-m3-on-surface-variant text-sm leading-relaxed">
                      {course.instructor.bio}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab bar + prev/next ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-m3-outline-variant/20">
              <div className="flex gap-1 flex-wrap">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200",
                      activeTab === tab
                        ? "bg-m3-secondary text-white shadow-ai-glow"
                        : "text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-surface-container"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl ghost-border text-xs font-bold"
                  onClick={goPrev}
                  disabled={!hasPrev}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                    {hasPrev ? (
                      <span className="max-w-[120px] truncate">{lessonItems[resolvedIdx - 1]?.label}</span>
                    ) : (
                      "Previous"
                    )}
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl gradient-primary text-white text-xs font-bold flex items-center gap-1.5"
                  onClick={goNext}
                  disabled={!hasNext}
                >
                    {hasNext ? (
                      <span className="max-w-[120px] truncate">Next: {lessonItems[resolvedIdx + 1]?.label}</span>
                    ) : (
                      "Finished"
                    )}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* ── Tab content ── */}
            <div className="pb-4">
              {activeTab === "Lesson Notes" && activeLesson && (
                <GlassCard className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4 text-m3-secondary" />
                    <h4 className="font-headline font-bold text-m3-on-surface text-sm">Lesson Notes</h4>
                  </div>
                  {activeLesson.notes_markdown ? (
                    <div className="prose prose-sm max-w-none text-m3-on-surface-variant">
                      <ReactMarkdown>{activeLesson.notes_markdown}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-m3-on-surface-variant text-sm leading-relaxed">
                      Notes for <strong>{activeLesson.title}</strong> are not available yet.
                      Notes are generated after the lesson material is processed.
                    </p>
                  )}
                </GlassCard>
              )}

              {activeTab === "Discussion" && (
                <GlassCard className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-5">
                    <HelpCircle className="h-4 w-4 text-m3-secondary" />
                    <h4 className="font-headline font-bold text-m3-on-surface text-sm">Discussion</h4>
                  </div>
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <p className="text-sm font-semibold text-m3-on-surface">Discussion coming soon</p>
                    <p className="text-xs text-m3-on-surface-variant">
                      Lesson-level discussion threads are under development.
                    </p>
                  </div>
                </GlassCard>
              )}

              {activeTab === "Resources" && (
                <GlassCard className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-5">
                    <Download className="h-4 w-4 text-m3-secondary" />
                    <h4 className="font-headline font-bold text-m3-on-surface text-sm">
                      Downloadable Resources
                    </h4>
                    {resources && (
                      <span className="ml-auto text-xs text-m3-on-surface-variant">
                        {resources.length} file{resources.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {!resources ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-12 rounded-xl bg-m3-surface-container animate-pulse" />
                      ))}
                    </div>
                  ) : resources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-m3-surface-container flex items-center justify-center">
                        <FileText className="h-5 w-5 text-m3-outline" />
                      </div>
                      <p className="text-sm font-semibold text-m3-on-surface">No resources for this lesson</p>
                    </div>
                  ) : (
                    resources.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 py-3 border-b border-m3-outline-variant/15 last:border-0"
                      >
                        <div className="w-9 h-9 rounded-xl bg-m3-secondary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-m3-secondary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-m3-on-surface truncate">{file.title}</p>
                          <p className="text-[10px] text-m3-outline uppercase">{file.resource_type}</p>
                        </div>
                        {file.storage_object_id ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl text-m3-secondary hover:bg-m3-secondary/10"
                            title="Download"
                            onClick={async () => {
                              const url = await fetchResourceDownloadUrl(file.id);
                              window.open(url, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl text-m3-secondary hover:bg-m3-secondary/10"
                            disabled
                            title="No file attached"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </GlassCard>
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════
              Curriculum Sidebar (right)
          ════════════════════════════════════════ */}
          <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 flex flex-col gap-4">
            {/* Progress Card */}
            <GlassCard className="p-5">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-secondary font-label">
                  Course Progress
                </span>
                <span className="text-2xl font-black font-headline text-m3-primary">
                  {Math.round(progress)}%
                </span>
              </div>
              <GradientProgress value={progress} variant="secondary" size="sm" />
              <p className="mt-2 text-xs text-m3-on-surface-variant">
                {completedLessonCount} of {totalLessonCount} lessons completed.
              </p>
            </GlassCard>

            {/* Curriculum List */}
            <GlassCard className="flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-m3-outline-variant/20 bg-m3-primary/5">
                <h3 className="font-headline font-bold text-m3-primary text-sm">Curriculum</h3>
              </div>
              <div className="overflow-y-auto max-h-[520px] p-3 space-y-4">
                {content.modules
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((mod) => (
                    <ModuleSection
                      key={mod.id}
                      slug={slug}
                      mod={mod}
                      flatItems={flatItems}
                      itemState={itemState}
                      onSelect={(idx) => setActiveIdx(idx)}
                    />
                  ))}
              </div>
            </GlassCard>
          </aside>
        </div>
      </div>

    </div>
  );
}

/* ── Sub-components ── */

function ModuleSection({
  slug,
  mod,
  flatItems,
  itemState,
  onSelect,
}: {
  slug: string;
  mod: CourseContentModule;
  flatItems: FlatItem[];
  itemState: (fi: FlatItem) => LessonState;
  onSelect: (idx: number) => void;
}) {
  const lessonItems = flatItems.filter((fi) => fi.item.item_type === "lesson");
  const modItems = flatItems
    .map((fi) => ({ fi, idx: lessonItems.findIndex((lesson) => lesson.item.id === fi.item.id) }))
    .filter(({ fi }) => fi.moduleId === mod.id);

  if (!modItems.length) return null;

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-m3-outline uppercase tracking-tight px-2 pb-1">
        {mod.title}
      </p>
      {modItems.map(({ fi, idx }) => {
        const state = itemState(fi);
        const isQuiz = fi.item.item_type === "quiz";
        const isInterview = fi.item.item_type === "interview";
        const lessonType = fi.item.lesson?.lesson_type;
        const LessonIcon = lessonType === "reading" ? BookOpen : PlayCircle;

        if (isQuiz && fi.item.quiz_id) {
          return (
            <Link
              key={fi.item.id}
              to="/courses/$slug/quiz/$quizId"
              params={{ slug, quizId: fi.item.quiz_id }}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 text-sm text-m3-on-surface-variant hover:bg-white/50 font-medium cursor-pointer"
            >
              <HelpCircle className="h-4 w-4 flex-shrink-0 opacity-60" />
              <span className="truncate leading-snug">{fi.label}</span>
              <Sparkles className="h-4 w-4 ml-auto text-m3-secondary" />
            </Link>
          );
        }

        return (
          <button
            key={fi.item.id}
            onClick={() => state !== "locked" && !isInterview && idx >= 0 && onSelect(idx)}
            disabled={state === "locked" || isInterview || idx < 0}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 text-sm",
              state === "active" && "bg-m3-primary text-white shadow-md font-bold",
              state === "completed" && "bg-m3-surface-container-lowest text-m3-primary shadow-sm font-medium hover:bg-m3-surface-container",
              state === "pending" && !isInterview && "text-m3-on-surface-variant hover:bg-white/50 font-medium",
              state === "locked" && "opacity-40 cursor-not-allowed text-m3-outline",
              isInterview && "opacity-60 cursor-default text-m3-on-surface-variant"
            )}
          >
            {state === "completed" && <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500 fill-emerald-100" />}
            {state === "active" && <LessonIcon className="h-4 w-4 flex-shrink-0" />}
            {state === "pending" && !isQuiz && !isInterview && <LessonIcon className="h-4 w-4 flex-shrink-0 opacity-40" />}
            {state === "pending" && isQuiz && <HelpCircle className="h-4 w-4 flex-shrink-0 opacity-60" />}
            {isInterview && <Mic className="h-4 w-4 flex-shrink-0" />}
            {state === "locked" && <Lock className="h-4 w-4 flex-shrink-0" />}

            <span className="truncate leading-snug">{fi.label}</span>
            {fi.item.lesson?.estimated_minutes && (
              <span className="ml-auto text-[10px] opacity-60 shrink-0">
                {formatMinutes(fi.item.lesson.estimated_minutes)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
