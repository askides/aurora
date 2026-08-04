import {
  ChartNoAxesColumn,
  ChevronsUpDown,
  LayoutGrid,
  LogOut,
  Plus,
  Settings2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Form, Link, useLocation, useParams } from "react-router";
import { AddWebsiteSheet } from "~/components/add-website-sheet";
import { Logo } from "~/components/logo";
import { ThemeToggle } from "~/components/theme-toggle";
import { initials } from "~/lib/format";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "~/components/ui/sidebar";

export type SidebarUser = {
  firstname: string;
  lastname: string;
  email: string;
};

export type SidebarWebsite = {
  id: string;
  name: string;
  url: string;
};

/**
 * The layout that renders this sidebar has no `:id` of its own, so `useParams`
 * cannot see the child route's param. The pathname is the fallback source of
 * truth for which site is being looked at.
 */
function useSelectedWebsiteId(): string | null {
  const params = useParams();
  const { pathname } = useLocation();

  return params.id ?? pathname.match(/^\/websites\/([^/]+)\//)?.[1] ?? null;
}

function NavItem({
  to,
  label,
  icon: Icon,
  isActive,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={label}
        render={<Link to={to} />}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

const SUB_ITEM = [
  "h-7 translate-x-0 gap-2 text-sidebar-foreground/65",
  "hover:bg-transparent hover:text-sidebar-foreground",
  "data-active:bg-transparent data-active:font-medium data-active:text-sidebar-foreground",
  "[&>svg]:text-current data-active:[&>svg]:text-primary",
].join(" ");

/**
 * One row per site, with the selected site's pages nested underneath.
 *
 * Every site is one click away and the list doubles as the "how much do I have"
 * answer — which is the whole reason this isn't a dropdown.
 */
function WebsiteItem({
  website,
  isSelected,
  pathname,
}: {
  website: SidebarWebsite;
  isSelected: boolean;
  pathname: string;
}) {
  const analytics = `/websites/${website.id}/analytics`;
  const settings = `/websites/${website.id}/edit`;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isSelected}
        tooltip={website.name}
        render={<Link to={analytics} />}
      >
        {/*
         * Outlined rather than filled so the letter carries the same visual
         * weight as the stroked lucide icons it sits in a column with, at
         * exactly the icons' 16px box.
         */}
        <span className="flex size-4 shrink-0 items-center justify-center rounded-[0.25rem] border border-sidebar-border text-[0.625rem] leading-none font-semibold">
          {initials(website.name, 1)}
        </span>
        <span className="truncate">{website.name}</span>
      </SidebarMenuButton>

      {isSelected && (
        // No rail and no filled pill: the sub-items hang directly under the
        // site's label, and the current one is marked by weight and a tinted
        // icon rather than another block of background.
        <SidebarMenuSub className="mx-0 mt-0 gap-0 border-none py-0 pr-0 pl-3">
          <SidebarMenuSubItem>
            <SidebarMenuSubButton
              size="sm"
              isActive={pathname === analytics}
              className={SUB_ITEM}
              render={<Link to={analytics} />}
            >
              <ChartNoAxesColumn />
              <span>Analytics</span>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>

          <SidebarMenuSubItem>
            <SidebarMenuSubButton
              size="sm"
              isActive={pathname === settings}
              className={SUB_ITEM}
              render={<Link to={settings} />}
            >
              <Settings2 />
              <span>Settings</span>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

function UserMenu({ user }: { user: SidebarUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            aria-label="Account menu"
            className="flex-1 data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg text-xs font-medium">
                {initials(`${user.firstname} ${user.lastname}`)}
              </AvatarFallback>
            </Avatar>

            <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
              <span className="truncate text-sm font-medium">
                {user.firstname} {user.lastname}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </span>

            <ChevronsUpDown className="ml-auto shrink-0 text-muted-foreground" />
          </SidebarMenuButton>
        }
      />

      <DropdownMenuContent align="start" side="top" className="min-w-56">
        <DropdownMenuItem render={<Link to="/account" />}>
          <UserRound />
          Account settings
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <Form method="post" action="/logout">
          <DropdownMenuItem
            nativeButton
            // Closing the menu unmounts the form mid-click, which cancels the
            // submit; the redirect that follows tears the menu down anyway.
            closeOnClick={false}
            render={
              <button type="submit" aria-label="Sign out" className="w-full" />
            }
          >
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </Form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppSidebar({
  user,
  websites,
}: {
  user: SidebarUser;
  websites: SidebarWebsite[];
}) {
  const { pathname } = useLocation();
  const selectedId = useSelectedWebsiteId();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Mirrors the account row in the footer: a size-8 tile, then two
                lines of text. Collapsing to icon mode leaves just the tile. */}
            <SidebarMenuButton
              size="lg"
              render={
                <a
                  href="https://github.com/itsrennyman/aurora"
                  target="_blank"
                  rel="noreferrer"
                  // The button supplies the content; naming the destination is
                  // still worth it, since the visible text says neither that
                  // this is a link nor that it leaves for GitHub.
                  aria-label="Aurora on GitHub"
                />
              }
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {/* The button sizes every nested svg to 4; the mark opts out. */}
                <Logo className="size-5! text-sidebar-primary-foreground" />
              </span>

              <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
                <span className="truncate text-sm font-semibold tracking-tight">
                  Aurora
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Cookie-free analytics
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem
                to="/"
                label="All websites"
                icon={LayoutGrid}
                isActive={pathname === "/"}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Websites</SidebarGroupLabel>

          <AddWebsiteSheet
            trigger={
              <SidebarGroupAction aria-label="Add website">
                <Plus />
              </SidebarGroupAction>
            }
          />

          <SidebarGroupContent>
            <SidebarMenu>
              {websites.length === 0 ? (
                <p className="px-2 py-1 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                  No websites yet
                </p>
              ) : (
                websites.map((website) => (
                  <WebsiteItem
                    key={website.id}
                    website={website}
                    isSelected={website.id === selectedId}
                    pathname={pathname}
                  />
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col">
            <UserMenu user={user} />
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
