import {
  Center,
  createStyles,
  Group,
  Navbar,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import React, { useState } from "react";
import {
  CalendarStats,
  DeviceDesktopAnalytics,
  Fingerprint,
  Gauge,
  Home2,
  Logout,
  Settings,
  SwitchHorizontal,
  User,
} from "tabler-icons-react";
// import { MantineLogoSmall } from '../../shared/MantineLogo';

const useStyles = createStyles((theme) => ({
  link: {
    width: 50,
    height: 50,
    borderRadius: theme.radius.md,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[0]
        : theme.colors.gray[7],

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[5]
          : theme.colors.gray[0],
    },
  },

  active: {
    "&, &:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.fn.rgba(theme.colors[theme.primaryColor][9], 0.25)
          : theme.colors[theme.primaryColor][0],
      color:
        theme.colors[theme.primaryColor][theme.colorScheme === "dark" ? 4 : 7],
    },
  },
}));

function NavbarLink({ icon: Icon, label, active, onClick }) {
  const { classes, cx } = useStyles();
  return (
    <Tooltip label={label} position="right" withArrow transitionDuration={0}>
      <UnstyledButton
        onClick={onClick}
        className={cx(classes.link, { [classes.active]: active })}
      >
        <Icon />
      </UnstyledButton>
    </Tooltip>
  );
}

const mockdata = [
  { icon: Home2, label: "Home" },
  { icon: Gauge, label: "Dashboard" },
  { icon: DeviceDesktopAnalytics, label: "Analytics" },
  { icon: CalendarStats, label: "Releases" },
  { icon: User, label: "Account" },
  { icon: Fingerprint, label: "Security" },
  { icon: Settings, label: "Settings" },
];

export function NavbarMinimal() {
  const [active, setActive] = useState(2);

  const links = mockdata.map((link, index) => (
    <NavbarLink
      {...link}
      key={link.label}
      active={index === active}
      onClick={() => setActive(index)}
    />
  ));

  return (
    <Navbar
      height="100vh"
      width={{ base: 80 }}
      p="md"
      fixed
      position={{ top: 0, left: 0 }}
    >
      <Center>{/* <MantineLogoSmall /> */}</Center>
      <Navbar.Section grow mt={50}>
        <Group direction="column" align="center" spacing={0}>
          {links}
        </Group>
      </Navbar.Section>
      <Navbar.Section>
        <Group direction="column" align="center" spacing={0}>
          <NavbarLink icon={SwitchHorizontal} label="Change account" />
          <NavbarLink icon={Logout} label="Logout" />
        </Group>
      </Navbar.Section>
    </Navbar>
  );
}
