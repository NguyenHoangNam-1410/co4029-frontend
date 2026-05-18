import { useState, useRef, useCallback } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, Upload, FileText, Video, FileCode,
  RefreshCw, CheckCircle, AlertCircle, Loader2, Sparkles,
  Eye, EyeOff, Trash2, Brain, CloudUpload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useTeacherLessonMaterials,
  useTeacherProcessingSummary,
  useTeacherMaterialStatus,
  useTeacherRequestUploadUrl,
  useCreateMaterial,
  useReprocessMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
} from "@/lib/api/hooks/materials";
import {
  useTeacherCourseById,
  useTeacherLesson,
} from "@/lib/api/hooks/teacher-courses";
import type { LearningMaterial } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";

/* ── Processing status display config ── */
const PROC_STATUS: Record<string, { label: string; color: string; spin?: boolean }> = {
  not_queued:  { label: "Not Queued",    color: "bg-amber-50 text-amber-600" },
  pending:     { label: "Pending",       color: "bg-slate-100 text-slate-500" },
  extracting:  { label: "Extracting",    color: "bg-blue-100 text-blue-700",      spin: true },
  chunking:    { label: "Chunking",      color: "bg-blue-100 text-blue-800",  spin: true },
  embedding:   { label: "Embedding",     color: "bg-blue-100 text-blue-800",  spin: true },
  building_kg: { label: "Building Graph", color: "bg-fuchsia-100 text-fuchsia-700", spin: true },
  ready:       { label: "Ready",         color: "bg-emerald-100 text-emerald-700" },
  failed:      { label: "Failed",        color: "bg-red-100 text-red-700" },
};

const MATERIAL_TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video,
  code:  FileCode,
};

const materialTypeFromFile = (file: File) => {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".pptx")) return "pptx";
  if (name.endsWith(".docx")) return "docx";
  if (/\.(py|js|ts|tsx|jsx|java|c|cpp|go|rs)$/.test(name)) return "code";
  if (/\.(txt|md|markdown)$/.test(name) || file.type.startsWith("text/")) return "text";
  return "pdf";
};

function materialIcon(type: string) {
  const Icon = MATERIAL_TYPE_ICON[type] ?? FileText;
  return Icon;
}

/* ════════════════════════════════════════
   UploadDropzone
   ════════════════════════════════════════ */
function UploadDropzone({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile, disabled]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all",
        dragging
          ? "border-m3-secondary bg-m3-secondary-fixed/20 scale-[1.01]"
          : "border-m3-outline-variant/40 hover:border-m3-secondary/50 hover:bg-m3-surface-container-low/60",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.mp4,.mov,.txt,.md,.pptx,.docx,.py,.js,.ts,.jsx,.tsx,.java,.c,.cpp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) { onFile(file); e.target.value = ""; }
        }}
      />

      {/* Icon cluster */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-xl bg-m3-primary-fixed flex items-center justify-center">
          <FileText className="h-6 w-6 text-m3-primary" />
        </div>
        <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow">
          <CloudUpload className="h-7 w-7 text-white" />
        </div>
        <div className="w-12 h-12 rounded-xl bg-m3-secondary-fixed flex items-center justify-center">
          <Video className="h-6 w-6 text-m3-secondary" />
        </div>
      </div>

      <p className="font-headline font-bold text-m3-on-surface text-base mb-1">
        {dragging ? "Drop to upload" : "Drag & drop or click to browse"}
      </p>
      <p className="text-sm text-m3-on-surface-variant">
        PDF, Video (MP4/MOV), DOCX, PPTX, Code, Markdown · up to 500 MB
      </p>
    </div>
  );
}

/* ════════════════════════════════════════
   Inline upload form (appears after file pick)
   ════════════════════════════════════════ */
function SelectedFileForm({
  file,
  courseId,
  moduleId,
  lessonId,
  onDone,
  onCancel,
}: {
  file: File;
  courseId: string;
  moduleId: string;
  lessonId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const requestUpload = useTeacherRequestUploadUrl();
  const createMaterial = useCreateMaterial(courseId, moduleId, lessonId);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: file.name.replace(/\.[^.]+$/, ""),
    material_type: materialTypeFromFile(file),
    ai_processing_enabled: true,
    visible_to_students: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setUploading(true);
    try {
      const { storage_object, upload_url } = await requestUpload.mutateAsync({
        original_filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });

      if (upload_url && !upload_url.startsWith("s3://")) {
        await fetch(upload_url, { method: "PUT", body: file });
      }

      await createMaterial.mutateAsync({
        title: form.title,
        material_type: form.material_type,
        storage_object_id: storage_object.id,
        ai_processing_enabled: form.ai_processing_enabled,
        visible_to_students: form.visible_to_students,
      });
      toast.success("Material uploaded — AI processing queued");
      onDone();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-6 bg-m3-surface-container-low rounded-xl border border-m3-outline-variant/20"
    >
      {/* File info pill */}
      <div className="flex items-center gap-3 p-3 bg-m3-surface-container rounded-xl">
        <div className="w-9 h-9 rounded-xl bg-m3-primary-fixed flex items-center justify-center shrink-0">
          {form.material_type === "video" ? (
            <Video className="h-4 w-4 text-m3-primary" />
          ) : form.material_type === "code" ? (
            <FileCode className="h-4 w-4 text-m3-primary" />
          ) : (
            <FileText className="h-4 w-4 text-m3-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-m3-on-surface truncate">{file.name}</p>
          <p className="text-xs text-m3-on-surface-variant">{sizeMB} MB</p>
        </div>
      </div>

      {/* Title input */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          Title *
        </label>
        <input
          required
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
      </div>

      {/* Type select */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          Material Type
        </label>
        <select
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          value={form.material_type}
          onChange={(e) => setForm((f) => ({ ...f, material_type: e.target.value }))}
        >
          <option value="pdf">PDF / Document</option>
          <option value="video">Video</option>
          <option value="text">Text / Markdown</option>
          <option value="pptx">Slides (PPTX)</option>
          <option value="docx">Word Document</option>
          <option value="code">Code</option>
        </select>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-xs text-m3-on-surface cursor-pointer">
          <input
            type="checkbox"
            checked={form.ai_processing_enabled}
            onChange={(e) => setForm((f) => ({ ...f, ai_processing_enabled: e.target.checked }))}
            className="rounded"
          />
          <Sparkles className="h-3.5 w-3.5 text-m3-secondary" />
          AI Processing
        </label>
        <label className="flex items-center gap-2 text-xs text-m3-on-surface cursor-pointer">
          <input
            type="checkbox"
            checked={form.visible_to_students}
            onChange={(e) => setForm((f) => ({ ...f, visible_to_students: e.target.checked }))}
            className="rounded"
          />
          <Eye className="h-3.5 w-3.5" />
          Visible to students
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={uploading} className="flex-1 gap-2 gradient-primary text-white border-0 shadow-ai-glow">
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
          ) : (
            <><Upload className="h-4 w-4" /> Upload & Process</>
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="px-4">
          Cancel
        </Button>
      </div>
    </form>
  );
}

/* ════════════════════════════════════════
   ProcessingStatusCard
   ════════════════════════════════════════ */
function ProcessingStatusCard({ material }: { material: LearningMaterial }) {
  const { data: status } = useTeacherMaterialStatus(material.id);
  const proc = PROC_STATUS[status?.processing_status ?? "pending"] ?? PROC_STATUS.pending;
  const Icon = materialIcon(material.material_type);

  const steps = ["extracting", "chunking", "embedding", "building_kg"];
  const currentStep = steps.indexOf(status?.processing_status ?? "");

  return (
    <div className="p-6 bg-m3-surface-container-low rounded-xl border border-m3-secondary/10 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-m3-secondary-fixed flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-m3-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-m3-on-surface truncate">{material.title}</p>
          <Badge className={cn("text-[10px] border-0 mt-0.5", proc.color)}>
            {proc.spin && <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin inline-block" />}
            {proc.label}
          </Badge>
        </div>
      </div>

      {/* Step progress track */}
      <div className="space-y-1.5">
        <div className="flex gap-1">
          {steps.map((step, i) => (
            <div
              key={step}
              className={cn(
                "flex-1 h-1.5 rounded-full transition-all",
                i < currentStep
                  ? "bg-m3-secondary"
                  : i === currentStep
                  ? "bg-m3-secondary ai-pulse"
                  : "bg-m3-outline-variant/30"
              )}
            />
          ))}
        </div>
        <p className="text-[11px] text-m3-on-surface-variant">
          {status?.processing_status === "building_kg"
            ? "Extracting concepts and building knowledge graph…"
            : status?.processing_status === "embedding"
            ? "Generating vector embeddings…"
            : status?.processing_status === "chunking"
            ? "Splitting content into semantic chunks…"
            : status?.processing_status === "extracting"
            ? "Extracting text from file…"
            : "Queued for processing…"}
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   MaterialCard
   ════════════════════════════════════════ */
function MaterialCard({
  material,
  lessonId,
  onDelete,
}: {
  material: LearningMaterial;
  lessonId: string;
  onDelete: (id: string) => void;
}) {
  const { data: status } = useTeacherMaterialStatus(material.id);
  const reprocess = useReprocessMaterial(lessonId);
  const updateMaterial = useUpdateMaterial(lessonId);

  /* A material is "not queued" when ai_processing_enabled is off and no job is running */
  const notQueued = !material.ai_processing_enabled && !status?.active_job_id;
  const procKey = notQueued ? "not_queued" : (status?.processing_status ?? "pending");
  const proc = PROC_STATUS[procKey] ?? PROC_STATUS.pending;
  const Icon = materialIcon(material.material_type);

  function handleEnableAI() {
    updateMaterial.mutate(
      { materialId: material.id, payload: { ai_processing_enabled: true } },
      {
        onSuccess: () =>
          reprocess.mutate(material.id, {
            onSuccess: () => toast.success("AI processing enabled and started"),
            onError: (err) => toast.error((err as Error).message),
          }),
        onError: (err) => toast.error((err as Error).message),
      }
    );
  }

  const enablingAI = updateMaterial.isPending || reprocess.isPending;

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-m3-outline-variant/20 group hover:border-m3-outline-variant/40 transition-colors">
      <div className="h-10 w-10 rounded-xl bg-m3-surface-container flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-m3-on-surface-variant" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-m3-on-surface truncate">{material.title}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Badge className={cn("text-[10px] border-0", proc.color)}>
            {proc.spin && <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin inline-block" />}
            {proc.label}
          </Badge>
          <span className="text-[11px] text-m3-on-surface-variant capitalize">{material.material_type}</span>
          {material.ai_processing_enabled && (
            <Badge className="text-[10px] border-0 bg-m3-secondary-fixed text-m3-on-secondary-fixed gap-1">
              <Sparkles className="h-2.5 w-2.5" /> AI
            </Badge>
          )}
          {material.visible_to_students ? (
            <Badge className="text-[10px] border-0 bg-emerald-50 text-emerald-700 gap-1">
              <Eye className="h-2.5 w-2.5" /> Visible
            </Badge>
          ) : (
            <Badge className="text-[10px] border-0 bg-slate-100 text-slate-500 gap-1">
              <EyeOff className="h-2.5 w-2.5" /> Hidden
            </Badge>
          )}
        </div>
        {status?.processing_error && (
          <p className="text-[11px] text-red-600 mt-1 truncate">{status.processing_error}</p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {notQueued && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-m3-secondary hover:text-m3-secondary hover:bg-m3-secondary-fixed/30"
            title="Enable AI Processing"
            disabled={enablingAI}
            onClick={handleEnableAI}
          >
            {enablingAI
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Sparkles className="h-3.5 w-3.5" />
            }
          </Button>
        )}
        {!notQueued && (status?.processing_status === "failed" || status?.processing_status === "ready") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Reprocess"
            onClick={() =>
              reprocess.mutate(material.id, {
                onSuccess: () => toast.success("Reprocessing started"),
                onError: (err) => toast.error((err as Error).message),
              })
            }
          >
            <RefreshCw className={cn("h-3.5 w-3.5", reprocess.isPending && "animate-spin")} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-m3-error hover:text-m3-error hover:bg-m3-error-container/30"
          title="Delete"
          onClick={() => onDelete(material.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   KnowledgeGraphPreview
   ════════════════════════════════════════ */
function KnowledgeGraphPreview({ readyCount }: { readyCount: number }) {
  const [toastVisible, setToastVisible] = useState(false);

  return (
    <div className="glass ghost-border shadow-glass rounded-xl p-8 text-center space-y-4">
      <div className="flex items-center justify-center gap-2">
        <Brain className="h-5 w-5 text-m3-secondary" />
        <h3 className="font-headline font-bold text-lg text-m3-on-surface">
          Knowledge Graph
        </h3>
      </div>

      <div className="flex justify-center">
        <svg
          width="260"
          height="170"
          viewBox="0 0 260 170"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className={cn(readyCount === 0 && "opacity-30")}
        >
          <line x1="130" y1="85" x2="55" y2="38"  stroke="#c5c5d4" strokeWidth="1" />
          <line x1="130" y1="85" x2="205" y2="38" stroke="#c5c5d4" strokeWidth="1" />
          <line x1="130" y1="85" x2="38"  y2="105" stroke="#c5c5d4" strokeWidth="1" />
          <line x1="130" y1="85" x2="222" y2="112" stroke="#c5c5d4" strokeWidth="1" />
          <line x1="130" y1="85" x2="95"  y2="148" stroke="#c5c5d4" strokeWidth="1" />
          <line x1="130" y1="85" x2="178" y2="148" stroke="#c5c5d4" strokeWidth="1" />
          <line x1="55"  y1="38"  x2="205" y2="38"  stroke="#c5c5d4" strokeWidth="1" />
          <line x1="38"  y1="105" x2="95"  y2="148" stroke="#c5c5d4" strokeWidth="1" />
          <line x1="222" y1="112" x2="178" y2="148" stroke="#c5c5d4" strokeWidth="1" />
          <circle cx="55"  cy="38"  r="17" fill="#dbeafe" stroke="#1e40af" strokeWidth="1.5" />
          <circle cx="205" cy="38"  r="17" fill="#dbeafe" stroke="#1e40af" strokeWidth="1.5" />
          <circle cx="38"  cy="105" r="15" fill="#dbeafe" stroke="#1e40af" strokeWidth="1.5" />
          <circle cx="222" cy="112" r="15" fill="#dbeafe" stroke="#1e40af" strokeWidth="1.5" />
          <circle cx="95"  cy="148" r="13" fill="#dbeafe" stroke="#1e40af" strokeWidth="1.5" />
          <circle cx="178" cy="148" r="13" fill="#dbeafe" stroke="#1e40af" strokeWidth="1.5" />
          <circle cx="240" cy="62"  r="11" fill="#dbeafe" stroke="#1e40af" strokeWidth="1.5" />
          <circle cx="130" cy="85"  r="26" fill="#1e40af" />
          <text x="130" y="89" textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="Epilogue, sans-serif">
            Core
          </text>
        </svg>
      </div>

      {readyCount > 0 ? (
        <p className="text-xs text-m3-on-surface-variant font-medium">
          {readyCount} material{readyCount !== 1 ? "s" : ""} indexed · concepts extracted
        </p>
      ) : (
        <p className="text-xs text-m3-on-surface-variant font-medium">
          Upload and process materials to build your knowledge graph
        </p>
      )}

      <button
        type="button"
        onClick={() => { setToastVisible(true); setTimeout(() => setToastVisible(false), 2500); }}
        className="border border-m3-outline-variant/20 rounded-xl px-5 py-2.5 text-sm font-bold text-m3-on-surface hover:bg-m3-surface-container-low transition-colors"
      >
        Open Full Graph
      </button>
      {toastVisible && (
        <p className="text-xs text-m3-secondary font-semibold animate-pulse">
          Knowledge Graph viewer coming soon
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   Main page
   ════════════════════════════════════════ */
export default function LessonMaterialsPage() {
  const params = useParams({ strict: false }) as { courseId: string; lessonId: string };
  const { courseId, lessonId } = params;

  const { data: course } = useTeacherCourseById(courseId);
  const { data: lesson, isLoading: lessonLoading } = useTeacherLesson(lessonId);
  const { data: materials = [], isLoading: materialsLoading } = useTeacherLessonMaterials(lessonId);
  const { data: summary } = useTeacherProcessingSummary(lessonId);
  const deleteMaterial = useDeleteMaterial(lessonId);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const moduleId = lesson?.module_id ?? "";

  const activeProcessing = materials.find((m) => {
    // we track status per material via individual hooks — here we use the summary flag
    return false; // resolved per-card via useMaterialStatus
  });
  const _ = activeProcessing; // suppress unused var

  const readyCount = summary?.completed_versions ?? 0;
  const processingCount = summary?.processing_versions ?? 0;

  function handleDelete(id: string) {
    deleteMaterial.mutate(id, {
      onSuccess: () => toast.success("Material deleted"),
      onError: (err) => toast.error((err as Error).message),
    });
  }

  /* ── Derive the "currently processing" material for the status card ── */
  const processingMaterial = processingCount > 0
    ? materials.find((m) => m.current_version_id !== null)
    : undefined;

  return (
    <div className="space-y-8 pb-16 max-w-[1400px]">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
        <Link to="/teacher/courses" className="hover:text-m3-primary transition-colors">
          My Courses
        </Link>
        <ArrowRight className="h-3 w-3" />
        <Link
          to="/teacher/courses/$courseId"
          params={{ courseId }}
          className="hover:text-m3-primary transition-colors truncate max-w-[160px]"
        >
          {course?.title ?? "…"}
        </Link>
        <ArrowRight className="h-3 w-3" />
        <span className="truncate max-w-[180px] text-m3-on-surface font-medium">
          {lesson?.title ?? "Lesson"}
        </span>
      </div>

      {/* ── Page header ── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link to="/teacher/courses/$courseId" params={{ courseId }}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-m3-primary leading-tight">
              Material Upload &amp; AI Hub
            </h1>
          </div>
          <p className="text-m3-on-surface-variant text-base leading-relaxed pl-11">
            {lessonLoading ? "Loading…" : lesson?.title} · Upload materials and let AI build your knowledge graph
          </p>
        </div>

        {/* Processing summary badges */}
        {summary && (processingCount > 0 || readyCount > 0) && (
          <div className="flex gap-2 flex-wrap shrink-0">
            {processingCount > 0 && (
              <Badge className="bg-blue-100 text-blue-700 border-0 gap-1.5 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                {processingCount} processing
              </Badge>
            )}
            {readyCount > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1.5 text-xs">
                <CheckCircle className="h-3 w-3" />
                {readyCount} ready
              </Badge>
            )}
            {(summary.failed_versions ?? 0) > 0 && (
              <Badge className="bg-red-100 text-red-700 border-0 gap-1.5 text-xs">
                <AlertCircle className="h-3 w-3" />
                {summary.failed_versions} failed
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* ── Bento grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 items-start">

        {/* ─────────────────────────────────
            Left column — upload & processing
        ───────────────────────────────── */}
        <div className="space-y-5">

          {selectedFile ? (
            <SelectedFileForm
              file={selectedFile}
              courseId={courseId}
              moduleId={moduleId}
              lessonId={lessonId}
              onDone={() => setSelectedFile(null)}
              onCancel={() => setSelectedFile(null)}
            />
          ) : (
            <UploadDropzone onFile={setSelectedFile} />
          )}

          {/* Processing status card */}
          {processingCount > 0 && processingMaterial ? (
            <ProcessingStatusCard material={processingMaterial} />
          ) : (
            <div className="bg-m3-surface-container-low rounded-xl p-7 text-center">
              <div className="w-12 h-12 rounded-xl bg-m3-surface-container flex items-center justify-center mx-auto mb-3">
                <Brain className="h-6 w-6 text-m3-on-surface-variant" />
              </div>
              <p className="font-headline font-bold text-m3-on-surface text-sm mb-1">
                No files currently processing
              </p>
              <p className="text-xs text-m3-on-surface-variant">
                Upload a file above to start AI processing
              </p>
            </div>
          )}

          {/* AI insight strip */}
          {readyCount > 0 && (
            <div className="flex items-center gap-3 p-4 bg-m3-secondary-fixed/30 rounded-xl border border-m3-secondary/10">
              <Sparkles className="h-5 w-5 text-m3-secondary shrink-0" />
              <p className="text-sm font-medium text-m3-on-surface">
                AI has indexed {readyCount} material{readyCount !== 1 ? "s" : ""} — knowledge graph is active for quiz generation
              </p>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────
            Right column — history & KG
        ───────────────────────────────── */}
        <div className="space-y-5">

          {/* Material history header */}
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-m3-on-surface text-lg">
              Material History
            </h2>
            {summary && (
              <span className="text-sm text-m3-on-surface-variant">
                {summary.materials_total} material{summary.materials_total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Material list */}
          {materialsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-m3-surface-container animate-pulse rounded-xl" />
              ))}
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-10 text-m3-on-surface-variant bg-m3-surface-container-low/50 rounded-xl">
              <FileText className="h-9 w-9 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No materials yet</p>
              <p className="text-xs mt-1 text-m3-on-surface-variant/70">
                Upload your first file using the dropzone on the left
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {materials.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  lessonId={lessonId}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Knowledge Graph Preview */}
          <KnowledgeGraphPreview readyCount={readyCount} />
        </div>

      </div>
    </div>
  );
}
