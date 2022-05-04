import { Flex, IconButton, useColorModeValue, VStack } from "@chakra-ui/react";
import { Home2, Logout, User } from "tabler-icons-react";
import { useAuth } from "../../lib/context/auth-context";
import { Logo } from "../Logo";
import { ToggleButton } from "../ToggleButton";
import { NavbarLink } from "./NavbarLink";

const Navbar = () => {
  const { signOut } = useAuth();
  const bg = useColorModeValue("white", "gray.700");

  return (
    <Flex
      as="nav"
      bg={bg}
      py={5}
      width={20}
      height="100vh"
      direction="column"
      justifyContent="space-between"
      alignItems="center"
      position="fixed"
      top={0}
      left={0}
      boxShadow="base"
    >
      <Logo height={45} />
      <VStack spacing={4}>
        <NavbarLink to="/" icon={<Home2 />} label="Home" />
        <NavbarLink to="/account" icon={<User />} label="Account" />
        <IconButton aria-label="Logout" icon={<Logout />} onClick={signOut} />
      </VStack>
      <ToggleButton />
    </Flex>
  );
};

export { Navbar };
