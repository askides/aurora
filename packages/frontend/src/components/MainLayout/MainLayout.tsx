import { Flex, useColorModeValue, useMediaQuery } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import { Footer } from "../Footer";
import { Navbar } from "../Navbar";

const MainLayout = ({ isPublic = false }) => {
  const bg = useColorModeValue("#f8f9fa", "gray.800");
  const [isNotMobile] = useMediaQuery("(min-width: 768px)");

  return (
    <>
      {isNotMobile && <Navbar isPublic={isPublic} />}
      <Flex
        direction="column"
        maxWidth="8xl"
        padding={isNotMobile ? 10 : 5}
        minHeight="100vh"
        bg={bg}
        marginLeft={isNotMobile ? 20 : 0}
      >
        <Outlet />
        <Footer />
      </Flex>
    </>
  );
};

export { MainLayout };
