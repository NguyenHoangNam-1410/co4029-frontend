import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  GraduationCap,
  Mail,
  Trash2,
  Users,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAssignTeacher,
  useCourseRoster,
  useCourseTeachers,
  useDeptCourses,
  useRemoveTeacher,
} from "@/lib/api/hooks/dept";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import { ApiError } from "@/lib/api/client";
import type {
  RosterEntry,
  TeacherAssignmentRead,
} from "@/lib/api/types";

const UUID_RX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ENROLLMENT_LABEL: Record<string, string> = {
  active: "Đang học",
  completed: "Hoàn thành",
  dropped: "Đã bỏ",
  pending: "Chờ duyệt",
};

const ENROLLMENT_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-m3-primary-fixed text-m3-primary",
  dropped: "bg-slate-100 text-slate-500",
  pending: "bg-amber-100 text-amber-700",
};

type TabKey = "teachers" | "students";

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
        active
          ? "bg-m3-primary text-white"
          : "bg-surface-muted text-text-muted hover:bg-surface-elev"
      }`}
    >
      {children}
      {typeof count === "number" && (
        <span
          className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
            active ? "bg-white/20" : "bg-surface-elev"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function TeacherRow({
  assignment,
  courseId,
  canManage,
}: {
  assignment: TeacherAssignmentRead;
  courseId: string;
  canManage: boolean;
}) {
  const remove = useRemoveTeacher(courseId);

  const handleRemove = () => {
    if (
      !window.confirm(
        `Gỡ giảng viên ${assignment.display_name || assignment.primary_email}?`,
      )
    ) {
      return;
    }
    remove.mutate(assignment.user_id, {
      onSuccess: () => toast.success("Đã gỡ phân công"),
      onError: (err) => {
        const detail =
          err instanceof ApiError ? err.body || err.message : String(err);
        toast.error(`Không thể gỡ giảng viên: ${detail}`);
      },
    });
  };

  return (
    <div className="flex items-center gap-4 bg-surface-elev border border-border rounded-lg p-4 mb-2">
      <div className="w-9 h-9 rounded-full bg-m3-primary-fixed flex items-center justify-center shrink-0">
        <GraduationCap className="h-4 w-4 text-m3-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-strong truncate">
          {assignment.display_name || "(Chưa đặt tên)"}
        </p>
        <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
          <Mail className="h-3 w-3" />
          <span className="truncate">{assignment.primary_email}</span>
        </p>
      </div>
      {canManage && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleRemove}
          disabled={remove.isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Gỡ
        </Button>
      )}
    </div>
  );
}

function AssignTeacherForm({ courseId }: { courseId: string }) {
  const [userId, setUserId] = useState("");
  const assign = useAssignTeacher(courseId);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = userId.trim();
    if (!UUID_RX.test(trimmed)) {
      toast.error("Vui lòng nhập user_id dạng UUID hợp lệ");
      return;
    }
    assign.mutate(
      { user_id: trimmed },
      {
        onSuccess: () => {
          toast.success("Đã phân công giảng viên");
          setUserId("");
        },
        onError: (err) => {
          const detail =
            err instanceof ApiError ? err.body || err.message : String(err);
          toast.error(`Không thể phân công: ${detail}`);
        },
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-elev border border-border rounded-lg p-4 mb-4"
    >
      <label className="block text-xs font-semibold text-text-muted mb-2">
        Phân công giảng viên (user_id UUID)
      </label>
      <div className="flex gap-2">
        <Input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
          disabled={assign.isPending}
          className="font-mono text-xs"
        />
        <Button type="submit" disabled={assign.isPending || !userId.trim()}>
          <UserPlus className="h-3.5 w-3.5" />
          Thêm
        </Button>
      </div>
      <p className="text-[11px] text-text-muted mt-2">
        Nhập user_id của giảng viên. Tính năng tìm kiếm theo email/tên sẽ được
        bổ sung ở Wave 5.
      </p>
    </form>
  );
}

function StudentRow({ entry }: { entry: RosterEntry }) {
  const cls =
    ENROLLMENT_COLOR[entry.status] ?? "bg-slate-100 text-slate-700";
  const label = ENROLLMENT_LABEL[entry.status] ?? entry.status;
  const enrolled = new Date(entry.enrolled_at).toLocaleDateString("vi-VN");

  return (
    <div className="flex items-center gap-4 bg-surface-elev border border-border rounded-lg p-4 mb-2">
      <div className="w-9 h-9 rounded-full bg-surface-muted flex items-center justify-center shrink-0">
        <Users className="h-4 w-4 text-text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-strong truncate">
          {entry.display_name || entry.primary_email}
        </p>
        <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
          <Mail className="h-3 w-3" />
          <span className="truncate">{entry.primary_email}</span>
        </p>
      </div>
      <div className="text-right shrink-0">
        <span
          className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${cls}`}
        >
          {label}
        </span>
        <p className="text-[11px] text-text-muted mt-1">Đăng ký: {enrolled}</p>
      </div>
    </div>
  );
}

export default function DeptCourseDetailPage() {
  const navigate = useNavigate();
  const { courseId } = useParams({ strict: false }) as { courseId: string };

  const permissions = useMyPermissions();
  const perms = permissions.data?.permissions ?? [];
  const canAssign =
    perms.includes("course.assign_teacher") ||
    perms.includes("system.administer");
  const canRead = canAssign || perms.includes("course.enrollment.read");

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canRead) {
      toast.error("Không có quyền truy cập");
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canRead, navigate]);

  const enabled = !permissions.isLoading && canRead;

  const courses = useDeptCourses();
  const course = courses.data?.find((c) => c.id === courseId);

  const teachers = useCourseTeachers(enabled ? courseId : undefined);
  const roster = useCourseRoster(enabled ? courseId : undefined);

  const [tab, setTab] = useState<TabKey>("teachers");

  if (permissions.isLoading) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-16 bg-surface-muted animate-pulse rounded-lg" />
        <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!canRead) {
    return null;
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link
          to="/dept"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-m3-primary transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quản lý đội ngũ
        </Link>
        <h1 className="text-xl font-headline font-bold text-text-strong">
          {course?.title ?? "Khóa học"}
        </h1>
        {course?.slug && (
          <p className="text-sm text-text-muted mt-1">{course.slug}</p>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <TabButton
          active={tab === "teachers"}
          onClick={() => setTab("teachers")}
          count={teachers.data?.length}
        >
          Giảng viên
        </TabButton>
        <TabButton
          active={tab === "students"}
          onClick={() => setTab("students")}
          count={roster.data?.length}
        >
          Sinh viên
        </TabButton>
      </div>

      {tab === "teachers" && (
        <div>
          {canAssign && <AssignTeacherForm courseId={courseId} />}

          {teachers.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-surface-muted animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : teachers.isError ? (
            <div className="bg-surface-elev border border-border rounded-lg p-5">
              <p className="text-sm text-danger">
                Không thể tải danh sách giảng viên.
              </p>
            </div>
          ) : (teachers.data ?? []).length === 0 ? (
            <div className="bg-surface-elev border border-border rounded-lg p-10 text-center">
              <GraduationCap className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
              <p className="text-sm font-medium text-text-strong">
                Chưa có giảng viên nào được phân công.
              </p>
              {canAssign && (
                <p className="text-xs text-text-muted mt-1">
                  Sử dụng biểu mẫu phía trên để thêm giảng viên.
                </p>
              )}
            </div>
          ) : (
            <div>
              {(teachers.data ?? []).map((t) => (
                <TeacherRow
                  key={t.user_id}
                  assignment={t}
                  courseId={courseId}
                  canManage={canAssign}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "students" && (
        <div>
          {roster.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-surface-muted animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : roster.isError ? (
            <div className="bg-surface-elev border border-border rounded-lg p-5">
              <p className="text-sm text-danger">
                Không thể tải danh sách sinh viên.
              </p>
            </div>
          ) : (roster.data ?? []).length === 0 ? (
            <div className="bg-surface-elev border border-border rounded-lg p-10 text-center">
              <Users className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
              <p className="text-sm font-medium text-text-strong">
                Chưa có sinh viên nào đăng ký khóa học này.
              </p>
            </div>
          ) : (
            <div>
              {(roster.data ?? []).map((entry) => (
                <StudentRow key={entry.enrollment_id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
