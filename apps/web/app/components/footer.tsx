import { Logo } from "~/components/logo";

export function Footer() {
  return (
    <footer className="space-y-4 pt-12 md:pt-16">
      <Logo className="h-12 w-12" />

      <p className="text-muted-foreground text-sm">
        &copy; {new Date().getFullYear()} Aurora, Open Web Analytics.
        <br />
        All rights reserved.
      </p>
    </footer>
  );
}
