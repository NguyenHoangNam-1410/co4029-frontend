import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Plus, ChevronDown, ChevronRight, BookOpen, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useCourseBySlug,
  useCourseContent,
  useCreateModule,
  useCreateLesson,
  useUpdateModule,
  LESSON_TYPES,
  type CourseContentModule,
  type CourseContentLesson,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const LESSON_TYPE_BADGE: Record<string, string> = {
  lecture: "bg-blue-50 text-blue-700",
  lab: "bg-violet-50 text-violet-700",
  homework: "bg-amber-50 text-amber-700",
  reading: "bg-emerald-50 text-emerald-700",
  assignment: "bg-rose-50 text-rose-700",
  project: "bg-indigo-50 text-indigo-700",
};

function AddLessonForm({
  moduleId,
  courseId,
  nextPosition,
  onDone,
}: {
  moduleId: string;
  courseId: string;
  nextPosition: number;
  onDone: () => void;
}) {
  const createLesson = useCreateLesson(moduleId, courseId);
  const [form, setForm] = useState({ title: "", lesson_type: "lecture" });

  function slugify(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await createLesson.mutateAsync({
        title: form.title,
        slug: slugify(form.title) + "-" + nextPosition,
        lesson_type: form.lesson_type,
        status: "draft",
      });
      toast.success("Lesson created");
      onDone();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to create lesson");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-3 bg-m3-surface-container rounded-xl mt-2">
      <Input
        autoFocus
        required
        placeholder="Lesson title"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        className="h-8 text-xs flex-1"
      />
      <select
        value={form.lesson_type}
        onChange={(e) => setForm((f) => ({ ...f, lesson_type: e.target.value }))}
        className="h-8 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {LESSON_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <Button type="submit" size="sm" className="h-8 text-xs" disabled={createLesson.isPending}>
        {createLesson.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onDone}>
        Cancel
      </Button>
    </form>
  );
}

function ModuleAccordion({
  module,
  courseId,
  defaultOpen = false,
}: {
  module: CourseContentModule;
  courseId: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [addingLesson, setAddingLesson] = useState(false);

  const lessons = module.items
    .filter((i) => i.item_type === "lesson" && i.lesson)
    .map((i) => i.lesson!);
  const quizzes = module.items.filter((i) => i.item_type === "quiz");
  const interviews = module.items.filter((i) => i.item_type === "interview");

  return (
    <div className="rounded-2xl border border-m3-outline-variant bg-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-m3-surface-container/50 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-m3-on-surface-variant shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-m3-on-surface-variant shrink-0" />
        )}
        <span className="flex-1 font-headline font-semibold text-sm text-m3-on-surface">
          {module.title}
        </span>
        <div className="flex items-center gap-1.5 text-[11px] text-m3-on-surface-variant">
          {lessons.length > 0 && <span>{lessons.length} lesson{lessons.length !== 1 ? "s" : ""}</span>}
          {quizzes.length > 0 && <span>· {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""}</span>}
          {interviews.length > 0 && <span>· {interviews.length} interview{interviews.length !== 1 ? "s" : ""}</span>}
          <Badge className={cn("ml-1 text-[10px] border-0", module.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700")}>
            {module.status}
          </Badge>
        </div>
      </button>

      {open && (
        <div className="border-t border-m3-outline-variant">
          {/* Lessons */}
          <div className="p-4 space-y-1">
            {lessons.length === 0 && !addingLesson && (
              <p className="text-xs text-m3-on-surface-variant py-2">No lessons yet.</p>
            )}
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-m3-surface-container transition-colors group"
              >
                <BookOpen className="h-3.5 w-3.5 text-m3-on-surface-variant shrink-0" />
                <span className="flex-1 text-xs font-medium text-m3-on-surface truncate">
                  {lesson.title}
                </span>
                <Badge
                  className={cn(
                    "text-[10px] border-0 shrink-0",
                    LESSON_TYPE_BADGE[lesson.lesson_type ?? "lecture"] ?? "bg-slate-100 text-slate-500"
                  )}
                >
                  {lesson.lesson_type ?? "lecture"}
                </Badge>
                <Badge
                  className={cn(
                    "text-[10px] border-0 shrink-0",
                    lesson.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700"
                  )}
                >
                  {lesson.status}
                </Badge>
                <Link
                  to="/teacher/courses/$courseId/lessons/$lessonId"
                  params={{ courseId, lessonId: lesson.id }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Pencil className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ))}

            {addingLesson && (
              <AddLessonForm
                moduleId={module.id}
                courseId={courseId}
                nextPosition={module.items.length + 1}
                onDone={() => setAddingLesson(false)}
              />
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs gap-1.5 text-m3-on-surface-variant hover:text-m3-on-surface"
              onClick={() => setAddingLesson(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Lesson
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddModuleForm({
  courseId,
  nextPosition,
  onDone,
}: {
  courseId: string;
  nextPosition: number;
  onDone: () => void;
}) {
  const createModule = useCreateModule(courseId);
  const [title, setTitle] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createModule.mutateAsync({ title, position: nextPosition, status: "draft" });
      toast.success("Module created");
      onDone();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to create module");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 bg-m3-surface-container rounded-2xl">
      <Input
        autoFocus
        required
        placeholder="Module title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1 text-sm"
      />
      <Button type="submit" size="sm" disabled={createModule.isPending}>
        {createModule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onDone}>
        Cancel
      </Button>
    </form>
  );
}

export default function CourseManagePage() {
  const { courseId } = useParams({ from: "/teacher/courses/$courseId" as never }) as { courseId: string };
  const { data: content, isLoading } = useCourseContent(courseId);
  const [addingModule, setAddingModule] = useState(false);

  const modules = content?.modules ?? [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link to="/teacher/courses">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-headline font-bold text-m3-on-surface">Manage Course</h1>
          <p className="text-xs text-m3-on-surface-variant mt-0.5">
            {modules.length} module{modules.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-m3-surface-container animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((module, idx) => (
            <ModuleAccordion
              key={module.id}
              module={module}
              courseId={courseId}
              defaultOpen={idx === 0}
            />
          ))}

          {addingModule ? (
            <AddModuleForm
              courseId={courseId}
              nextPosition={modules.length + 1}
              onDone={() => setAddingModule(false)}
            />
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2 text-sm"
              onClick={() => setAddingModule(true)}
            >
              <Plus className="h-4 w-4" />
              Add Module
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
