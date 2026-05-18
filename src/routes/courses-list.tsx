import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Search, SlidersHorizontal, Sparkles, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { InfiniteList } from "@/components/ui/InfiniteList";
import { useCourses } from "@/lib/api/hooks/courses";
import type { Course } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const CARD_GRADIENTS = [
  "from-blue-500 via-blue-700 to-blue-800",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-pink-500 via-rose-500 to-orange-500",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-amber-500 via-orange-500 to-red-500",
  "from-blue-500 via-blue-600 to-sky-500",
];

function CourseCard({ course, index }: { course: Course; index: number }) {
  const gradientClass = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <Link to="/courses/$slug" params={{ slug: course.slug }} className="group block">
      <div className="bg-card rounded-xl overflow-hidden shadow-editorial ghost-border transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-glass h-full flex flex-col">
        <div className="relative aspect-video overflow-hidden shrink-0">
          <div className={cn("absolute inset-0 bg-gradient-to-br", gradientClass)} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <Badge className="absolute top-3 left-3 z-10 bg-black/40 text-white border border-white/20 backdrop-blur-sm text-[10px] font-semibold tracking-wide">
            <Sparkles className="h-2.5 w-2.5 mr-1" />
            AI Enhanced
          </Badge>
          <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity">
            <GraduationCap className="h-16 w-16 text-white" />
          </div>
        </div>

        <div className="p-4 space-y-3 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="font-headline font-semibold text-sm text-m3-on-surface line-clamp-2 leading-snug">
              {course.title}
            </h3>
            {course.description && (
              <p className="text-xs text-m3-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
                {course.description}
              </p>
            )}
          </div>

          {course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {course.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 rounded-full bg-m3-secondary/10 text-m3-secondary text-[10px] font-semibold"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl ghost-border overflow-hidden">
      <div className="aspect-video bg-m3-surface-container animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-m3-surface-container animate-pulse rounded-lg w-3/4" />
        <div className="h-3 bg-m3-surface-container animate-pulse rounded-lg w-1/2" />
      </div>
    </div>
  );
}

export default function CoursesListPage() {
  const {
    items,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useCourses(20);

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    );
  }, [items, query]);

  function clearFilters() {
    setQuery("");
  }

  return (
    <div className="relative min-h-screen bg-m3-surface pb-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

        <header className="pt-2">
          <div className="flex items-center gap-3 mb-2">
            <AIInsightChip pulse>AI POWERED</AIInsightChip>
          </div>
          <h1 className="font-headline font-black text-4xl sm:text-5xl text-m3-on-surface leading-none tracking-tight">
            Mastery Awaits.
          </h1>
          <p className="mt-3 text-m3-on-surface-variant text-base sm:text-lg max-w-xl">
            Explore AI-curated courses designed to accelerate your journey from learner to leader.
          </p>
        </header>

        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-m3-surface/90 backdrop-blur-lg border-b border-m3-outline-variant/20">
          <div className="flex flex-col sm:flex-row gap-3 max-w-4xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-outline pointer-events-none" />
              <Input
                placeholder="Search courses…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 bg-m3-surface-container-lowest ghost-border rounded-xl h-10 text-sm placeholder:text-m3-outline focus-visible:ring-m3-secondary/40"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              className="shrink-0 h-10 w-10 rounded-xl ghost-border bg-m3-surface-container-lowest relative"
              onClick={clearFilters}
              title="Clear filters"
            >
              <SlidersHorizontal className="h-4 w-4 text-m3-on-surface-variant" />
            </Button>
          </div>

          {!isLoading && (
            <p className="text-xs text-m3-on-surface-variant mt-2">
              {filtered.length === items.length
                ? `${items.length} course${items.length !== 1 ? "s" : ""} loaded`
                : `${filtered.length} of ${items.length} courses`}
              {query && (
                <button
                  onClick={clearFilters}
                  className="ml-2 text-m3-secondary underline underline-offset-2 hover:no-underline"
                >
                  Clear all
                </button>
              )}
            </p>
          )}
        </div>

        <section className="space-y-5 pb-4">
          <SectionHeader
            title="All Courses"
            subtitle="Explore the full catalog and start learning at your own pace"
          />

          {isError && (
            <div className="rounded-xl bg-m3-error-container border border-m3-error/20 p-6 text-center">
              <p className="text-m3-on-error-container text-sm font-semibold">Failed to load courses</p>
              <p className="text-m3-on-error-container/70 text-xs mt-1">{String(error)}</p>
            </div>
          )}

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!isLoading && !isError && (
            <InfiniteList<Course>
              items={filtered}
              hasNextPage={query ? false : hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={isFetchingNextPage}
              keyOf={(c) => c.id}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
              empty={
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-m3-surface-container flex items-center justify-center">
                    <Search className="h-7 w-7 text-m3-outline" />
                  </div>
                  <p className="font-headline font-semibold text-m3-on-surface text-lg">
                    {items.length === 0 ? "No courses yet" : "No courses found"}
                  </p>
                  <p className="text-sm text-m3-on-surface-variant max-w-xs">
                    {items.length === 0
                      ? "Courses will appear here once they are published."
                      : "Try adjusting your search to discover more courses."}
                  </p>
                  {query && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 rounded-xl ghost-border"
                      onClick={clearFilters}
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              }
              renderItem={(course, i) => <CourseCard course={course} index={i} />}
            />
          )}
        </section>
      </div>
    </div>
  );
}
