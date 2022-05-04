import { Flex, useColorModeValue } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import { Footer } from "../Footer";
import { Navbar } from "../Navbar";

const MainLayout = ({ isPublic = false }) => {
  const bg = useColorModeValue("#f8f9fa", "gray.800");

  return (
    <>
      <Navbar isPublic={isPublic} />
      <Flex
        direction="column"
        maxWidth="8xl"
        padding={10}
        minHeight="100vh"
        bg={bg}
        marginLeft={20}
      >
        <Outlet />
        <Footer />
      </Flex>
    </>
  );
};

export { MainLayout };
