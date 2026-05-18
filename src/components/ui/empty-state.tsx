import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";

type EmptyStateProps = {
  icon: ComponentType<LucideProps>;
  title: string;
  description?: string;
  cta?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={
        "flex flex-col items-center justify-center py-16 px-6 text-center" +
        (className ? ` ${className}` : "")
      }
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-surface-muted">
        <Icon className="size-7 text-text-muted" />
      </div>
      <h3 className="font-heading text-lg text-text-strong mb-1">{title}</h3>
      {description ? (
        <p className="text-sm text-text-muted mb-4 max-w-md">{description}</p>
      ) : null}
      {cta ? <div className="mt-2">{cta}</div> : null}
    </div>
  );
}
