import { Flex } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import { Navbar } from "../Navbar";

const MainLayout = () => {
  return (
    <>
      <Navbar />
      <Flex
        maxWidth="8xl"
        padding={10}
        minHeight="100vh"
        backgroundColor="#f8f9fa"
        marginLeft={20}
      >
        <Outlet />
      </Flex>
    </>
  );
};

export { MainLayout };
