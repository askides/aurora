import { Flex } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar";

export function Main({ children }) {
  return (
    <>
      <Navbar />
      <Flex
        padding={10}
        minHeight="100vh"
        backgroundColor="#f8f9fa"
        marginLeft={20}
      >
        <Outlet />
      </Flex>
    </>
  );
}
