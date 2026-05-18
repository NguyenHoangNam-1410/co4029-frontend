import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { useUnsavedChangesWarning } from "@/lib/use-unsaved-changes-warning";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import {
  useAddCareerPathCourse,
  useAddCareerPathStudent,
  useArchiveCareerPath,
  useCareerPathCourses,
  useManagedCareerPath,
  usePatchCareerPath,
  usePublishCareerPath,
  useRemoveCareerPathCourse,
  useRemoveCareerPathStudent,
  useReorderCareerPathCourses,
  useTeacherCareerPathProgress,
} from "@/lib/api/hooks/career-paths";
import type {
  CareerPathCourseAuthoring,
  StudentPathProgressAuthoring,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

type TabKey = "courses" | "students" | "progress";

const TABS: { key: TabKey; label: string; icon: typeof BookOpen }[] = [
  { key: "courses", label: "Khóa học", icon: BookOpen },
  { key: "students", label: "Sinh viên", icon: Users },
  { key: "progress", label: "Tiến độ", icon: Upload },
];

const STATUS_LABEL: Record<string, string> = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  archived: "Đã lưu trữ",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-100 text-slate-500",
};

export default function ManagementCareerPathDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams({ strict: false }) as { id: string };
  const permissions = useMyPermissions();
  const perms = permissions.data?.permissions ?? [];
  const canManage =
    perms.includes("career_path.manage") ||
    perms.includes("system.administer");

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canManage) {
      toast.error("Không có quyền truy cập");
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canManage, navigate]);

  const enabled = !permissions.isLoading && canManage;
  const path = useManagedCareerPath(enabled ? id : undefined);

  const [tab, setTab] = useState<TabKey>("courses");

  if (!enabled || path.isLoading) {
    return (
      <div className="space-y-3 pb-12">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-m3-surface-container animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (path.isError || !path.data) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="rounded-xl bg-m3-error-container border border-m3-error/20 p-6 text-center">
          <p className="text-m3-on-error-container text-sm font-semibold">
            Không thể tải lộ trình
          </p>
        </div>
      </div>
    );
  }

  const data = path.data;
  const statusCls = STATUS_COLOR[data.status] ?? "bg-slate-100 text-slate-700";
  const statusLabel = STATUS_LABEL[data.status] ?? data.status;

  return (
    <div className="max-w-[1200px] mx-auto pb-16 space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="pt-4">
        <Breadcrumbs
          items={[
            { label: "Quản lý", to: "/management/career-paths" },
            { label: "Lộ trình nghề nghiệp", to: "/management/career-paths" },
            { label: data.name },
          ]}
        />
      </div>

      <div className="flex items-center gap-3">
        <Link to="/management/career-paths">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-headline font-bold text-m3-on-surface truncate">
              {data.name}
            </h1>
            <span
              className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${statusCls}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-m3-on-surface-variant mt-0.5 font-mono truncate">
            {data.slug}
          </p>
        </div>
        <PathActions
          id={id}
          status={data.status}
          organizationId={data.organization_id}
        />
      </div>

      <EditForm
        id={id}
        initialName={data.name}
        initialDescription={data.description ?? ""}
        initialOrgUnitId={data.org_unit_id ?? ""}
      />

      <div className="flex gap-1 border-b border-m3-outline-variant/30">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer",
                active
                  ? "border-m3-primary text-m3-primary"
                  : "border-transparent text-m3-on-surface-variant hover:text-m3-on-surface",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "courses" && <CoursesTab id={id} />}
      {tab === "students" && <StudentsTab id={id} />}
      {tab === "progress" && <ProgressTab id={id} />}
    </div>
  );
}

function PathActions({
  id,
  status,
  organizationId: _organizationId,
}: {
  id: string;
  status: string;
  organizationId: string;
}) {
  const publish = usePublishCareerPath(id);
  const archive = useArchiveCareerPath(id);
  const [confirming, setConfirming] = useState<"publish" | "archive" | null>(
    null,
  );

  function handlePublish() {
    publish.mutate(undefined, {
      onSuccess: () => {
        toast.success("Đã xuất bản lộ trình");
        setConfirming(null);
      },
      onError: (err) => {
        const e = err as { status?: number; message?: string };
        const message =
          e.status && e.status >= 400 && e.status < 500
            ? "Thêm ít nhất một khóa học trước khi xuất bản"
            : e.message || "Xuất bản thất bại";
        toast.error(message);
        setConfirming(null);
      },
    });
  }

  function handleArchive() {
    archive.mutate(undefined, {
      onSuccess: () => {
        toast.success("Đã lưu trữ lộ trình");
        setConfirming(null);
      },
      onError: (err) => {
        toast.error((err as Error).message || "Lưu trữ thất bại");
        setConfirming(null);
      },
    });
  }

  if (confirming === "publish") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          onClick={handlePublish}
          disabled={publish.isPending}
          className="gap-2"
        >
          {publish.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Xác nhận xuất bản
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirming(null)}
          disabled={publish.isPending}
        >
          Huỷ
        </Button>
      </div>
    );
  }

  if (confirming === "archive") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="destructive"
          onClick={handleArchive}
          disabled={archive.isPending}
          className="gap-2"
        >
          {archive.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Xác nhận lưu trữ
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirming(null)}
          disabled={archive.isPending}
        >
          Huỷ
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {status !== "published" && status !== "archived" && (
        <Button size="sm" onClick={() => setConfirming("publish")}>
          Xuất bản
        </Button>
      )}
      {status !== "archived" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirming("archive")}
          className="gap-2"
        >
          <Archive className="h-4 w-4" />
          Lưu trữ
        </Button>
      )}
    </div>
  );
}

function EditForm({
  id,
  initialName,
  initialDescription,
  initialOrgUnitId,
}: {
  id: string;
  initialName: string;
  initialDescription: string;
  initialOrgUnitId: string;
}) {
  const patch = usePatchCareerPath(id);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [orgUnitId, setOrgUnitId] = useState(initialOrgUnitId);

  useEffect(() => {
    setName(initialName);
    setDescription(initialDescription);
    setOrgUnitId(initialOrgUnitId);
  }, [initialName, initialDescription, initialOrgUnitId]);

  const dirty =
    name !== initialName ||
    description !== initialDescription ||
    orgUnitId !== initialOrgUnitId;

  useUnsavedChangesWarning(dirty);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    patch.mutate(
      {
        name: name.trim() !== initialName ? name.trim() : undefined,
        description:
          description.trim() !== initialDescription
            ? description.trim() || null
            : undefined,
        org_unit_id:
          orgUnitId.trim() !== initialOrgUnitId
            ? orgUnitId.trim() || null
            : undefined,
      },
      {
        onSuccess: () => toast.success("Đã lưu thay đổi"),
        onError: (err) =>
          toast.error((err as Error).message || "Lưu thất bại"),
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Tên
          </label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Đơn vị (org_unit_id)
          </label>
          <Input
            value={orgUnitId}
            onChange={(e) => setOrgUnitId(e.target.value)}
            placeholder="UUID đơn vị (tuỳ chọn)"
            className="font-mono text-sm"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          Mô tả
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm bg-m3-surface-container-low border border-m3-outline-variant/30 rounded-xl text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary/30"
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!dirty || patch.isPending}
          className="gap-2"
        >
          {patch.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Lưu
        </Button>
      </div>
    </form>
  );
}

function CoursesTab({ id }: { id: string }) {
  const list = useCareerPathCourses(id);
  const add = useAddCareerPathCourse(id);
  const reorder = useReorderCareerPathCourses(id);

  const [courseIdInput, setCourseIdInput] = useState("");
  const [position, setPosition] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [order, setOrder] = useState<CareerPathCourseAuthoring[] | null>(null);

  const baseRows = useMemo(
    () => [...(list.data ?? [])].sort((a, b) => a.position - b.position),
    [list.data],
  );
  const rows = order ?? baseRows;
  const hasReorderChanges = useMemo(() => {
    if (!order) return false;
    return order.some((row, i) => row.course_id !== baseRows[i]?.course_id);
  }, [order, baseRows]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!courseIdInput.trim()) {
      toast.error("Hãy nhập UUID khóa học");
      return;
    }
    add.mutate(
      {
        course_id: courseIdInput.trim(),
        position: position ? Number(position) : undefined,
        is_required: isRequired,
      },
      {
        onSuccess: () => {
          toast.success("Đã thêm khóa học");
          setCourseIdInput("");
          setPosition("");
          setIsRequired(true);
          setOrder(null);
        },
        onError: (err) =>
          toast.error((err as Error).message || "Thêm khóa học thất bại"),
      },
    );
  }

  function move(idx: number, delta: number) {
    const target = idx + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
  }

  function handleSubmitReorder() {
    if (!order) return;
    reorder.mutate(
      order.map((r) => r.course_id),
      {
        onSuccess: () => {
          toast.success("Đã cập nhật thứ tự");
          setOrder(null);
        },
        onError: (err) =>
          toast.error((err as Error).message || "Cập nhật thứ tự thất bại"),
      },
    );
  }

  if (list.isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-14 bg-m3-surface-container animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAdd}
        className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-4"
      >
        <h3 className="text-sm font-bold text-m3-on-surface">Thêm khóa học</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px_auto] gap-3 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              UUID khóa học <span className="text-red-600">*</span>
            </label>
            <Input
              value={courseIdInput}
              onChange={(e) => setCourseIdInput(e.target.value)}
              placeholder="550e8400-e29b-41d4-a716-446655440000"
              className="font-mono text-xs"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              Vị trí
            </label>
            <Input
              type="number"
              min={1}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Cuối"
              className="text-sm"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer h-9">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="h-4 w-4 rounded border-m3-outline-variant accent-m3-primary"
            />
            <span className="font-medium text-m3-on-surface">Bắt buộc</span>
          </label>
          <Button
            type="submit"
            size="sm"
            disabled={add.isPending}
            className="gap-2"
          >
            {add.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Thêm
          </Button>
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-10 text-center">
          <BookOpen className="h-8 w-8 mx-auto mb-3 text-m3-outline" />
          <p className="text-sm text-m3-on-surface-variant">
            Chưa có khóa học nào trong lộ trình.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {hasReorderChanges && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5">
              <p className="text-xs font-semibold text-amber-900">
                Thứ tự đã thay đổi. Lưu để áp dụng.
              </p>
              <div className="flex gap-1.5">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setOrder(null)}
                  disabled={reorder.isPending}
                >
                  Huỷ
                </Button>
                <Button
                  size="xs"
                  onClick={handleSubmitReorder}
                  disabled={reorder.isPending}
                  className="gap-1.5"
                >
                  {reorder.isPending && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  Lưu thứ tự
                </Button>
              </div>
            </div>
          )}
          {rows.map((row, idx) => (
            <CourseInPathRow
              key={row.course_id}
              row={row}
              index={idx}
              total={rows.length}
              pathId={id}
              onMoveUp={() => move(idx, -1)}
              onMoveDown={() => move(idx, 1)}
              onLocalRemove={() => {
                if (order) setOrder(order.filter((r) => r.course_id !== row.course_id));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseInPathRow({
  row,
  index,
  total,
  pathId,
  onMoveUp,
  onMoveDown,
  onLocalRemove,
}: {
  row: CareerPathCourseAuthoring;
  index: number;
  total: number;
  pathId: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onLocalRemove: () => void;
}) {
  const remove = useRemoveCareerPathCourse(pathId, row.course_id);
  const [confirming, setConfirming] = useState(false);

  function handleRemove() {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success("Đã xoá khóa học khỏi lộ trình");
        setConfirming(false);
        onLocalRemove();
      },
      onError: (err) =>
        toast.error((err as Error).message || "Xoá thất bại"),
    });
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card ghost-border">
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-1 rounded hover:bg-m3-surface-container disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title="Chuyển lên"
        >
          <ArrowUp className="h-3 w-3 text-m3-on-surface-variant" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-1 rounded hover:bg-m3-surface-container disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title="Chuyển xuống"
        >
          <ArrowDown className="h-3 w-3 text-m3-on-surface-variant" />
        </button>
      </div>
      <div className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-m3-primary-fixed text-m3-primary shrink-0 font-headline font-bold text-xs">
        {row.position}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface truncate">
          {row.course_title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] font-mono text-m3-on-surface-variant truncate">
            {row.course_slug}
          </span>
          <span
            className={
              row.is_required
                ? "text-[10px] font-bold uppercase text-m3-primary"
                : "text-[10px] font-bold uppercase text-m3-on-surface-variant"
            }
          >
            {row.is_required ? "Bắt buộc" : "Tự chọn"}
          </span>
        </div>
      </div>
      {confirming ? (
        <div className="flex gap-1">
          <Button
            size="xs"
            variant="destructive"
            onClick={handleRemove}
            disabled={remove.isPending}
          >
            {remove.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Xác nhận"
            )}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setConfirming(false)}
            disabled={remove.isPending}
          >
            Huỷ
          </Button>
        </div>
      ) : (
        <Button
          size="xs"
          variant="ghost"
          onClick={() => setConfirming(true)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function StudentsTab({ id }: { id: string }) {
  const add = useAddCareerPathStudent(id);
  const progress = useTeacherCareerPathProgress(id);
  const [studentId, setStudentId] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId.trim()) {
      toast.error("Hãy nhập UUID sinh viên");
      return;
    }
    add.mutate(
      { student_id: studentId.trim() },
      {
        onSuccess: () => {
          toast.success("Đã thêm sinh viên");
          setStudentId("");
        },
        onError: (err) =>
          toast.error((err as Error).message || "Thêm sinh viên thất bại"),
      },
    );
  }

  const rows = progress.data ?? [];

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAdd}
        className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-4"
      >
        <h3 className="text-sm font-bold text-m3-on-surface">Đăng ký sinh viên</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              UUID sinh viên <span className="text-red-600">*</span>
            </label>
            <Input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="550e8400-e29b-41d4-a716-446655440000"
              className="font-mono text-xs"
              required
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={add.isPending}
            className="gap-2"
          >
            {add.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Đăng ký
          </Button>
        </div>
      </form>

      {progress.isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-14 bg-m3-surface-container animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-10 text-center">
          <Users className="h-8 w-8 mx-auto mb-3 text-m3-outline" />
          <p className="text-sm text-m3-on-surface-variant">
            Chưa có sinh viên nào đăng ký.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <StudentRow key={row.student_id} pathId={id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function StudentRow({
  pathId,
  row,
}: {
  pathId: string;
  row: StudentPathProgressAuthoring;
}) {
  const remove = useRemoveCareerPathStudent(pathId, row.student_id);
  const [confirming, setConfirming] = useState(false);

  function handleRemove() {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success("Đã huỷ đăng ký");
        setConfirming(false);
      },
      onError: (err) =>
        toast.error((err as Error).message || "Huỷ đăng ký thất bại"),
    });
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card ghost-border">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface truncate">
          {row.student_email}
        </p>
        <p className="text-[11px] font-mono text-m3-on-surface-variant truncate mt-0.5">
          {row.student_id}
        </p>
      </div>
      <div className="text-right shrink-0 min-w-[120px]">
        <p className="text-xs text-m3-on-surface font-semibold">
          Đã hoàn thành {row.completed_courses}/{row.course_count} khóa học
        </p>
        <div className="mt-1 h-1.5 w-full bg-m3-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-m3-primary transition-all"
            style={{
              width: `${Math.min(100, Math.max(0, row.overall_percent))}%`,
            }}
          />
        </div>
      </div>
      {confirming ? (
        <div className="flex gap-1 shrink-0">
          <Button
            size="xs"
            variant="destructive"
            onClick={handleRemove}
            disabled={remove.isPending}
          >
            {remove.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Xác nhận"
            )}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setConfirming(false)}
            disabled={remove.isPending}
          >
            Huỷ
          </Button>
        </div>
      ) : (
        <Button
          size="xs"
          variant="ghost"
          onClick={() => setConfirming(true)}
          className="text-red-600 hover:text-red-700 shrink-0"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function ProgressTab({ id }: { id: string }) {
  const progress = useTeacherCareerPathProgress(id);

  if (progress.isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 bg-m3-surface-container animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (progress.isError) {
    return (
      <div className="rounded-xl bg-m3-error-container border border-m3-error/20 p-6 text-center">
        <p className="text-m3-on-error-container text-sm font-semibold">
          Không thể tải tiến độ sinh viên
        </p>
      </div>
    );
  }

  const rows = progress.data ?? [];

  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-10 text-center">
        <Users className="h-8 w-8 mx-auto mb-3 text-m3-outline" />
        <p className="text-sm text-m3-on-surface-variant">
          Chưa có sinh viên nào đăng ký lộ trình.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1fr_140px_180px] gap-4 px-5 py-3 border-b border-m3-outline-variant/10 text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
        <span>Sinh viên</span>
        <span>Khóa học hoàn thành</span>
        <span>Tổng tiến độ</span>
      </div>
      <div className="divide-y divide-m3-outline-variant/10">
        {rows.map((row) => (
          <div
            key={row.student_id}
            className="grid grid-cols-1 sm:grid-cols-[1fr_140px_180px] gap-4 px-5 py-3 items-center"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-m3-on-surface truncate">
                {row.student_email}
              </p>
              <p className="text-[11px] font-mono text-m3-on-surface-variant truncate mt-0.5">
                {row.student_id}
              </p>
            </div>
            <span className="text-xs text-m3-on-surface font-semibold">
              {row.completed_courses}/{row.course_count}
            </span>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-m3-on-surface-variant">
                  {Math.round(row.overall_percent)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-m3-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-m3-primary transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, row.overall_percent))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
