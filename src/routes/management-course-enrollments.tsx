import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Copy,
  FileSpreadsheet,
  Loader2,
  Plus,
  Trash2,
  Upload,
  UserMinus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import {
  useBulkEnroll,
  useCreateInvitationCode,
  useDeleteInvitationCode,
  useDeptEnrollments,
  useDropEnrollment,
  useImportEnrollmentsCsv,
  useListInvitationCodes,
  usePatchInvitationCode,
} from "@/lib/api/hooks/enrollments";
import { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import type {
  BulkEnrollFailure,
  BulkEnrollResult,
  EnrollmentAuthoring,
  InvitationCodeAuthoring,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

type TabKey = "roster" | "bulk" | "codes";

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: "roster", label: "Sinh viên", icon: Users },
  { key: "bulk", label: "Thêm hàng loạt", icon: Upload },
  { key: "codes", label: "Mã mời", icon: FileSpreadsheet },
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FAILURE_LABEL: Record<string, string> = {
  user_not_found: "Không tìm thấy người dùng",
  already_enrolled: "Đã đăng ký rồi",
  invalid_identifier: "Định danh không hợp lệ",
  forbidden: "Không có quyền",
};

function failureLabel(reason: string): string {
  return FAILURE_LABEL[reason] ?? reason;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function ManagementCourseEnrollmentsPage() {
  const navigate = useNavigate();
  const { courseId } = useParams({ strict: false }) as { courseId: string };

  const permissions = useMyPermissions();
  const canManage =
    permissions.data?.permissions.includes("course.enrollment.create") ??
    permissions.data?.permissions.includes("system.administer") ??
    false;

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canManage) {
      toast.error("Không có quyền truy cập");
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canManage, navigate]);

  const enabled = !permissions.isLoading && canManage;
  const { data: course } = useTeacherCourseById(enabled ? courseId : "");

  const [tab, setTab] = useState<TabKey>("roster");

  if (permissions.isLoading || !enabled) {
    return (
      <div className="space-y-3 pb-12">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-surface-muted animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-16 space-y-6">
      <div className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant pt-4">
        <Link
          to="/teacher/courses"
          className="hover:text-m3-primary transition-colors"
        >
          Khoá học
        </Link>
        <ArrowRight className="h-3 w-3" />
        <Link
          to="/teacher/courses/$courseId"
          params={{ courseId }}
          className="hover:text-m3-primary transition-colors truncate max-w-[260px]"
        >
          {course?.title ?? "…"}
        </Link>
        <ArrowRight className="h-3 w-3" />
        <span className="text-m3-on-surface font-medium">Quản lý đăng ký</span>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/teacher/courses/$courseId" params={{ courseId }}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-headline font-bold text-m3-on-surface truncate">
            Quản lý đăng ký
          </h1>
          <p className="text-xs text-m3-on-surface-variant mt-0.5 truncate">
            {course?.title ?? "…"}
          </p>
        </div>
      </div>

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

      {tab === "roster" && <RosterTab courseId={courseId} />}
      {tab === "bulk" && <BulkTab courseId={courseId} />}
      {tab === "codes" && <CodesTab courseId={courseId} />}
    </div>
  );
}

/* ── Tab 1: Roster ─────────────────────────────────────────────────── */

function RosterTab({ courseId }: { courseId: string }) {
  const { data, isLoading, isError } = useDeptEnrollments(courseId);
  const drop = useDropEnrollment(courseId);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const rows: EnrollmentAuthoring[] = data ?? [];

  function handleDrop(userId: string) {
    drop.mutate(userId, {
      onSuccess: () => {
        toast.success("Đã huỷ đăng ký");
        setConfirmId(null);
      },
      onError: (err) =>
        toast.error((err as Error).message || "Huỷ đăng ký thất bại"),
    });
  }

  if (isLoading) {
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

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Không thể tải danh sách sinh viên.
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-m3-on-surface-variant">
        <Users className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">Chưa có sinh viên nào đăng ký.</p>
      </div>
    );
  }

  return (
    <div className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1fr_140px_140px_120px_100px] gap-4 px-5 py-3 border-b border-m3-outline-variant/10 text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
        <span>Sinh viên</span>
        <span>Trạng thái</span>
        <span>Nguồn</span>
        <span>Đăng ký lúc</span>
        <span className="text-right">Hành động</span>
      </div>
      <div className="divide-y divide-m3-outline-variant/10">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px_120px_100px] gap-4 px-5 py-3 items-center"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-m3-on-surface truncate font-mono">
                {row.student_id}
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md w-fit">
              {row.status}
            </span>
            <span className="text-xs text-m3-on-surface-variant">
              {row.source}
            </span>
            <span className="text-xs text-m3-on-surface-variant">
              {formatDate(row.enrolled_at)}
            </span>
            <div className="flex justify-end">
              {confirmId === row.student_id ? (
                <div className="flex gap-1">
                  <Button
                    size="xs"
                    variant="destructive"
                    onClick={() => handleDrop(row.student_id)}
                    disabled={drop.isPending}
                  >
                    {drop.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Xác nhận"
                    )}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setConfirmId(null)}
                    disabled={drop.isPending}
                  >
                    Huỷ
                  </Button>
                </div>
              ) : (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setConfirmId(row.student_id)}
                  className="gap-1"
                >
                  <UserMinus className="h-3 w-3" />
                  Bỏ
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tab 2: Bulk add (paste UUIDs/emails or CSV upload) ─────────────── */

function BulkTab({ courseId }: { courseId: string }) {
  const bulk = useBulkEnroll(courseId);
  const csv = useImportEnrollmentsCsv(courseId);
  const [text, setText] = useState("");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [result, setResult] = useState<BulkEnrollResult | null>(null);

  const parsed = useMemo(() => {
    const userIds: string[] = [];
    const emails: string[] = [];
    const invalid: string[] = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      if (UUID_RE.test(line)) {
        userIds.push(line);
      } else if (line.includes("@")) {
        emails.push(line);
      } else {
        invalid.push(line);
      }
    }
    return { userIds, emails, invalid };
  }, [text]);

  function handleSubmitText(e: React.FormEvent) {
    e.preventDefault();
    if (parsed.userIds.length === 0 && parsed.emails.length === 0) {
      toast.error("Hãy nhập ít nhất một UUID hoặc email");
      return;
    }
    bulk.mutate(
      { user_ids: parsed.userIds, emails: parsed.emails },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success(
            `Đã thêm ${data.enrolled.length} sinh viên, ${data.failures.length} lỗi`,
          );
          setText("");
        },
        onError: (err) =>
          toast.error((err as Error).message || "Thêm hàng loạt thất bại"),
      },
    );
  }

  function handleCsvChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const csvText = String(reader.result ?? "");
      csv.mutate(
        { csv_text: csvText },
        {
          onSuccess: (data) => {
            setResult(data);
            toast.success(
              `Đã thêm ${data.enrolled.length} sinh viên, ${data.failures.length} lỗi`,
            );
          },
          onError: (err) =>
            toast.error((err as Error).message || "Tải CSV thất bại"),
        },
      );
    };
    reader.onerror = () => toast.error("Đọc file thất bại");
    reader.readAsText(file);
    e.target.value = "";
  }

  const submitting = bulk.isPending || csv.isPending;

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmitText}
        className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-4"
      >
        <div>
          <h2 className="text-sm font-bold text-m3-on-surface">
            Dán danh sách (mỗi dòng một UUID hoặc email)
          </h2>
          <p className="text-xs text-m3-on-surface-variant mt-1">
            Hệ thống tự nhận diện UUID và email. Dòng không hợp lệ sẽ bỏ qua.
          </p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={
            "user@example.com\n550e8400-e29b-41d4-a716-446655440000\nanother@example.com"
          }
          className="w-full px-4 py-3 text-sm font-mono bg-m3-surface-container-low border border-m3-outline-variant/30 rounded-xl text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary/30 placeholder:text-m3-on-surface-variant/40"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-m3-on-surface-variant">
          <div className="flex gap-3">
            <span>UUID: <strong>{parsed.userIds.length}</strong></span>
            <span>Email: <strong>{parsed.emails.length}</strong></span>
            {parsed.invalid.length > 0 && (
              <span className="text-amber-700">
                Bỏ qua: <strong>{parsed.invalid.length}</strong>
              </span>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={
              submitting ||
              (parsed.userIds.length === 0 && parsed.emails.length === 0)
            }
            className="gap-2"
          >
            {bulk.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Thêm sinh viên
          </Button>
        </div>
      </form>

      <div className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-3">
        <h2 className="text-sm font-bold text-m3-on-surface">
          Hoặc tải lên file CSV
        </h2>
        <p className="text-xs text-m3-on-surface-variant">
          File CSV có cột <code className="font-mono">email</code> hoặc{" "}
          <code className="font-mono">user_id</code>.
        </p>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvChange}
            disabled={submitting}
            className="hidden"
          />
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-m3-outline-variant/30 bg-m3-surface-container px-3 py-1.5 text-sm font-medium text-m3-on-surface hover:bg-m3-surface-container-high transition-colors",
              submitting && "opacity-60 pointer-events-none",
            )}
          >
            {csv.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Chọn file CSV
          </span>
          {csvFileName && (
            <span className="text-xs text-m3-on-surface-variant">
              {csvFileName}
            </span>
          )}
        </label>
      </div>

      {result && <BulkResultPanel result={result} onClose={() => setResult(null)} />}
    </div>
  );
}

function BulkResultPanel({
  result,
  onClose,
}: {
  result: BulkEnrollResult;
  onClose: () => void;
}) {
  const [showFailures, setShowFailures] = useState(true);
  const grouped = useMemo(() => {
    const map = new Map<string, BulkEnrollFailure[]>();
    for (const f of result.failures) {
      const list = map.get(f.reason) ?? [];
      list.push(f);
      map.set(f.reason, list);
    }
    return Array.from(map.entries());
  }, [result.failures]);

  return (
    <div className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-m3-on-surface">Kết quả</h3>
        <Button size="xs" variant="ghost" onClick={onClose}>
          Đóng
        </Button>
      </div>
      <div className="flex gap-4 text-sm">
        <span className="text-emerald-700 font-semibold">
          Đã thêm {result.enrolled.length} sinh viên
        </span>
        {result.failures.length > 0 && (
          <span className="text-amber-700 font-semibold">
            {result.failures.length} lỗi
          </span>
        )}
      </div>

      {grouped.length > 0 && (
        <div className="border border-m3-outline-variant/20 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowFailures((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 bg-m3-surface-container text-sm font-medium hover:bg-m3-surface-container-high transition-colors"
          >
            <span className="flex items-center gap-2 text-m3-on-surface">
              <AlertCircle className="h-4 w-4 text-amber-700" />
              Chi tiết lỗi ({result.failures.length})
            </span>
            {showFailures ? (
              <ChevronUp className="h-4 w-4 text-m3-on-surface-variant" />
            ) : (
              <ChevronDown className="h-4 w-4 text-m3-on-surface-variant" />
            )}
          </button>
          {showFailures && (
            <div className="divide-y divide-m3-outline-variant/10">
              {grouped.map(([reason, items]) => (
                <div key={reason} className="px-4 py-3 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-m3-on-surface-variant">
                    {failureLabel(reason)} ({items.length})
                  </p>
                  <ul className="space-y-1 text-xs font-mono text-m3-on-surface">
                    {items.map((f, i) => (
                      <li key={`${reason}-${i}`} className="truncate">
                        {f.identifier}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Tab 3: Invitation codes ────────────────────────────────────────── */

function CodesTab({ courseId }: { courseId: string }) {
  const list = useListInvitationCodes(courseId);
  const create = useCreateInvitationCode(courseId);
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [editing, setEditing] = useState<InvitationCodeAuthoring | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Hãy nhập mã");
      return;
    }
    create.mutate(
      {
        code: code.trim(),
        expires_at: dateInputToIso(expiresAt),
        max_uses: maxUses ? Number(maxUses) : null,
      },
      {
        onSuccess: () => {
          toast.success("Đã tạo mã mời");
          setCode("");
          setExpiresAt("");
          setMaxUses("");
        },
        onError: (err) =>
          toast.error((err as Error).message || "Tạo mã thất bại"),
      },
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-4"
      >
        <h2 className="text-sm font-bold text-m3-on-surface">Tạo mã mời mới</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              Mã <span className="text-red-600">*</span>
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ví dụ: SPRING2026"
              className="text-sm font-mono"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              Hết hạn (tuỳ chọn)
            </label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              Số lượt dùng tối đa (tuỳ chọn)
            </label>
            <Input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Trống = không giới hạn"
              className="text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={create.isPending}
            className="gap-2"
          >
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Tạo mã
          </Button>
        </div>
      </form>

      <CodesList
        courseId={courseId}
        codes={list.data ?? []}
        isLoading={list.isLoading}
        isError={list.isError}
        onEdit={setEditing}
      />

      {editing && (
        <EditCodeModal
          courseId={courseId}
          item={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function CodesList({
  courseId,
  codes,
  isLoading,
  isError,
  onEdit,
}: {
  courseId: string;
  codes: InvitationCodeAuthoring[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (item: InvitationCodeAuthoring) => void;
}) {
  if (isLoading) {
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

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Không thể tải danh sách mã mời.
      </div>
    );
  }

  if (codes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-m3-on-surface-variant">
        <FileSpreadsheet className="h-8 w-8 opacity-30" />
        <p className="text-sm">Chưa có mã mời nào.</p>
      </div>
    );
  }

  return (
    <div className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1.5fr_120px_120px_120px_100px_140px] gap-4 px-5 py-3 border-b border-m3-outline-variant/10 text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
        <span>Mã</span>
        <span>Trạng thái</span>
        <span>Hết hạn</span>
        <span>Lượt dùng</span>
        <span>Tạo lúc</span>
        <span className="text-right">Hành động</span>
      </div>
      <div className="divide-y divide-m3-outline-variant/10">
        {codes.map((c) => (
          <CodeRow
            key={c.id}
            courseId={courseId}
            item={c}
            onEdit={() => onEdit(c)}
          />
        ))}
      </div>
    </div>
  );
}

function CodeRow({
  courseId,
  item,
  onEdit,
}: {
  courseId: string;
  item: InvitationCodeAuthoring;
  onEdit: () => void;
}) {
  const del = useDeleteInvitationCode(item.id, courseId);
  const [confirming, setConfirming] = useState(false);

  function handleCopy() {
    void navigator.clipboard
      .writeText(item.code)
      .then(() => toast.success("Đã chép mã"))
      .catch(() => toast.error("Không thể chép"));
  }

  function handleDelete() {
    del.mutate(undefined, {
      onSuccess: () => {
        toast.success("Đã xoá mã mời");
        setConfirming(false);
      },
      onError: (err) =>
        toast.error((err as Error).message || "Xoá thất bại"),
    });
  }

  const limit =
    item.max_uses === null || item.max_uses === undefined
      ? "∞"
      : String(item.max_uses);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_120px_120px_120px_100px_140px] gap-4 px-5 py-3 items-center">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-mono font-semibold text-m3-on-surface truncate">
          {item.code}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          title="Chép mã"
          className="text-m3-on-surface-variant hover:text-m3-primary transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
      <span
        className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-md w-fit",
          item.is_active
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-100 text-slate-600",
        )}
      >
        {item.is_active ? "Đang hoạt động" : "Tắt"}
      </span>
      <span className="text-xs text-m3-on-surface-variant">
        {formatDate(item.expires_at)}
      </span>
      <span className="text-xs text-m3-on-surface-variant">
        {item.current_uses} / {limit}
      </span>
      <span className="text-xs text-m3-on-surface-variant">
        {formatDate(item.created_at)}
      </span>
      <div className="flex justify-end gap-1">
        {confirming ? (
          <>
            <Button
              size="xs"
              variant="destructive"
              onClick={handleDelete}
              disabled={del.isPending}
            >
              {del.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Xác nhận"
              )}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={del.isPending}
            >
              Huỷ
            </Button>
          </>
        ) : (
          <>
            <Button size="xs" variant="outline" onClick={onEdit}>
              Sửa
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setConfirming(true)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function EditCodeModal({
  courseId,
  item,
  onClose,
}: {
  courseId: string;
  item: InvitationCodeAuthoring;
  onClose: () => void;
}) {
  const patch = usePatchInvitationCode(item.id, courseId);
  const [isActive, setIsActive] = useState(item.is_active);
  const [expiresAt, setExpiresAt] = useState(
    formatDateInputValue(item.expires_at ?? null),
  );
  const [maxUses, setMaxUses] = useState(
    item.max_uses != null ? String(item.max_uses) : "",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    patch.mutate(
      {
        is_active: isActive,
        expires_at: dateInputToIso(expiresAt),
        max_uses: maxUses ? Number(maxUses) : null,
      },
      {
        onSuccess: () => {
          toast.success("Đã cập nhật mã");
          onClose();
        },
        onError: (err) =>
          toast.error((err as Error).message || "Cập nhật thất bại"),
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-popover rounded-xl shadow-lg p-6 space-y-5"
      >
        <div>
          <h2 className="text-lg font-headline font-bold text-m3-on-surface">
            Sửa mã mời
          </h2>
          <p className="text-xs text-m3-on-surface-variant font-mono mt-1">
            {item.code}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-m3-outline-variant accent-m3-primary"
          />
          <span className="font-medium text-m3-on-surface">Đang hoạt động</span>
        </label>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Hết hạn
          </label>
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Số lượt dùng tối đa
          </label>
          <Input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Trống = không giới hạn"
            className="text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={patch.isPending}
          >
            Huỷ
          </Button>
          <Button type="submit" size="sm" disabled={patch.isPending} className="gap-2">
            {patch.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu
          </Button>
        </div>
      </form>
    </div>
  );
}
