import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, BookOpen, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { useTeacherCourses, type Course } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-amber-50 text-amber-700",
  archived: "bg-slate-100 text-slate-500",
};

function CourseRow({ course }: { course: Course }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-2xl shadow-editorial ghost-border hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex-1 min-w-0">
        <Link
          to="/teacher/courses/$courseId"
          params={{ courseId: course.id }}
          className="font-headline font-semibold text-sm text-m3-on-surface hover:text-m3-primary transition-colors"
        >
          {course.title}
        </Link>
        {course.description && (
          <p className="text-xs text-m3-on-surface-variant mt-0.5 line-clamp-1">{course.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-m3-on-surface-variant">
          {course.level && (
            <span className="px-1.5 py-0.5 bg-m3-surface-container rounded-md">{course.level}</span>
          )}
          {course.estimated_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.round(course.estimated_minutes / 60)}h
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Badge
          className={cn(
            "text-[10px] font-semibold border-0",
            STATUS_COLORS[course.status] ?? "bg-slate-100 text-slate-500"
          )}
        >
          {course.status}
        </Badge>
        <Link to="/teacher/courses/$courseId" params={{ courseId: course.id }}>
          <Button variant="outline" size="sm" className="text-xs">
            Manage
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function TeacherCoursesPage() {
  const { data: courses = [], isLoading } = useTeacherCourses();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = courses.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold text-m3-on-surface">My Courses</h1>
          <p className="text-sm text-m3-on-surface-variant mt-1">
            {courses.length} course{courses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link to="/teacher/courses/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Course
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {["all", "published", "draft", "archived"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className="text-xs capitalize"
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-m3-surface-container animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-m3-on-surface-variant">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">{search ? "No courses match your search" : "No courses yet"}</p>
          {!search && (
            <Link to="/teacher/courses/new">
              <Button size="sm" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Create Course
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((course) => (
            <CourseRow key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
