import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Construction } from "lucide-react";

export default function AdminUserDetailStubPage() {
  const params = useParams({ strict: false }) as { userId?: string };
  const userId = params.userId ?? "";

  return (
    <div className="space-y-6 pb-12">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <div className="bg-surface-elev border border-border rounded-xl p-10 text-center">
        <Construction className="h-12 w-12 mx-auto mb-4 text-text-subtle" />
        <h1 className="text-lg font-headline font-bold text-text-strong">
          Đang xây dựng — coming in Wave 4
        </h1>
        <p className="text-sm text-text-muted mt-2">
          Chi tiết người dùng sẽ có trong giai đoạn tới.
        </p>
        <p className="text-xs text-text-subtle mt-4 font-mono">
          ID: {userId}
        </p>
      </div>
    </div>
  );
}
