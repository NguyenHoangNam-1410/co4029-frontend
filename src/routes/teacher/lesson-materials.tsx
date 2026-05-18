import { useState, useRef, useCallback } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, Upload, FileText, Video, FileCode,
  RefreshCw, CheckCircle, AlertCircle, Loader2, Sparkles,
  Eye, EyeOff, Trash2, Brain, CloudUpload, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useTeacherLessonMaterials,
  useTeacherProcessingSummary,
  useTeacherMaterialStatus,
  useInitMaterialUpload,
  useCompleteMaterialUpload,
  useFetchMultipartParts,
  useCompleteMultipartUpload,
  useAbortMultipartUpload,
  useReprocessMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
} from "@/lib/api/hooks/materials";
import {
  useTeacherCourseById,
  useTeacherLesson,
} from "@/lib/api/hooks/teacher-courses";
import type { LearningMaterial } from "@/lib/api/types/teacher";
import type {
  MaterialUploadInit,
  MaterialUploadInitOut,
} from "@/lib/api/types";
import { uploadMultipart } from "@/lib/upload/multipart";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const PROC_STATUS: Record<string, { label: string; color: string; spin?: boolean }> = {
  not_queued:  { label: "Chưa xếp hàng",     color: "bg-amber-50 text-amber-600" },
  pending:     { label: "Đang chờ",          color: "bg-slate-100 text-slate-500" },
  extracting:  { label: "Trích xuất",        color: "bg-blue-100 text-blue-700",     spin: true },
  chunking:    { label: "Phân đoạn",         color: "bg-blue-100 text-blue-800",     spin: true },
  embedding:   { label: "Nhúng vector",      color: "bg-blue-100 text-blue-800",     spin: true },
  building_kg: { label: "Xây dựng KG",       color: "bg-fuchsia-100 text-fuchsia-700", spin: true },
  ready:       { label: "Sẵn sàng",          color: "bg-emerald-100 text-emerald-700" },
  failed:      { label: "Thất bại",          color: "bg-red-100 text-red-700" },
};

const MATERIAL_TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video,
  code:  FileCode,
};

const MATERIAL_TYPE_OPTIONS: ReadonlyArray<{
  value: MaterialUploadInit["material_type"];
  label: string;
}> = [
  { value: "pdf",   label: "PDF / Tài liệu" },
  { value: "video", label: "Video" },
  { value: "text",  label: "Văn bản / Markdown" },
  { value: "pptx",  label: "Slide (PPTX)" },
  { value: "docx",  label: "Word (DOCX)" },
  { value: "code",  label: "Mã nguồn" },
  { value: "audio", label: "Âm thanh" },
  { value: "image", label: "Hình ảnh" },
  { value: "xlsx",  label: "Excel (XLSX)" },
];

function detectMaterialType(file: File): MaterialUploadInit["material_type"] {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".pptx")) return "pptx";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".xlsx")) return "xlsx";
  if (/\.(py|js|ts|tsx|jsx|java|c|cpp|go|rs)$/.test(name)) return "code";
  if (/\.(txt|md|markdown)$/.test(name) || file.type.startsWith("text/")) return "text";
  return "pdf";
}

function materialIcon(type: string) {
  return MATERIAL_TYPE_ICON[type] ?? FileText;
}

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isLikelyCorsError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error && /Failed to fetch|NetworkError|CORS/i.test(err.message)) {
    return true;
  }
  return false;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

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
        accept=".pdf,.mp4,.mov,.txt,.md,.pptx,.docx,.xlsx,.py,.js,.ts,.jsx,.tsx,.java,.c,.cpp,.png,.jpg,.jpeg,.mp3,.wav"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) { onFile(file); e.target.value = ""; }
        }}
      />
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
        {dragging ? "Thả tệp để tải lên" : "Kéo & thả hoặc nhấn để chọn tệp"}
      </p>
      <p className="text-sm text-m3-on-surface-variant">
        PDF, Video, DOCX, PPTX, Code, Markdown · tới 5 GB (multipart tự động khi &gt;100 MB)
      </p>
    </div>
  );
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-m3-on-surface-variant">
        <span>{label}</span>
        <span className="tabular-nums font-semibold text-m3-on-surface">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-m3-outline-variant/30 overflow-hidden">
        <div
          className="h-full bg-m3-secondary transition-all duration-200"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

function SelectedFileForm({
  file,
  lessonId,
  onDone,
  onCancel,
}: {
  file: File;
  lessonId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const initUpload = useInitMaterialUpload(lessonId);
  const completeUpload = useCompleteMaterialUpload();
  const fetchParts = useFetchMultipartParts();
  const completeMultipart = useCompleteMultipartUpload();
  const abortMultipart = useAbortMultipartUpload();

  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "init" | "hashing" | "uploading" | "completing">("idle");
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const [form, setForm] = useState<{
    title: string;
    material_type: MaterialUploadInit["material_type"];
    ai_processing_enabled: boolean;
    visible_to_students: boolean;
  }>({
    title: file.name.replace(/\.[^.]+$/, ""),
    material_type: detectMaterialType(file),
    ai_processing_enabled: true,
    visible_to_students: true,
  });

  async function runSingleUpload(init: MaterialUploadInitOut, contentType: string) {
    if (!init.upload_url) {
      throw new Error("Phản hồi init thiếu upload_url cho chế độ single");
    }
    setPhase("hashing");
    const checksum = await sha256Hex(file);
    setPhase("uploading");
    setProgress(0);
    try {
      const res = await fetch(init.upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });
      if (!res.ok) {
        throw new Error(`S3 PUT failed: ${res.status}`);
      }
    } catch (err) {
      if (isLikelyCorsError(err)) {
        toast.error("Cấu hình lưu trữ chưa sẵn sàng. Vui lòng liên hệ admin.");
      }
      throw err;
    }
    setProgress(100);
    setPhase("completing");
    await completeUpload.mutateAsync({
      materialId: init.material_id,
      versionId: init.version_id,
      payload: {
        storage_object_id: init.storage_object_id,
        checksum_sha256: checksum,
      },
    });
  }

  async function runMultipartUpload(init: MaterialUploadInitOut) {
    setPhase("uploading");
    setProgress(0);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const result = await uploadMultipart(file, init, {
        signal: ac.signal,
        onProgress: ({ bytesUploaded, totalBytes }) => {
          setProgress(totalBytes === 0 ? 0 : (bytesUploaded / totalBytes) * 100);
        },
        fetchParts: async (uploadId, from, count) => {
          const res = await fetchParts.mutateAsync({
            materialId: init.material_id,
            versionId: init.version_id,
            uploadId,
            from,
            count,
          });
          return res;
        },
      });
      setPhase("completing");
      await completeMultipart.mutateAsync({
        materialId: init.material_id,
        versionId: init.version_id,
        payload: {
          upload_id: result.uploadId,
          parts: result.parts,
        },
      });
    } catch (err) {
      if (init.upload_id) {
        try {
          await abortMultipart.mutateAsync({
            materialId: init.material_id,
            versionId: init.version_id,
            payload: { upload_id: init.upload_id },
          });
        } catch {
          /* swallow abort errors — primary error is more important */
        }
      }
      if (isLikelyCorsError(err)) {
        toast.error("Cấu hình lưu trữ chưa sẵn sàng. Vui lòng liên hệ admin.");
      }
      throw err;
    } finally {
      abortRef.current = null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setUploading(true);
    setPhase("init");
    setProgress(0);

    const contentType = file.type || "application/octet-stream";
    try {
      const init = await initUpload.mutateAsync({
        filename: file.name,
        content_type: contentType,
        size_bytes: file.size,
        title: form.title.trim(),
        material_type: form.material_type,
      });

      if (init.mode === "single") {
        await runSingleUpload(init, contentType);
      } else {
        await runMultipartUpload(init);
      }

      toast.success("Đã tải lên — AI đang xử lý");
      onDone();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tải lên thất bại";
      toast.error(msg);
    } finally {
      setUploading(false);
      setPhase("idle");
      setProgress(0);
    }
  }

  function handleCancelUpload() {
    abortRef.current?.abort();
  }

  const phaseLabel =
    phase === "init" ? "Khởi tạo phiên tải lên…"
    : phase === "hashing" ? "Tính checksum SHA-256…"
    : phase === "uploading" ? "Đang tải lên S3…"
    : phase === "completing" ? "Đang hoàn tất & xếp hàng xử lý…"
    : "";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-6 bg-m3-surface-container-low rounded-xl border border-m3-outline-variant/20"
    >
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
          <p className="text-xs text-m3-on-surface-variant">{formatBytes(file.size)}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          Tiêu đề *
        </label>
        <input
          required
          disabled={uploading}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/30 disabled:opacity-60"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          Loại tài liệu
        </label>
        <select
          disabled={uploading}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/30 disabled:opacity-60"
          value={form.material_type ?? "pdf"}
          onChange={(e) =>
            setForm((f) => ({ ...f, material_type: e.target.value as MaterialUploadInit["material_type"] }))
          }
        >
          {MATERIAL_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value ?? "pdf"} value={opt.value ?? "pdf"}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-xs text-m3-on-surface cursor-pointer">
          <input
            type="checkbox"
            disabled={uploading}
            checked={form.ai_processing_enabled}
            onChange={(e) => setForm((f) => ({ ...f, ai_processing_enabled: e.target.checked }))}
            className="rounded"
          />
          <Sparkles className="h-3.5 w-3.5 text-m3-secondary" />
          Xử lý AI
        </label>
        <label className="flex items-center gap-2 text-xs text-m3-on-surface cursor-pointer">
          <input
            type="checkbox"
            disabled={uploading}
            checked={form.visible_to_students}
            onChange={(e) => setForm((f) => ({ ...f, visible_to_students: e.target.checked }))}
            className="rounded"
          />
          <Eye className="h-3.5 w-3.5" />
          Hiển thị cho học viên
        </label>
      </div>

      {uploading && phase !== "idle" && (
        <div className="space-y-2">
          <ProgressBar value={progress} label={phaseLabel} />
          {phase === "uploading" && file.size > 100 * 1024 * 1024 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelUpload}
              className="gap-1.5 text-xs text-m3-error hover:text-m3-error hover:bg-m3-error-container/30"
            >
              <X className="h-3 w-3" />
              Huỷ tải lên
            </Button>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          disabled={uploading}
          className="flex-1 gap-2 gradient-primary text-white border-0 shadow-ai-glow"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Đang tải lên…</>
          ) : (
            <><Upload className="h-4 w-4" /> Tải lên & Xử lý</>
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={uploading} className="px-4">
          Đóng
        </Button>
      </div>
    </form>
  );
}

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
            ? "Trích xuất khái niệm và xây dựng đồ thị tri thức…"
            : status?.processing_status === "embedding"
            ? "Tạo vector nhúng…"
            : status?.processing_status === "chunking"
            ? "Phân đoạn nội dung thành các chunk ngữ nghĩa…"
            : status?.processing_status === "extracting"
            ? "Trích xuất văn bản từ tệp…"
            : "Đang chờ xử lý…"}
        </p>
      </div>
    </div>
  );
}

function MaterialCard({
  material,
  onDelete,
}: {
  material: LearningMaterial;
  onDelete: (id: string) => void;
}) {
  const { data: status } = useTeacherMaterialStatus(material.id);
  const reprocess = useReprocessMaterial(material.id);
  const updateMaterial = useUpdateMaterial(material.id);

  const notQueued = !material.ai_processing_enabled && !status?.active_job_id;
  const procKey = notQueued ? "not_queued" : (status?.processing_status ?? "pending");
  const proc = PROC_STATUS[procKey] ?? PROC_STATUS.pending;
  const Icon = materialIcon(material.material_type);

  function handleReprocess() {
    reprocess.mutate(undefined, {
      onSuccess: () => toast.success("Đã bắt đầu xử lý lại"),
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409 && err.code === "concurrent_reprocess") {
          toast.error("Đang xử lý lần trước; vui lòng thử lại sau");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          toast.error("Bạn không có quyền xử lý lại tài liệu này");
          return;
        }
        toast.error((err as Error).message || "Xử lý lại thất bại");
      },
    });
  }

  function handleEnableAI() {
    updateMaterial.mutate(
      { ai_processing_enabled: true },
      {
        onSuccess: () =>
          reprocess.mutate(undefined, {
            onSuccess: () => toast.success("Đã bật AI và bắt đầu xử lý"),
            onError: (err) => {
              if (err instanceof ApiError && err.status === 409 && err.code === "concurrent_reprocess") {
                toast.error("Đang xử lý lần trước; vui lòng thử lại sau");
                return;
              }
              toast.error((err as Error).message);
            },
          }),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 403) {
            toast.error("Bạn không có quyền chỉnh sửa tài liệu này");
            return;
          }
          toast.error((err as Error).message);
        },
      }
    );
  }

  function handleToggleVisibility() {
    updateMaterial.mutate(
      { visible_to_students: !material.visible_to_students },
      {
        onSuccess: () =>
          toast.success(
            material.visible_to_students
              ? "Đã ẩn khỏi học viên"
              : "Đã hiển thị cho học viên",
          ),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 403) {
            toast.error("Bạn không có quyền chỉnh sửa tài liệu này");
            return;
          }
          toast.error((err as Error).message);
        },
      },
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
              <Eye className="h-2.5 w-2.5" /> Hiển thị
            </Badge>
          ) : (
            <Badge className="text-[10px] border-0 bg-slate-100 text-slate-500 gap-1">
              <EyeOff className="h-2.5 w-2.5" /> Ẩn
            </Badge>
          )}
        </div>
        {status?.processing_error && (
          <p className="text-[11px] text-red-600 mt-1 truncate">{status.processing_error}</p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={material.visible_to_students ? "Ẩn khỏi học viên" : "Hiển thị cho học viên"}
          disabled={updateMaterial.isPending}
          onClick={handleToggleVisibility}
        >
          {material.visible_to_students ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </Button>
        {notQueued && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-m3-secondary hover:text-m3-secondary hover:bg-m3-secondary-fixed/30"
            title="Bật xử lý AI"
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
            title="Xử lý lại"
            disabled={reprocess.isPending}
            onClick={handleReprocess}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", reprocess.isPending && "animate-spin")} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-m3-error hover:text-m3-error hover:bg-m3-error-container/30"
          title="Xoá"
          onClick={() => onDelete(material.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function MaterialDeleteButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const del = useDeleteMaterial(id);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={del.isPending}
      onClick={() =>
        del.mutate(undefined, {
          onSuccess: () => {
            toast.success("Đã xoá tài liệu");
            onDeleted();
          },
          onError: (err) => {
            if (err instanceof ApiError && err.status === 403) {
              toast.error("Bạn không có quyền xoá tài liệu này");
              return;
            }
            toast.error((err as Error).message || "Xoá thất bại");
          },
        })
      }
    >
      {del.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Xác nhận xoá"}
    </Button>
  );
}

function KnowledgeGraphPreview({ readyCount }: { readyCount: number }) {
  const [toastVisible, setToastVisible] = useState(false);

  return (
    <div className="glass ghost-border shadow-glass rounded-xl p-8 text-center space-y-4">
      <div className="flex items-center justify-center gap-2">
        <Brain className="h-5 w-5 text-m3-secondary" />
        <h3 className="font-headline font-bold text-lg text-m3-on-surface">
          Đồ thị Tri thức
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
          Đã lập chỉ mục {readyCount} tài liệu · khái niệm đã trích xuất
        </p>
      ) : (
        <p className="text-xs text-m3-on-surface-variant font-medium">
          Tải lên & xử lý tài liệu để xây dựng đồ thị tri thức của bạn
        </p>
      )}

      <button
        type="button"
        onClick={() => { setToastVisible(true); setTimeout(() => setToastVisible(false), 2500); }}
        className="border border-m3-outline-variant/20 rounded-xl px-5 py-2.5 text-sm font-bold text-m3-on-surface hover:bg-m3-surface-container-low transition-colors"
      >
        Mở đồ thị đầy đủ
      </button>
      {toastVisible && (
        <p className="text-xs text-m3-secondary font-semibold animate-pulse">
          Trình xem đồ thị tri thức sẽ sớm có
        </p>
      )}
    </div>
  );
}

export default function LessonMaterialsPage() {
  const params = useParams({ strict: false }) as { courseId: string; lessonId: string };
  const { courseId, lessonId } = params;

  const { data: course } = useTeacherCourseById(courseId);
  const { data: lesson, isLoading: lessonLoading } = useTeacherLesson(lessonId);
  const { data: materials = [], isLoading: materialsLoading } = useTeacherLessonMaterials(lessonId);
  const { data: summary } = useTeacherProcessingSummary(lessonId);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const readyCount = summary?.completed_versions ?? 0;
  const processingCount = summary?.processing_versions ?? 0;

  const processingMaterial = processingCount > 0
    ? materials.find((m) => m.current_version_id !== null)
    : undefined;

  return (
    <div className="space-y-8 pb-16 max-w-[1400px]">

      <div className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
        <Link to="/teacher/courses" className="hover:text-m3-primary transition-colors">
          Khoá học của tôi
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
          {lesson?.title ?? "Bài học"}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link to="/teacher/courses/$courseId" params={{ courseId }}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-m3-primary leading-tight">
              Tài liệu &amp; AI Hub
            </h1>
          </div>
          <p className="text-m3-on-surface-variant text-base leading-relaxed pl-11">
            {lessonLoading ? "Đang tải…" : lesson?.title} · Tải tài liệu để AI dựng đồ thị tri thức
          </p>
        </div>

        {summary && (processingCount > 0 || readyCount > 0) && (
          <div className="flex gap-2 flex-wrap shrink-0">
            {processingCount > 0 && (
              <Badge className="bg-blue-100 text-blue-700 border-0 gap-1.5 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                {processingCount} đang xử lý
              </Badge>
            )}
            {readyCount > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1.5 text-xs">
                <CheckCircle className="h-3 w-3" />
                {readyCount} sẵn sàng
              </Badge>
            )}
            {(summary.failed_versions ?? 0) > 0 && (
              <Badge className="bg-red-100 text-red-700 border-0 gap-1.5 text-xs">
                <AlertCircle className="h-3 w-3" />
                {summary.failed_versions} thất bại
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 items-start">

        <div className="space-y-5">

          {selectedFile ? (
            <SelectedFileForm
              file={selectedFile}
              lessonId={lessonId}
              onDone={() => setSelectedFile(null)}
              onCancel={() => setSelectedFile(null)}
            />
          ) : (
            <UploadDropzone onFile={setSelectedFile} />
          )}

          {processingCount > 0 && processingMaterial ? (
            <ProcessingStatusCard material={processingMaterial} />
          ) : (
            <div className="bg-m3-surface-container-low rounded-xl p-7 text-center">
              <div className="w-12 h-12 rounded-xl bg-m3-surface-container flex items-center justify-center mx-auto mb-3">
                <Brain className="h-6 w-6 text-m3-on-surface-variant" />
              </div>
              <p className="font-headline font-bold text-m3-on-surface text-sm mb-1">
                Không có tệp nào đang xử lý
              </p>
              <p className="text-xs text-m3-on-surface-variant">
                Tải tệp lên ở khung trên để bắt đầu xử lý AI
              </p>
            </div>
          )}

          {readyCount > 0 && (
            <div className="flex items-center gap-3 p-4 bg-m3-secondary-fixed/30 rounded-xl border border-m3-secondary/10">
              <Sparkles className="h-5 w-5 text-m3-secondary shrink-0" />
              <p className="text-sm font-medium text-m3-on-surface">
                AI đã lập chỉ mục {readyCount} tài liệu — đồ thị tri thức sẵn sàng cho việc tạo quiz
              </p>
            </div>
          )}
        </div>

        <div className="space-y-5">

          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-m3-on-surface text-lg">
              Lịch sử tài liệu
            </h2>
            {summary && (
              <span className="text-sm text-m3-on-surface-variant">
                {summary.materials_total} tài liệu
              </span>
            )}
          </div>

          {materialsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-m3-surface-container animate-pulse rounded-xl" />
              ))}
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-10 text-m3-on-surface-variant bg-m3-surface-container-low/50 rounded-xl">
              <FileText className="h-9 w-9 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Chưa có tài liệu nào</p>
              <p className="text-xs mt-1 text-m3-on-surface-variant/70">
                Tải tệp đầu tiên bằng khung kéo-thả ở bên trái
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {materials.map((material) => (
                <div key={material.id}>
                  <MaterialCard
                    material={material}
                    onDelete={(id) => setPendingDeleteId(id)}
                  />
                  {pendingDeleteId === material.id && (
                    <div className="mt-2 flex items-center justify-end gap-2 px-4 py-3 rounded-xl bg-m3-error-container/20 border border-m3-error/20 text-xs text-m3-on-surface">
                      <span className="text-m3-error font-medium">Xoá tài liệu này?</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDeleteId(null)}
                      >
                        Huỷ
                      </Button>
                      <MaterialDeleteButton
                        id={material.id}
                        onDeleted={() => setPendingDeleteId(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <KnowledgeGraphPreview readyCount={readyCount} />
        </div>

      </div>
    </div>
  );
}
