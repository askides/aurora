import { Logo } from "~/shared/components/logo";
import { ThemeToggle } from "~/shell/theme-toggle";
import { Badge } from "~/shared/ui/badge";

/**
 * The frame an anonymous viewer of a shared dashboard gets.
 *
 * Its own file, and not a second export of app-shell.tsx, because that module
 * imports AppSidebar: Rollup emitted one shared chunk for the two shells, so
 * /websites/:id/s/analytics — a page with no session and no navigation —
 * downloaded the sidebar, the account menu and the add-website sheet along with
 * this header. Measured at 21KB against the route\'s own 767 bytes.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-sidebar">
      <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-sidebar/80 px-4 backdrop-blur md:px-6">
        <Logo className="size-5 shrink-0" />
        <span className="text-sm font-semibold tracking-tight">Aurora</span>

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline">Public dashboard</Badge>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 flex-col bg-background">
        <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-4 p-4 md:p-6">
          {children}
        </main>

        <div className="mx-auto w-full max-w-[90rem] px-4 pb-4 md:px-6 md:pb-6">
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <a
              href="https://github.com/itsrennyman/aurora"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Aurora
            </a>{" "}
            — cookie-free analytics.
          </p>
        </div>
      </div>
    </div>
  );
}
