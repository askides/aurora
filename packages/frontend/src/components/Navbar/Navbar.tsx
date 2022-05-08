import { Flex, IconButton, useColorModeValue, VStack } from "@chakra-ui/react";
import { HiOutlineHome, HiOutlineLogout, HiOutlineUser } from "react-icons/hi";
import { useAuth } from "../../lib/context/auth-context";
import { Logo } from "../Logo";
import { ToggleButton } from "../ToggleButton";
import { NavbarLink } from "./NavbarLink";

const Navbar = ({ isPublic = false }) => {
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

      {!isPublic && (
        <VStack spacing={4}>
          <NavbarLink to="/" icon={<HiOutlineHome />} label="Home" />
          <NavbarLink to="/account" icon={<HiOutlineUser />} label="Account" />
          <IconButton
            aria-label="Logout"
            icon={<HiOutlineLogout />}
            onClick={signOut}
          />
        </VStack>
      )}

      <ToggleButton />
    </Flex>
  );
};

export { Navbar };
