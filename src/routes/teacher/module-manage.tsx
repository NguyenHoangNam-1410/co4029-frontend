import { useState, useRef } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, Video, HelpCircle, BookOpen, Code,
  GripVertical, Pencil, Check, Loader2, Plus, Save,
  ChevronDown, ChevronRight, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
  useUpdateModule,
  useCreateLesson,
  useReorderModuleItems,
  useDeleteModuleItem,
  type CourseContentModule,
  type CourseContentItem,
  type CourseContentLesson,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const LESSON_TYPE_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}> = {
  video:    { label: "Video",    icon: Video,      badge: "bg-blue-50 text-blue-700" },
  quiz:     { label: "Quiz",     icon: HelpCircle, badge: "bg-violet-50 text-violet-700" },
  reading:  { label: "Reading",  icon: BookOpen,   badge: "bg-emerald-50 text-emerald-700" },
  exercise: { label: "Exercise", icon: Code,       badge: "bg-amber-50 text-amber-700" },
};

const ADD_PILL_CLS =
  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-m3-on-surface-variant " +
  "bg-m3-surface-container-lowest border border-m3-outline-variant/20 " +
  "hover:bg-m3-primary-fixed hover:text-m3-primary hover:border-m3-primary/20 transition-colors cursor-pointer";

/* ── Single item row with drag-and-drop ── */
function ItemRow({
  item, courseId, isDragOver, isDragging,
  onDragStart, onDragOver, onDrop, onDragEnd, onDelete,
}: {
  item: CourseContentItem;
  courseId: string;
  isDragOver: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onDelete: () => void;
}) {
  const lesson: CourseContentLesson | null = item.lesson;
  const cfg = lesson ? LESSON_TYPE_CONFIG[lesson.lesson_type ?? "video"] : null;
  const Icon = cfg?.icon ?? BookOpen;
  const label = item.item_type === "quiz" ? "Quiz" : item.item_type === "interview" ? "Interview" : (cfg?.label ?? item.item_type);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-center gap-2.5 px-3 py-3 rounded-xl transition-all group select-none cursor-grab active:cursor-grabbing",
        isDragging ? "opacity-40" : "",
        isDragOver
          ? "bg-m3-primary-fixed border border-m3-primary/30 shadow-sm"
          : "hover:bg-m3-surface-container"
      )}
    >
      <GripVertical className="h-4 w-4 text-m3-outline-variant shrink-0" />
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", cfg?.badge ?? "bg-slate-50 text-slate-500")}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="flex-1 text-sm font-medium text-m3-on-surface truncate">
        {lesson?.title ?? label}
      </span>
      <Badge className={cn("text-[10px] border-0 shrink-0", cfg?.badge ?? "bg-slate-100 text-slate-500")}>
        {label}
      </Badge>
      {lesson && (
        <Badge className={cn("text-[10px] border-0 shrink-0", lesson.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700")}>
          {lesson.status}
        </Badge>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {lesson && (
          <Link
            to="/teacher/courses/$courseId/lessons/$lessonId"
            params={{ courseId, lessonId: lesson.id }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
        <Button
          variant="ghost" size="icon" className="h-7 w-7 text-m3-error hover:bg-m3-error/10"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ── Add lesson type pills ── */
function AddLessonPills({ moduleId, courseId, itemCount }: {
  moduleId: string; courseId: string; itemCount: number;
}) {
  const createLesson = useCreateLesson(moduleId, courseId);
  const [adding, setAdding] = useState(false);

  function slugify(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleAdd(lessonType: string) {
    if (adding) return;
    const label = LESSON_TYPE_CONFIG[lessonType]?.label ?? lessonType;
    const title = `New ${label}`;
    setAdding(true);
    try {
      await createLesson.mutateAsync({
        title,
        slug: `${slugify(title)}-${Date.now().toString(36)}`,
        lesson_type: lessonType,
        status: "draft",
      });
      toast.success(`${label} added`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to add lesson");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mt-1 pt-4 border-t border-m3-outline-variant/10">
      <span className="w-full text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant mb-1">Add Content</span>
      {Object.entries(LESSON_TYPE_CONFIG).map(([type, cfg]) => {
        const Icon = cfg.icon;
        return (
          <button
            key={type} type="button" disabled={adding}
            onClick={() => handleAdd(type)}
            className={ADD_PILL_CLS}
          >
            <Icon className="h-3.5 w-3.5" />
            <Plus className="h-3 w-3 -ml-0.5" />
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Module settings sidebar ── */
function ModuleSettings({ module, courseId }: { module: CourseContentModule; courseId: string }) {
  const updateModule = useUpdateModule(module.id, courseId);
  const [description, setDescription] = useState(module.description ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(module.estimated_minutes?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateModule.mutateAsync({
        description: description.trim() || undefined,
        estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
      });
      toast.success("Module settings saved");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const publishedCount = module.items.filter((i) => {
    if (i.item_type === "lesson") return i.lesson?.status === "published";
    return false;
  }).length;
  const draftCount = module.items.length - publishedCount;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="bg-m3-surface-container-low rounded-2xl p-5 space-y-4">
        <h3 className="font-headline font-bold text-base text-m3-primary">Module Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Items", value: module.items.length },
            { label: "Published", value: publishedCount },
            { label: "Draft", value: draftCount },
            { label: "Est. Minutes", value: module.estimated_minutes ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-m3-surface rounded-xl p-3 text-center">
              <p className="text-lg font-headline font-bold text-m3-primary">{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Settings form */}
      <form onSubmit={handleSave} className="bg-m3-surface-container-low rounded-2xl p-5 space-y-4">
        <h3 className="font-headline font-bold text-base text-m3-primary">Settings</h3>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description of this module…"
            className="w-full px-4 py-3 text-sm bg-m3-surface border border-m3-outline-variant/20 rounded-xl text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/20 transition-all placeholder:text-m3-on-surface-variant/40"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Estimated Duration (min)</label>
          <Input
            type="number" min={0}
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
            placeholder="e.g. 60"
            className="text-sm bg-m3-surface"
          />
        </div>

        <Button type="submit" size="sm" disabled={saving} className="w-full gap-2 gradient-primary text-white border-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
      </form>
    </div>
  );
}

/* ════════════════════════════════════════
   Main page
   ════════════════════════════════════════ */
export default function ModuleManagePage() {
  const { courseId, moduleId } = useParams({ strict: false }) as { courseId: string; moduleId: string };

  const { data: course } = useTeacherCourseById(courseId);
  const { data: content, isLoading } = useTeacherCourseContent(courseId);

  const module: CourseContentModule | undefined = content?.modules.find((m) => m.id === moduleId);

  const updateModule = useUpdateModule(moduleId, courseId);
  const reorderItems = useReorderModuleItems(moduleId, courseId);
  const deleteItem = useDeleteModuleItem(courseId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-24 text-m3-on-surface-variant">
        Module not found.{" "}
        <Link to="/teacher/courses/$courseId" params={{ courseId }} className="text-m3-primary hover:underline">
          Back to course
        </Link>
      </div>
    );
  }

  const currentTitle = titleDraft || module.title;
  const sortedItems = [...module.items].sort((a, b) => a.position - b.position);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setTitleDraft(module!.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }

  function saveTitle() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== module!.title) {
      updateModule.mutate({ title: trimmed }, {
        onError: (err) => toast.error((err as Error).message),
      });
    }
  }

  function toggleStatus() {
    const next = module!.status === "published" ? "draft" : "published";
    updateModule.mutate({ status: next }, {
      onSuccess: () => toast.success(`Module ${next}`),
      onError: (err) => toast.error((err as Error).message),
    });
  }

  function handleDrop(dropIdx: number) {
    if (dragSourceIdx === null || dragSourceIdx === dropIdx) {
      setDragSourceIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newOrder = [...sortedItems];
    const [moved] = newOrder.splice(dragSourceIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    reorderItems.mutate(newOrder.map((i) => i.id), {
      onError: (err) => toast.error((err as Error).message || "Reorder failed"),
    });
    setDragSourceIdx(null);
    setDragOverIdx(null);
  }

  function handleDeleteItem(itemId: string) {
    deleteItem.mutate(itemId, {
      onSuccess: () => toast.success("Item removed"),
      onError: (err) => toast.error((err as Error).message),
    });
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
        <Link to="/teacher/courses" className="hover:text-m3-primary transition-colors">My Courses</Link>
        <ArrowRight className="h-3 w-3" />
        <Link to="/teacher/courses/$courseId" params={{ courseId }} className="hover:text-m3-primary transition-colors truncate max-w-[160px]">
          {course?.title ?? "…"}
        </Link>
        <ArrowRight className="h-3 w-3" />
        <span className="text-m3-on-surface font-medium truncate max-w-[180px]">{module.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to="/teacher/courses/$courseId" params={{ courseId }}>
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-1 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(module.title); }
              }}
              className="w-full font-headline font-bold text-2xl text-m3-primary bg-transparent border-b-2 border-m3-primary outline-none py-0.5"
            />
          ) : (
            <div className="flex items-center gap-2 group">
              <h1
                className="font-headline font-bold text-2xl text-m3-on-surface cursor-text"
                onClick={startEdit}
              >
                {updateModule.isPending && updateModule.variables && "title" in updateModule.variables
                  ? (updateModule.variables as { title?: string }).title ?? module.title
                  : module.title}
              </h1>
              <button
                type="button"
                onClick={startEdit}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary cursor-pointer"
              >
                {editingTitle ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            <button
              type="button"
              onClick={toggleStatus}
              disabled={updateModule.isPending}
              className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-full border-0 transition-colors cursor-pointer",
                module.status === "published"
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              )}
            >
              {updateModule.isPending ? "…" : module.status}
            </button>
            <span className="text-xs text-m3-on-surface-variant">
              {sortedItems.length} item{sortedItems.length !== 1 ? "s" : ""}
              {module.estimated_minutes && ` · ~${module.estimated_minutes}m`}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Items list — 8 cols */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-m3-surface-container-low rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-m3-outline-variant/10 flex items-center gap-2">
              <h2 className="font-headline font-bold text-sm text-m3-on-surface flex-1">Curriculum Items</h2>
              <span className="text-xs text-m3-on-surface-variant">Drag to reorder</span>
            </div>

            <div className="p-4 space-y-1.5">
              {sortedItems.length === 0 && (
                <p className="text-sm text-m3-on-surface-variant text-center py-6">No items yet. Add one below.</p>
              )}
              {sortedItems.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  courseId={courseId}
                  isDragOver={dragOverIdx === idx}
                  isDragging={dragSourceIdx === idx}
                  onDragStart={(e) => {
                    setDragSourceIdx(idx);
                    const el = e.currentTarget as HTMLElement;
                    const rect = el.getBoundingClientRect();
                    e.dataTransfer.setDragImage(el, e.clientX - rect.left, e.clientY - rect.top);
                  }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => { setDragSourceIdx(null); setDragOverIdx(null); }}
                  onDelete={() => handleDeleteItem(item.id)}
                />
              ))}

              <AddLessonPills
                moduleId={moduleId}
                courseId={courseId}
                itemCount={sortedItems.length}
              />
            </div>
          </div>
        </div>

        {/* Sidebar — 4 cols */}
        <aside className="col-span-12 lg:col-span-4 lg:sticky lg:top-24 self-start">
          <ModuleSettings module={module} courseId={courseId} />
        </aside>
      </div>
    </div>
  );
}
