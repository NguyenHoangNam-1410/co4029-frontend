import { useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  Globe,
  Layers,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCreateDomain,
  useCreateOrgUnit,
  useDeleteDomain,
  useDeleteOrgUnit,
  useOrganization,
  useOrganizationDomains,
  useOrganizationMemberships,
  useOrgUnits,
  usePatchOrganization,
} from "@/lib/api/hooks/admin-organizations";
import type {
  OrganizationStatus,
  UnitType,
} from "@/lib/api/types/admin-organizations";

type TabKey = "info" | "domains" | "units" | "memberships";

const TAB_LABEL: Record<TabKey, string> = {
  info: "Thông tin",
  domains: "Tên miền",
  units: "Đơn vị",
  memberships: "Thành viên",
};

const STATUS_LABEL: Record<OrganizationStatus, string> = {
  active: "Đang hoạt động",
  inactive: "Tạm ngưng",
  archived: "Lưu trữ",
};

const UNIT_TYPE_LABEL: Record<UnitType, string> = {
  faculty: "Khoa",
  department: "Bộmôn / phòng ban",
  office: "Văn phòng",
  program: "Chương trình",
  campus: "Cơ sở",
  other: "Khác",
};

function InfoTab({ orgId }: { orgId: string }) {
  const { data: org } = useOrganization(orgId);
  const patch = usePatchOrganization(orgId);
  const [name, setName] = useState(org?.name ?? "");
  const [orgStatus, setOrgStatus] = useState<OrganizationStatus | "">(
    (org?.status as OrganizationStatus) ?? "",
  );

  if (!org) return <p className="text-secondary text-sm">Đang tải...</p>;

  async function handleSave() {
    try {
      await patch.mutateAsync({
        name: name || undefined,
        status: (orgStatus || undefined) as OrganizationStatus | undefined,
      });
      toast.success("Đã cập nhật tổ chức");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cập nhật thất bại");
    }
  }

  return (
    <div className="bg-surface-elev border border-border rounded-lg p-6">
      <dl className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <dt className="text-xs text-secondary">Slug</dt>
          <dd className="font-mono text-sm">{org.slug}</dd>
        </div>
        <div>
          <dt className="text-xs text-secondary">ID</dt>
          <dd className="font-mono text-xs break-all">{org.id}</dd>
        </div>
        <div>
          <dt className="text-xs text-secondary">Tạo lúc</dt>
          <dd className="text-sm">
            {new Date(org.created_at).toLocaleString("vi-VN")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-secondary">Cập nhật</dt>
          <dd className="text-sm">
            {new Date(org.updated_at).toLocaleString("vi-VN")}
          </dd>
        </div>
      </dl>

      <div className="border-t border-border pt-4 space-y-3">
        <label className="block">
          <span className="text-sm font-medium">Tên</span>
          <input
            type="text"
            value={name || org.name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Trạng thái</span>
          <select
            value={orgStatus || org.status}
            onChange={(e) =>
              setOrgStatus(e.target.value as OrganizationStatus)
            }
            className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm"
          >
            {(Object.keys(STATUS_LABEL) as OrganizationStatus[]).map((k) => (
              <option key={k} value={k}>
                {STATUS_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={patch.isPending}
          className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {patch.isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
}

function DomainsTab({ orgId }: { orgId: string }) {
  const { data: domains, isLoading } = useOrganizationDomains(orgId);
  const create = useCreateDomain(orgId);
  const remove = useDeleteDomain(orgId);
  const [domain, setDomain] = useState("");
  const [autoProvision, setAutoProvision] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ domain, auto_provision: autoProvision });
      setDomain("");
      setAutoProvision(false);
      toast.success("Đã thêm tên miền");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thêm thất bại");
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Xóa tên miền này?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Đã xóa");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xóa thất bại");
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleAdd}
        className="bg-surface-elev border border-border rounded-lg p-4 flex flex-wrap items-end gap-3"
      >
        <label className="flex-1 min-w-[200px]">
          <span className="text-sm font-medium">Tên miền</span>
          <input
            type="text"
            required
            value={domain}
            onChange={(e) => setDomain(e.target.value.toLowerCase())}
            placeholder="example.edu.vn"
            className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoProvision}
            onChange={(e) => setAutoProvision(e.target.checked)}
          />
          Auto-provision khi đăng ký
        </label>
        <button
          type="submit"
          disabled={create.isPending}
          className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Thêm
        </button>
      </form>

      {isLoading ? (
        <p className="text-secondary text-sm">Đang tải...</p>
      ) : (domains ?? []).length === 0 ? (
        <div className="bg-surface-elev border border-border rounded-lg p-6 text-center">
          <Globe className="w-10 h-10 mx-auto mb-2 text-secondary" />
          <p className="text-secondary text-sm">Chưa có tên miền nào.</p>
        </div>
      ) : (
        <ul className="bg-surface-elev border border-border rounded-lg divide-y divide-border">
          {(domains ?? []).map((d) => (
            <li
              key={d.id}
              className="px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-mono text-sm">{d.domain}</p>
                {d.auto_provision && (
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Auto-provision
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(d.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                aria-label="Xóa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UnitsTab({ orgId }: { orgId: string }) {
  const { data: units, isLoading } = useOrgUnits(orgId);
  const create = useCreateOrgUnit(orgId);
  const remove = useDeleteOrgUnit(orgId);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [unitType, setUnitType] = useState<UnitType>("department");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({
        unit_type: unitType,
        name,
        code: code || null,
        parent_unit_id: null,
      });
      setName("");
      setCode("");
      toast.success("Đã thêm đơn vị");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thêm thất bại");
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Xóa đơn vị này?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Đã xóa");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xóa thất bại");
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleAdd}
        className="bg-surface-elev border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3"
      >
        <label className="col-span-1">
          <span className="text-sm font-medium">Loại</span>
          <select
            value={unitType}
            onChange={(e) => setUnitType(e.target.value as UnitType)}
            className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm"
          >
            {(Object.keys(UNIT_TYPE_LABEL) as UnitType[]).map((k) => (
              <option key={k} value={k}>
                {UNIT_TYPE_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-1">
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
        <label className="col-span-1">
          <span className="text-sm font-medium">Mã</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="vd: CNTT"
            className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm font-mono"
          />
        </label>
        <button
          type="submit"
          disabled={create.isPending}
          className="self-end px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Thêm
        </button>
      </form>

      {isLoading ? (
        <p className="text-secondary text-sm">Đang tải...</p>
      ) : (units ?? []).length === 0 ? (
        <div className="bg-surface-elev border border-border rounded-lg p-6 text-center">
          <Layers className="w-10 h-10 mx-auto mb-2 text-secondary" />
          <p className="text-secondary text-sm">Chưa có đơn vị nào.</p>
        </div>
      ) : (
        <ul className="bg-surface-elev border border-border rounded-lg divide-y divide-border">
          {(units ?? []).map((u) => (
            <li
              key={u.id}
              className="px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-sm">
                  {u.name}
                  {u.code && (
                    <span className="ml-2 text-xs text-secondary font-mono">
                      [{u.code}]
                    </span>
                  )}
                </p>
                <p className="text-xs text-secondary mt-0.5">
                  {UNIT_TYPE_LABEL[u.unit_type as UnitType] ?? u.unit_type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(u.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                aria-label="Xóa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MembershipsTab({ orgId }: { orgId: string }) {
  const { data: members, isLoading } = useOrganizationMemberships(orgId);

  return (
    <div>
      {isLoading ? (
        <p className="text-secondary text-sm">Đang tải...</p>
      ) : (members ?? []).length === 0 ? (
        <div className="bg-surface-elev border border-border rounded-lg p-6 text-center">
          <Users className="w-10 h-10 mx-auto mb-2 text-secondary" />
          <p className="text-secondary text-sm">
            Chưa có thành viên nào trong tổ chức này.
          </p>
        </div>
      ) : (
        <ul className="bg-surface-elev border border-border rounded-lg divide-y divide-border">
          {(members ?? []).map((m) => (
            <li key={m.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs break-all">
                    user_id: {m.user_id}
                  </p>
                  <p className="text-xs text-secondary mt-0.5">
                    Trạng thái: {m.status}
                    {m.student_code && ` | MSSV: ${m.student_code}`}
                    {m.employee_code && ` | MSNV: ${m.employee_code}`}
                  </p>
                </div>
                <span className="text-xs text-secondary">
                  Tham gia: {new Date(m.joined_at).toLocaleDateString("vi-VN")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminOrganizationDetailPage() {
  const { orgId } = useParams({ strict: false });
  const [tab, setTab] = useState<TabKey>("info");
  const { data: org } = useOrganization(orgId);

  if (!orgId) return null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <Link
        to="/admin/organizations"
        className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại
      </Link>

      <div className="flex items-start gap-3 mb-6">
        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{org?.name ?? "Đang tải..."}</h1>
          {org && (
            <p className="text-sm text-secondary mt-0.5">
              <span className="font-mono">{org.slug}</span>
              <span className="mx-2">•</span>
              <span>
                {STATUS_LABEL[org.status as OrganizationStatus] ?? org.status}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="border-b border-border mb-6 flex gap-1">
        {(Object.keys(TAB_LABEL) as TabKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            {TAB_LABEL[key]}
          </button>
        ))}
      </div>

      {tab === "info" && <InfoTab orgId={orgId} />}
      {tab === "domains" && <DomainsTab orgId={orgId} />}
      {tab === "units" && <UnitsTab orgId={orgId} />}
      {tab === "memberships" && <MembershipsTab orgId={orgId} />}
    </div>
  );
}
