import { cn } from "~/lib/utils";

export function Page({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-1 flex-col gap-6", className)}>
      {children}
    </div>
  );
}

export function PageHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
      {children}
    </div>
  );
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-3xl font-semibold tracking-tight">{children}</h1>;
}

export function PageActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3">{children}</div>;
}
