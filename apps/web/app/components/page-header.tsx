import { cn } from "~/lib/utils";

export function Page({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // min-w-0 keeps wide children (tables, charts) inside their own scroll
  // container instead of widening the page.
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-4", className)}>
      {children}
    </div>
  );
}

export function PageHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
      {children}
    </div>
  );
}

/**
 * Groups the title with its description so `PageHeader` stays a two-column
 * row: heading on one side, actions on the other.
 */
export function PageHeading({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-1">{children}</div>;
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-lg font-semibold tracking-tight">{children}</h1>;
}

export function PageDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function PageActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}
