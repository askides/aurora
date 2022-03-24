import { AppShell } from "@mantine/core";
import { Outlet } from "react-router-dom";
import { NavbarMinimal } from "../components/NavbarMinimal";

export function Main() {
  return (
    <AppShell
      padding="md"
      navbar={<NavbarMinimal />}
      styles={(theme) => ({
        main: {
          backgroundColor:
            theme.colorScheme === "dark"
              ? theme.colors.dark[8]
              : theme.colors.gray[0],
          marginLeft: 80,
        },
      })}
    >
      <Outlet />
    </AppShell>
  );
}
