import { useState, useRef } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft, Upload, FileText, Video, RefreshCw, CheckCircle, AlertCircle,
  Clock, Sparkles, Loader2, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useLessonMaterials,
  useProcessingSummary,
  useMaterialStatus,
  useRequestUploadUrl,
  useCreateMaterial,
  useReprocessMaterial,
  LESSON_TYPES,
  type LearningMaterial,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const PROCESSING_STATUS_CONFIG: Record<string, { label: string; color: string; spin?: boolean }> = {
  pending:    { label: "Pending",    color: "bg-slate-100 text-slate-500" },
  extracting: { label: "Extracting", color: "bg-blue-100 text-blue-700", spin: true },
  chunking:   { label: "Chunking",   color: "bg-violet-100 text-violet-700", spin: true },
  embedding:  { label: "Embedding",  color: "bg-indigo-100 text-indigo-700", spin: true },
  ready:      { label: "Ready",      color: "bg-emerald-100 text-emerald-700" },
  failed:     { label: "Failed",     color: "bg-red-100 text-red-700" },
};

function MaterialCard({ material, lessonId }: { material: LearningMaterial; lessonId: string }) {
  const { data: status } = useMaterialStatus(material.id);
  const reprocess = useReprocessMaterial(lessonId);

  const proc = PROCESSING_STATUS_CONFIG[status?.processing_status ?? "pending"] ?? PROCESSING_STATUS_CONFIG.pending;

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-m3-outline-variant">
      <div className="h-10 w-10 rounded-xl bg-m3-surface-container flex items-center justify-center shrink-0">
        {material.material_type === "video" ? (
          <Video className="h-5 w-5 text-m3-on-surface-variant" />
        ) : (
          <FileText className="h-5 w-5 text-m3-on-surface-variant" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-m3-on-surface truncate">{material.title}</p>
        <div className="flex items-center gap-2 mt-1">
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
      {(status?.processing_status === "failed" || status?.processing_status === "ready") && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          title="Reprocess"
          onClick={() => {
            reprocess.mutate(material.id, {
              onSuccess: () => toast.success("Reprocessing started"),
              onError: (err) => toast.error((err as Error).message),
            });
          }}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", reprocess.isPending && "animate-spin")} />
        </Button>
      )}
    </div>
  );
}

function UploadForm({
  courseId,
  moduleId,
  lessonId,
  onDone,
}: {
  courseId: string;
  moduleId: string;
  lessonId: string;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const requestUpload = useRequestUploadUrl();
  const createMaterial = useCreateMaterial(courseId, moduleId, lessonId);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    material_type: "pdf",
    ai_processing_enabled: true,
    visible_to_students: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !form.title.trim()) return;

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

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-5 bg-m3-surface-container rounded-2xl border border-m3-outline-variant"
    >
      <h3 className="text-sm font-semibold text-m3-on-surface">Upload Material</h3>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-m3-on-surface">Title *</label>
        <input
          required
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g. Week 1 Lecture Slides"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-m3-on-surface">Type</label>
          <select
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.material_type}
            onChange={(e) => setForm((f) => ({ ...f, material_type: e.target.value }))}
          >
            <option value="pdf">PDF</option>
            <option value="video">Video</option>
            <option value="text">Text / Markdown</option>
            <option value="slides">Slides</option>
            <option value="code">Code</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-m3-on-surface">File *</label>
          <input
            ref={fileRef}
            required
            type="file"
            accept=".pdf,.mp4,.mov,.txt,.md,.pptx,.docx"
            className="w-full text-xs rounded-xl border border-input bg-background px-3 py-2 focus:outline-none cursor-pointer file:mr-2 file:text-xs file:border-0 file:bg-m3-primary file:text-white file:rounded-lg file:px-2 file:py-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-xs text-m3-on-surface cursor-pointer">
          <input
            type="checkbox"
            checked={form.ai_processing_enabled}
            onChange={(e) => setForm((f) => ({ ...f, ai_processing_enabled: e.target.checked }))}
            className="rounded"
          />
          <Sparkles className="h-3.5 w-3.5 text-m3-primary" />
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

      <div className="flex gap-2">
        <Button type="submit" disabled={uploading} className="gap-2">
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
          ) : (
            <><Upload className="h-4 w-4" /> Upload</>
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function LessonManagePage() {
  const params = useParams({ from: "/teacher/courses/$courseId/lessons/$lessonId" as never }) as {
    courseId: string;
    lessonId: string;
  };
  const { courseId, lessonId } = params;

  const { data: materials = [], isLoading } = useLessonMaterials(lessonId);
  const { data: summary } = useProcessingSummary(lessonId);
  const [showUpload, setShowUpload] = useState(false);

  // We need moduleId for the material creation — derive from course content or pass as search param
  // For now, we'll need the moduleId. This page should receive it via the parent route.
  // Hardcode to empty string until we fetch it from the lesson.
  const moduleId = ""; // TODO: fetch from lesson query

  const readyCount = summary?.completed_versions ?? 0;
  const processingCount = summary?.processing_versions ?? 0;
  const failedCount = summary?.failed_versions ?? 0;

  return (
    <div className="space-y-6 pb-12 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/teacher/courses/$courseId" params={{ courseId }}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-headline font-bold text-m3-on-surface">Lesson Materials</h1>
          {summary && (
            <p className="text-xs text-m3-on-surface-variant mt-0.5">
              {summary.materials_total} material{summary.materials_total !== 1 ? "s" : ""} ·{" "}
              {readyCount} ready
              {processingCount > 0 && ` · ${processingCount} processing`}
              {failedCount > 0 && ` · ${failedCount} failed`}
            </p>
          )}
        </div>
        {!showUpload && (
          <Button size="sm" className="gap-2" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        )}
      </div>

      {/* Processing summary badges */}
      {summary && (processingCount > 0 || failedCount > 0) && (
        <div className="flex gap-2 flex-wrap">
          {processingCount > 0 && (
            <Badge className="bg-blue-100 text-blue-700 border-0 gap-1.5 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              {processingCount} processing
            </Badge>
          )}
          {failedCount > 0 && (
            <Badge className="bg-red-100 text-red-700 border-0 gap-1.5 text-xs">
              <AlertCircle className="h-3 w-3" />
              {failedCount} failed
            </Badge>
          )}
          {readyCount > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1.5 text-xs">
              <CheckCircle className="h-3 w-3" />
              {readyCount} ready
            </Badge>
          )}
        </div>
      )}

      {showUpload && (
        <UploadForm
          courseId={courseId}
          moduleId={moduleId}
          lessonId={lessonId}
          onDone={() => setShowUpload(false)}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-m3-surface-container animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-12 text-m3-on-surface-variant">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No materials yet</p>
          <p className="text-xs mt-1">Upload PDFs, videos, or other files for AI processing.</p>
          <Button size="sm" className="mt-4 gap-2" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4" />
            Upload first material
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((material) => (
            <MaterialCard key={material.id} material={material} lessonId={lessonId} />
          ))}
        </div>
      )}
    </div>
  );
}
