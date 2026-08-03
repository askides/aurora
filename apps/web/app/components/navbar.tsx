import { Home, LogOut, User } from "lucide-react";
import { Form, Link } from "react-router";
import { Logo } from "~/components/logo";
import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";

function NavbarLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      render={<Link to={to} />}
    >
      {icon}
    </Button>
  );
}

export function Navbar({ isPublic = false }: { isPublic?: boolean }) {
  return (
    <nav className="bg-card fixed inset-y-0 left-0 hidden w-20 flex-col items-center justify-between border-r py-5 shadow-xs md:flex">
      <Link to={isPublic ? "#" : "/"} aria-label="Aurora home">
        <Logo className="h-11 w-11" />
      </Link>

      {!isPublic && (
        <div className="flex flex-col items-center gap-4">
          <NavbarLink to="/" icon={<Home />} label="Home" />
          <NavbarLink to="/account" icon={<User />} label="Account" />

          <Form method="post" action="/logout">
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Log out"
            >
              <LogOut />
            </Button>
          </Form>
        </div>
      )}

      <ThemeToggle />
    </nav>
  );
}
