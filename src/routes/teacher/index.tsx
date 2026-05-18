import { Link } from "@tanstack/react-router";
import { BookOpen, Users, FileText, Sparkles, Plus, ArrowRight, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { useTeacherCourses } from "@/lib/api/hooks/teacher-courses";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-amber-50 text-amber-700",
  archived: "bg-slate-100 text-slate-500",
};

export default function TeacherDashboard() {
  const { data: courses = [], isLoading } = useTeacherCourses();

  const published = courses.filter((c) => c.status === "published").length;
  const draft = courses.filter((c) => c.status === "draft").length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold text-m3-on-surface">Teacher Dashboard</h1>
          <p className="text-sm text-m3-on-surface-variant mt-1">
            Manage your courses, materials, and AI generation.
          </p>
        </div>
        <Link to="/teacher/courses/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Course
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Courses" value={courses.length} icon={BookOpen} />
        <StatCard label="Published" value={published} icon={CheckCircle} />
        <StatCard label="Drafts" value={draft} icon={Clock} />
        <StatCard label="AI Enabled" value={courses.length} icon={Sparkles} />
      </div>

      {/* Course list */}
      <div>
        <SectionHeader
          title="Your Courses"
          subtitle="Click to manage modules, lessons, and materials"
          action={
            <Link to="/teacher/courses">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
        />

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-m3-surface-container animate-pulse rounded-xl" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="mt-8 text-center text-m3-on-surface-variant">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No courses yet</p>
            <p className="text-xs mt-1">Create your first course to get started.</p>
            <Link to="/teacher/courses/new">
              <Button size="sm" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Create Course
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {courses.slice(0, 6).map((course) => (
              <Link
                key={course.id}
                to="/teacher/courses/$courseId"
                params={{ courseId: course.id }}
                className="group block"
              >
                <div className="bg-card rounded-xl p-5 shadow-editorial ghost-border hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-headline font-semibold text-sm text-m3-on-surface truncate">
                        {course.title}
                      </h3>
                      {course.description && (
                        <p className="text-xs text-m3-on-surface-variant mt-1 line-clamp-2">
                          {course.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      className={cn(
                        "shrink-0 text-[10px] font-semibold border-0",
                        STATUS_COLORS[course.status] ?? "bg-slate-100 text-slate-500"
                      )}
                    >
                      {course.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-m3-on-surface-variant">
                    {course.level && (
                      <span className="px-1.5 py-0.5 bg-m3-surface-container rounded-md font-medium">
                        {course.level}
                      </span>
                    )}
                    {course.estimated_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.round(course.estimated_minutes / 60)}h
                      </span>
                    )}
                    <span className="ml-auto text-m3-primary font-medium group-hover:underline">
                      Manage →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
