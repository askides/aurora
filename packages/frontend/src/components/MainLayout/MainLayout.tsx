import { Flex } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import { Footer } from "../Footer";
import { Navbar } from "../Navbar";

const MainLayout = ({ isPublic = false }) => {
  return (
    <>
      {!isPublic && <Navbar />}
      <Flex
        direction="column"
        maxWidth="8xl"
        padding={10}
        minHeight="100vh"
        backgroundColor="#f8f9fa"
        marginLeft={isPublic ? 0 : 20}
      >
        <Outlet />
        <Footer />
      </Flex>
    </>
  );
};

export { MainLayout };
