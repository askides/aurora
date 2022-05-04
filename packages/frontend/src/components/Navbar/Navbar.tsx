import { Flex, IconButton, VStack } from "@chakra-ui/react";
import { Home2, Logout, User } from "tabler-icons-react";
import { useAuth } from "../../lib/context/auth-context";
import { NavbarLink } from "./NavbarLink";

const Navbar = () => {
  const { signOut } = useAuth();

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
      boxShadow="base"
    >
      <VStack spacing={4}>
        <NavbarLink to="/" icon={<Home2 />} label="Home" />
        <NavbarLink to="/account" icon={<User />} label="Account" />
        <IconButton aria-label="Logout" icon={<Logout />} onClick={signOut} />
      </VStack>
    </Flex>
  );
};

export { Navbar };
