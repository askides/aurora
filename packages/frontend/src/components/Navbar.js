import { Flex, IconButton, VStack } from "@chakra-ui/react";
import * as React from "react";
import { Link } from "react-router-dom";
import { Home2, Logout, User } from "tabler-icons-react";

const MENU_ITEMS = [
  { icon: Home2, label: "Home", to: "/" },
  { icon: User, label: "Account", to: "/account" },
  { icon: Logout, label: "Logout", to: "/logout" },
];

export function Navbar() {
  const items = MENU_ITEMS.map(({ icon: Icon, label, to }, index) => {
    return (
      <IconButton
        as={Link}
        to={to}
        aria-label={label}
        key={index}
        icon={<Icon />}
      />
    );
  });

  return (
    <Flex
      width={20}
      height="100vh"
      background="white"
      justifyContent="center"
      alignItems="center"
      position="fixed"
      top={0}
      left={0}
    >
      <VStack spacing={4}>{items}</VStack>
    </Flex>
  );
}
