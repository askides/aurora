import { Flex, IconButton, VStack } from "@chakra-ui/react";
import * as React from "react";
import { Link } from "react-router-dom";
import { Home2, Logout, User } from "tabler-icons-react";
import { useAuth } from "../../lib/context/auth-context";

const Navbar: React.FC = () => {
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
        <IconButton as={Link} to="/" aria-label="Home" icon={<Home2 />} />
        <IconButton
          as={Link}
          to="/account"
          aria-label="Account"
          icon={<User />}
        />
        <IconButton aria-label="Logout" icon={<Logout />} onClick={signOut} />
      </VStack>
    </Flex>
  );
};

export { Navbar };
