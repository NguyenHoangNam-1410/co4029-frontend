import { Link } from "@tanstack/react-router";
import { BookOpen, GraduationCap, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import {
  useCareerPaths,
  useMyCareerEnrollments,
} from "@/lib/api/hooks/career-paths";
import type { CareerPathPublic } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const CARD_GRADIENTS = [
  "from-blue-500 via-blue-700 to-blue-800",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-pink-500 via-rose-500 to-orange-500",
  "from-amber-500 via-orange-500 to-red-500",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-blue-500 via-blue-600 to-sky-500",
];

function PathCard({
  path,
  index,
  enrolled,
}: {
  path: CareerPathPublic;
  index: number;
  enrolled: boolean;
}) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  return (
    <Link
      to="/career-paths/$slug"
      params={{ slug: path.slug }}
      className="group block"
    >
      <div className="bg-card rounded-xl overflow-hidden shadow-editorial ghost-border transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-glass h-full flex flex-col cursor-pointer">
        <div className="relative aspect-video overflow-hidden shrink-0">
          <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <Badge className="absolute top-3 left-3 z-10 bg-black/40 text-white border border-white/20 backdrop-blur-sm text-[10px] font-semibold tracking-wide">
            <Sparkles className="h-2.5 w-2.5 mr-1" />
            Lộ trình nghề nghiệp
          </Badge>
          {enrolled && (
            <Badge className="absolute top-3 right-3 z-10 bg-emerald-500/90 text-white border border-white/20 backdrop-blur-sm text-[10px] font-semibold tracking-wide">
              Đã đăng ký
            </Badge>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-25 group-hover:opacity-40 transition-opacity">
            <GraduationCap className="h-16 w-16 text-white" />
          </div>
        </div>

        <div className="p-4 space-y-3 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="font-headline font-semibold text-sm text-m3-on-surface line-clamp-2 leading-snug">
              {path.name}
            </h3>
            {path.description && (
              <p className="text-xs text-m3-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
                {path.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-m3-on-surface-variant">
            <BookOpen className="h-3 w-3" />
            <span>
              <strong>{path.courses.length}</strong> khóa học
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl ghost-border overflow-hidden">
      <div className="aspect-video bg-m3-surface-container animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-m3-surface-container animate-pulse rounded-lg w-3/4" />
        <div className="h-3 bg-m3-surface-container animate-pulse rounded-lg w-1/2" />
      </div>
    </div>
  );
}

export default function CareerPathsPage() {
  const list = useCareerPaths();
  const myEnrollments = useMyCareerEnrollments();

  const enrolledIds = new Set(
    (myEnrollments.data ?? []).map((e) => e.career_path_id),
  );
  const items = list.data ?? [];

  return (
    <div className="relative min-h-screen bg-m3-surface pb-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <header className="pt-2">
          <div className="flex items-center gap-3 mb-2">
            <AIInsightChip pulse>LỘ TRÌNH NGHỀ NGHIỆP</AIInsightChip>
          </div>
          <h1 className="font-headline font-black text-4xl sm:text-5xl text-m3-on-surface leading-none tracking-tight">
            Định hình tương lai.
          </h1>
          <p className="mt-3 text-m3-on-surface-variant text-base sm:text-lg max-w-xl">
            Khám phá các lộ trình nghề nghiệp được thiết kế bởi đội ngũ chuyên gia
            của tổ chức.
          </p>
        </header>

        <section className="space-y-5 pb-4">
          <SectionHeader
            title="Lộ trình hiện có"
            subtitle="Các lộ trình đã xuất bản trong tổ chức của bạn"
          />

          {list.isError && (
            <div className="rounded-xl bg-m3-error-container border border-m3-error/20 p-6 text-center">
              <p className="text-m3-on-error-container text-sm font-semibold">
                Không thể tải danh sách lộ trình
              </p>
              <p className="text-m3-on-error-container/70 text-xs mt-1">
                {String(list.error)}
              </p>
            </div>
          )}

          {list.isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {!list.isLoading && !list.isError && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-m3-surface-container flex items-center justify-center">
                <GraduationCap className="h-7 w-7 text-m3-outline" />
              </div>
              <p className="font-headline font-semibold text-m3-on-surface text-lg">
                Chưa có lộ trình nào trong tổ chức của bạn
              </p>
              <p className="text-sm text-m3-on-surface-variant max-w-xs">
                Khi quản lý xuất bản lộ trình mới, danh sách sẽ xuất hiện tại
                đây.
              </p>
            </div>
          )}

          {!list.isLoading && !list.isError && items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {items.map((p, i) => (
                <PathCard
                  key={p.id}
                  path={p}
                  index={i}
                  enrolled={enrolledIds.has(p.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
