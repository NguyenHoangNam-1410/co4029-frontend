import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Building2, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useCreateOrganization,
  useOrganizations,
} from "@/lib/api/hooks/admin-organizations";
import type {
  OrganizationRead,
  OrganizationStatus,
} from "@/lib/api/types/admin-organizations";

const STATUS_LABEL: Record<OrganizationStatus, string> = {
  active: "Đang hoạt động",
  inactive: "Tạm ngưng",
  archived: "Lưu trữ",
};

const STATUS_COLOR: Record<OrganizationStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-amber-100 text-amber-700",
  archived: "bg-slate-100 text-slate-600",
};

function StatusBadge({ status }: { status: string }) {
  const key = status as OrganizationStatus;
  const label = STATUS_LABEL[key] ?? status;
  const cls = STATUS_COLOR[key] ?? "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${cls}`}
    >
      {label}
    </span>
  );
}

function OrgRow({ org }: { org: OrganizationRead }) {
  return (
    <Link
      to="/admin/organizations/$orgId"
      params={{ orgId: org.id }}
      className="block bg-surface-elev border border-border rounded-lg p-4 mb-2 hover:border-border-strong hover:shadow-editorial transition-colors duration-150"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-primary truncate">{org.name}</p>
            <StatusBadge status={org.status} />
          </div>
          <p className="text-xs text-secondary mt-0.5 truncate">
            slug: <span className="font-mono">{org.slug}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

function CreateOrgDialog({ onClose }: { onClose: () => void }) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [orgStatus, setOrgStatus] = useState<OrganizationStatus>("active");
  const create = useCreateOrganization();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ slug, name, status: orgStatus });
      toast.success("Tạo tổ chức thành công");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tạo thất bại";
      toast.error(msg);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-surface-elev rounded-lg shadow-elevated p-6 w-full max-w-md"
      >
        <h2 className="text-lg font-semibold mb-4">Tổ chức mới</h2>
        <label className="block mb-3">
          <span className="text-sm font-medium">
            Slug <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            pattern="^[a-z0-9][a-z0-9-]*$"
            placeholder="vd: hutech, hcmut"
            className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm font-mono"
          />
          <span className="text-xs text-secondary">
            Chỉ chữ thường, số, và dấu gạch ngang.
          </span>
        </label>
        <label className="block mb-3">
          <span className="text-sm font-medium">
            Tên <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="block mb-4">
          <span className="text-sm font-medium">Trạng thái</span>
          <select
            value={orgStatus}
            onChange={(e) =>
              setOrgStatus(e.target.value as OrganizationStatus)
            }
            className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm ngưng</option>
            <option value="archived">Lưu trữ</option>
          </select>
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-border hover:bg-surface"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {create.isPending ? "Đang tạo..." : "Tạo"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminOrganizationsPage() {
  const { t: _t } = useTranslation();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const { data: orgs, isLoading, error } = useOrganizations({ limit: 200 });

  const filtered = (orgs ?? []).filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Tổ chức
          </h1>
          <p className="text-sm text-secondary mt-1">
            Quản lý các tổ chức (trường, doanh nghiệp) trên hệ thống.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tổ chức mới
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc slug..."
          className="w-full pl-10 pr-3 py-2 border border-border rounded-md text-sm"
        />
      </div>

      {isLoading ? (
        <p className="text-secondary text-sm">Đang tải...</p>
      ) : error ? (
        <p className="text-red-600 text-sm">
          Lỗi: {error instanceof Error ? error.message : "Không tải được"}
        </p>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-secondary" />
          <p className="text-secondary">
            {search
              ? "Không tìm thấy tổ chức nào khớp."
              : "Chưa có tổ chức nào."}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-xs text-secondary mb-2">
            {filtered.length} tổ chức
          </p>
          {filtered.map((org) => (
            <OrgRow key={org.id} org={org} />
          ))}
        </div>
      )}

      {showCreate && <CreateOrgDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
