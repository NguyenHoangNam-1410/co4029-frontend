import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Đường dẫn"
      data-slot="breadcrumbs"
      className="mb-4 flex flex-wrap items-center gap-2 text-sm text-text-muted"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${i}-${item.label}`}>
            {i > 0 ? (
              <ChevronRight
                className="size-4 text-text-subtle"
                aria-hidden="true"
              />
            ) : null}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="rounded-md px-1 hover:text-text-strong hover:underline focus-visible:outline-2 focus-visible:outline-primary"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={
                  isLast
                    ? "font-medium text-text-strong"
                    : "text-text-muted"
                }
              >
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
