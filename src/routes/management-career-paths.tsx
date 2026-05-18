import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe, useMyPermissions } from "@/lib/api/hooks/auth";
import {
  useCreateCareerPath,
  useListManagedCareerPaths,
} from "@/lib/api/hooks/career-paths";
import type { CareerPathAuthoring } from "@/lib/api/types";

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

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLOR[status] ?? "bg-slate-100 text-slate-700";
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${cls}`}
    >
      {label}
    </span>
  );
}

function PathRow({ path }: { path: CareerPathAuthoring }) {
  return (
    <Link
      to="/management/career-paths/$id"
      params={{ id: path.id }}
      className="block group"
    >
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card ghost-border hover:shadow-editorial transition-all duration-200 cursor-pointer">
        <div className="w-10 h-10 rounded-lg bg-m3-primary-fixed flex items-center justify-center shrink-0">
          <GraduationCap className="h-5 w-5 text-m3-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-m3-on-surface truncate">
            {path.name}
          </p>
          <p className="text-[11px] text-m3-on-surface-variant truncate font-mono mt-0.5">
            {path.slug}
          </p>
        </div>
        <StatusBadge status={path.status} />
        <ArrowRight className="h-4 w-4 text-m3-on-surface-variant shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

function CreateDialog({
  organizationId,
  onClose,
}: {
  organizationId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const create = useCreateCareerPath();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  function slugify(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Hãy nhập tên và slug");
      return;
    }
    create.mutate(
      {
        organization_id: organizationId,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: (path) => {
          toast.success("Đã tạo lộ trình mới");
          void navigate({
            to: "/management/career-paths/$id",
            params: { id: path.id },
          });
        },
        onError: (err) =>
          toast.error((err as Error).message || "Tạo lộ trình thất bại"),
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
            Tạo lộ trình mới
          </h2>
          <p className="text-xs text-m3-on-surface-variant mt-1">
            Lộ trình sẽ được tạo dưới trạng thái <strong>Bản nháp</strong>.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Tên <span className="text-red-600">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="ví dụ: Lộ trình Kỹ sư Phần mềm"
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Slug <span className="text-red-600">*</span>
          </label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="vi-du-lo-trinh-ky-su-phan-mem"
            className="font-mono text-sm"
            required
          />
          <p className="text-[11px] text-m3-on-surface-variant">
            Dùng trong URL của lộ trình. Phải là duy nhất trong tổ chức.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Mô tả
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Mô tả ngắn về lộ trình…"
            className="w-full px-3 py-2 text-sm bg-m3-surface-container-low border border-m3-outline-variant/30 rounded-xl text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary/30 placeholder:text-m3-on-surface-variant/40"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={create.isPending}
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={create.isPending}
            className="gap-2"
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Tạo
          </Button>
        </div>
      </form>
    </div>
  );
}

const FALLBACK_ORG_ID = "00000000-0000-0000-0000-000000000001";

export default function ManagementCareerPathsPage() {
  const navigate = useNavigate();
  const me = useMe();
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

  const meAny = me.data as { organization_id?: string } | undefined;
  const organizationId = meAny?.organization_id ?? FALLBACK_ORG_ID;

  const [includeArchived, setIncludeArchived] = useState(false);
  const [creating, setCreating] = useState(false);

  const enabled = !permissions.isLoading && canManage;
  const list = useListManagedCareerPaths({
    organizationId,
    includeArchived,
    enabled,
  });

  if (permissions.isLoading || !enabled) {
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

  const paths = list.data ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 space-y-6">
      <div className="flex items-center gap-3 pt-2">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-m3-on-surface tracking-tight">
            Quản lý lộ trình
          </h1>
          <p className="text-xs text-m3-on-surface-variant mt-0.5">
            Tạo, xuất bản và lưu trữ lộ trình nghề nghiệp.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreating(true)}
          className="gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Tạo lộ trình mới
        </Button>
      </div>

      <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
          className="h-4 w-4 rounded border-m3-outline-variant accent-m3-primary cursor-pointer"
        />
        <span className="text-m3-on-surface font-medium">
          Hiện đã lưu trữ
        </span>
      </label>

      {list.isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-m3-surface-container animate-pulse rounded-xl"
            />
          ))}
        </div>
      )}

      {list.isError && (
        <div className="rounded-xl bg-m3-error-container border border-m3-error/20 p-6 text-center">
          <p className="text-m3-on-error-container text-sm font-semibold">
            Không thể tải danh sách lộ trình
          </p>
        </div>
      )}

      {!list.isLoading && !list.isError && paths.length === 0 && (
        <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-10 text-center">
          <GraduationCap className="h-8 w-8 mx-auto mb-3 text-m3-outline" />
          <p className="text-sm font-medium text-m3-on-surface">
            Chưa có lộ trình nào.
          </p>
          <p className="text-xs text-m3-on-surface-variant mt-1">
            Bấm <strong>Tạo lộ trình mới</strong> để bắt đầu.
          </p>
        </div>
      )}

      {!list.isLoading && !list.isError && paths.length > 0 && (
        <div className="space-y-2">
          {paths.map((p) => (
            <PathRow key={p.id} path={p} />
          ))}
        </div>
      )}

      {creating && (
        <CreateDialog
          organizationId={organizationId}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
