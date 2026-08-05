import { CookieIcon, DatabaseIcon, Share2Icon } from "lucide-react";
import { Logo } from "~/shared/components/logo";
import { ThemeToggle } from "~/shell/theme-toggle";
import { cn } from "~/shared/lib/utils";

/**
 * The two unauthenticated pages — /signin and /signup — share this frame: a
 * brand rail on the left, the form on the right.
 *
 * The rail is scoped `dark` in both themes rather than following the toggle.
 * It carries the aurora itself, and an aurora needs a night sky: the same
 * gradient over the light theme's near-white --sidebar reads as a smear. The
 * class is the existing theme scope, so every token inside it (--sidebar, the
 * chart ramp, --muted-foreground) resolves to its dark value without a single
 * hard-coded colour.
 */

type Highlight = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail: string;
};

/** The three things that are true of every instance, in both auth pages. */
export const AUTH_HIGHLIGHTS: Highlight[] = [
  {
    icon: CookieIcon,
    label: "No cookies, no consent banner",
    detail: "Visitors are counted without storing anything on their device.",
  },
  {
    icon: DatabaseIcon,
    label: "Every pageview in your own Postgres",
    detail: "Raw events stay in the database this instance points at.",
  },
  {
    icon: Share2Icon,
    label: "A public dashboard link per site",
    detail: "Turn sharing on for one site without exposing the others.",
  },
];

/**
 * The aurora, built from the chart ramp — chart-2 violet and chart-1 indigo are
 * the nitrogen emission lines, chart-3 and chart-5 the oxygen ones, which is
 * the order they stack in the sky and the order they stack here.
 *
 * Each band carries a resting opacity as a class as well as in the keyframes:
 * the reduced-motion rule in app.css collapses the animation instead of
 * removing it, and a band reverts to its class-defined state once it stops.
 */
function Aurora() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute -top-[22%] -left-[18%] h-[62%] w-[88%] rotate-[-14deg] rounded-[50%] bg-[radial-gradient(closest-side,var(--chart-2),transparent)] opacity-70 blur-[90px] animate-aurora" />

      <div className="absolute top-[16%] -right-[24%] h-[56%] w-[84%] rotate-[11deg] rounded-[50%] bg-[radial-gradient(closest-side,var(--chart-3),transparent)] opacity-55 blur-[100px] animate-aurora-slow" />

      <div className="absolute -bottom-[12%] -left-[14%] h-[52%] w-[92%] rotate-[6deg] rounded-[50%] bg-[radial-gradient(closest-side,var(--chart-5),transparent)] opacity-40 blur-[110px] animate-aurora [animation-delay:-9s]" />

      <div className="absolute top-[34%] left-[10%] h-[42%] w-[60%] rounded-[50%] bg-[radial-gradient(closest-side,var(--chart-1),transparent)] opacity-60 blur-[80px] animate-aurora-slow [animation-delay:-14s]" />

      {/* Faint measurement grid — texture, and a nod to what the app is for. */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,color-mix(in_oklch,var(--foreground)_14%,transparent)_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />

      {/* Scrim over the corner the copy sits in, so the glow never fights it. */}
      <div className="absolute inset-0 bg-[radial-gradient(115%_95%_at_0%_100%,color-mix(in_oklch,var(--sidebar)_88%,transparent)_5%,color-mix(in_oklch,var(--sidebar)_42%,transparent)_42%,transparent_72%)]" />
    </div>
  );
}

export function AuthAside({
  title,
  description,
  highlights = AUTH_HIGHLIGHTS,
}: {
  title: string;
  description: string;
  highlights?: Highlight[];
}) {
  return (
    <aside className="dark relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:border-r xl:p-14">
      <Aurora />

      <div className="relative flex items-center gap-2.5">
        <Logo className="size-8" />
        <span className="text-xl font-semibold tracking-tight">Aurora</span>
      </div>

      <div className="relative flex max-w-xl flex-col gap-10">
        <div className="flex flex-col gap-4">
          <h2 className="font-heading text-3xl leading-[1.1] font-semibold tracking-tight text-balance xl:text-4xl">
            {title}
          </h2>
          <p className="text-base leading-relaxed text-pretty text-muted-foreground xl:text-lg">
            {description}
          </p>
        </div>

        <ul className="flex flex-col gap-5">
          {highlights.map(({ icon: Icon, label, detail }) => (
            <li key={label} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" />

              <div className="space-y-0.5">
                <p className="text-base font-medium">{label}</p>
                <p className="text-sm text-muted-foreground">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-sm text-muted-foreground">
        Open source, self-hosted, and yours to run.
      </p>
    </aside>
  );
}

export function AuthLayout({
  aside,
  className,
  children,
}: {
  aside: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      {aside}

      <div className="relative flex flex-col justify-center bg-background px-4 py-20 md:px-8">
        {/* Absolute, so the form is centred against the column and not against
            whatever is left under a header. */}
        <div className="absolute top-4 left-4 flex items-center gap-2.5 md:top-6 md:left-6 lg:hidden">
          <Logo className="size-7" />
          <span className="text-lg font-semibold tracking-tight">Aurora</span>
        </div>

        <div className="absolute top-4 right-4 md:top-6 md:right-6">
          <ThemeToggle />
        </div>

        <div className={cn("mx-auto w-full max-w-sm", className)}>
          {children}
        </div>
      </div>
    </main>
  );
}

/** The heading pair every auth form opens with. */
export function AuthHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
