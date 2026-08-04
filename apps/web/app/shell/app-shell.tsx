import { Fragment, useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  AppSidebar,
  type SidebarUser,
  type SidebarWebsite,
} from "~/shell/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/shared/ui/breadcrumb";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/shared/ui/sidebar";

const SIDEBAR_STORAGE_KEY = "aurora-sidebar";

const SEGMENT_LABELS: Record<string, string> = {
  account: "Account",
  analytics: "Analytics",
  edit: "Settings",
};

type Crumb = { label: string; to?: string };

/** Sentence case, so an unmapped segment still reads like the rest of the app. */
function toLabel(segment: string) {
  const words = segment.replace(/[-_]+/g, " ");

  return words.charAt(0).toUpperCase() + words.slice(1);
}

function buildCrumbs(pathname: string, websites: SidebarWebsite[]): Crumb[] {
  const [first, second, third] = pathname.split("/").filter(Boolean);

  if (!first) {
    return [{ label: "Websites" }];
  }

  if (first !== "websites") {
    return [{ label: SEGMENT_LABELS[first] ?? toLabel(first) }];
  }

  const crumbs: Crumb[] = [{ label: "Websites", to: "/" }];

  if (!second) {
    return crumbs;
  }

  if (second === "new") {
    return [...crumbs, { label: "Add website" }];
  }

  const website = websites.find((candidate) => candidate.id === second);
  const label = website?.name ?? "Website";

  // Only link the site once it isn't the destination of that link itself.
  crumbs.push(
    third && third !== "analytics"
      ? { label, to: `/websites/${second}/analytics` }
      : { label }
  );

  if (third) {
    crumbs.push({ label: SEGMENT_LABELS[third] ?? toLabel(third) });
  }

  return crumbs;
}

function ShellBreadcrumb({ websites }: { websites: SidebarWebsite[] }) {
  const { pathname } = useLocation();
  const crumbs = buildCrumbs(pathname, websites);

  return (
    <Breadcrumb className="min-w-0 flex-1">
      <BreadcrumbList className="flex-nowrap">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <Fragment key={`${crumb.to ?? ""}-${crumb.label}`}>
              <BreadcrumbItem className="min-w-0">
                {isLast ? (
                  <BreadcrumbPage className="truncate">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : crumb.to ? (
                  <BreadcrumbLink
                    className="truncate"
                    render={<Link to={crumb.to} />}
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  <span className="truncate">{crumb.label}</span>
                )}
              </BreadcrumbItem>

              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function AppShell({
  user,
  websites,
  children,
}: {
  user: SidebarUser;
  websites: SidebarWebsite[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  // Read after hydration rather than during render: the server has no
  // localStorage, and a mismatched first render would swap the layout under
  // the user.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);

      if (stored !== null) {
        setOpen(stored === "true");
      }
    } catch {
      // Private-mode storage failures just mean the default state.
    }
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);

    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    } catch {
      // See above: the toggle still works, it just won't be remembered.
    }
  }, []);

  return (
    <SidebarProvider open={open} onOpenChange={handleOpenChange}>
      <AppSidebar user={user} websites={websites} />

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:rounded-t-xl">
          <SidebarTrigger className="-ml-1" />
          <ShellBreadcrumb websites={websites} />
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
